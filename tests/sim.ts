/**
 * Balance simulator.
 *
 * 1. On-level runs: for each zone and level, 1,000 auto-battled runs with a
 *    character built for that level (stats, life stage, talents, gear).
 * 2. Campaign: fresh characters play from egg to the Storm Roc, buying gear,
 *    growing their dragon, and riding into boss fights. Reports fights per
 *    level and when each milestone happened.
 *
 * Usage: npm run sim [-- --runs 1000 --campaigns 100 --seed 1 --zone saltmarsh-shore]
 */
import { gameData as data } from '../src/core/data';
import { createRng } from '../src/core/rng';
import { autoOrders } from '../src/core/ai';
import {
  activeDragon, buyGear, buyItem, canEquip, canRide, chooseEgg, equip, growthStatus, hatchEgg, learnDragonTalent,
  playRound, rest, spendDragonPoint, spendRiderPoint, startFight, startGrowthQuest, startRun, warmEgg, zoneLock,
} from '../src/core/game';
import { newSave, type SaveData } from '../src/core/save';
import { dragonMaxHp, riderMaxHp, riderMaxMp } from '../src/core/characters';
import { canLearn, talentPointsLeft } from '../src/core/loadout';
import { xpToNext } from '../src/core/progression';
import type { DragonStat, ElementId, GearData, RiderStat, ZoneData } from '../src/core/types';

const args = process.argv.slice(2);
const arg = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const argStr = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 1);
const CAMPAIGNS = arg('campaigns', 100);
const ONLY_ZONE = argStr('zone');
const SKIP_CAMPAIGN = args.includes('--no-campaign');
const SKIP_LEVELS = args.includes('--campaign-only');

const RIDER_PLAN: RiderStat[] = ['strength', 'vigor', 'arcana'];
const DRAGON_PLAN: DragonStat[] = ['might', 'scale', 'spirit'];
/** The order the sim learns talents in. A sturdy fighter with some healing. */
const TALENT_PLAN = [
  'sharp-claws', 'sharp-claws', 'thick-hide', 'thick-hide', 'twin-claws', 'kindled-breath', 'kindled-breath', 'soothing-hum',
  'sharp-claws', 'keen-eye', 'keen-eye', 'pounce', 'ferocity', 'ferocity', 'ferocity', 'quick-charge', 'quick-charge',
  'rending-strike', 'thick-hide', 'keen-eye', 'frenzy', 'frenzy', 'frenzy', 'stalwart', 'taunting-roar', 'mending-aura',
  'mending-aura', 'shield-of-scales', 'shield-of-scales', 'deep-lungs', 'deep-lungs', 'deep-lungs',
];

function spendAll(save: SaveData): SaveData {
  let s = save;
  let i = 0;
  while (s.rider.statPoints > 0) s = spendRiderPoint(s, RIDER_PLAN[i++ % RIDER_PLAN.length]!);
  i = 0;
  while ((activeDragon(s)?.statPoints ?? 0) > 0) s = spendDragonPoint(s, DRAGON_PLAN[i++ % DRAGON_PLAN.length]!);
  for (const id of TALENT_PLAN) {
    const d = activeDragon(s)!;
    if (talentPointsLeft(data, d) <= 0) break;
    if (canLearn(data, d, id).ok) s = learnDragonTalent(data, s, id);
  }
  return s;
}

const MELEE = new Set(['ash-blade', 'bramble-saber', 'coral-cutlass', 'magma-maul', 'thunder-glaive']);

/** Best gear per slot the character can wear (melee weapons only, to keep the build simple). */
function bestGear(level: number, adult: boolean, owned?: string[]): GearData[] {
  const bySlot = new Map<string, GearData>();
  for (const g of Object.values(data.gear)) {
    if (g.slot === 'weapon' && !MELEE.has(g.id)) continue;
    if (['saddle', 'horn', 'charm'].includes(g.slot) && !adult) continue;
    if (g.level > level) continue;
    if (owned && !owned.includes(g.id)) continue;
    const cur = bySlot.get(g.slot);
    if (!cur || g.level > cur.level) bySlot.set(g.slot, g);
  }
  return [...bySlot.values()];
}

function freshCharacter(element: ElementId, seed: number): SaveData {
  let s = newSave(seed);
  s = chooseEgg(data, s, element);
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, 'Sim', { primary: '#888888', secondary: '#444444' }, seed);
}

function stageFor(level: number): string {
  let stage = 'hatchling';
  for (const st of data.dragons.stages) if (st.available !== false && level >= st.minLevel) stage = st.id;
  return stage;
}

/** A character at `level` with points spent by plan, the right life stage, on-level gear, and full HP. */
function onLevelCharacter(element: ElementId, level: number, seed: number): SaveData {
  let s = freshCharacter(element, seed);
  const pts = data.progression.statPointsPerLevel * (level - 1);
  const stage = stageFor(level);
  const growth = data.dragons.stages.filter((st) => st.available !== false && level >= st.minLevel).reduce((a, st) => a + st.growthStatPoints, 0);
  const allGear = bestGear(level, stage === 'adult' || stage === 'elder');
  s = { ...s, rider: { ...s.rider, level, statPoints: pts, gear: [...new Set([...s.rider.gear, ...allGear.map((g) => g.id)])] } };
  const d = activeDragon(s)!;
  s = { ...s, dragons: [{ ...d, level, stage, statPoints: pts + growth, bond: Math.max(d.bond, 30 * data.dragons.stages.findIndex((x) => x.id === stage)) }] };
  for (const g of allGear) if (canEquip(data, s, g.id).ok) s = equip(data, s, g.id);
  s = spendAll(s);
  const d2 = activeDragon(s)!;
  return {
    ...s,
    rider: { ...s.rider, hp: riderMaxHp(data, s.rider), mp: riderMaxMp(data, s.rider) },
    dragons: [{ ...d2, hp: dragonMaxHp(data, d2) }],
  };
}

interface RunStats { won: boolean; fights: number; fightsWon: number; rounds: number; bossFought: boolean; bossWon: boolean; xp: number; gold: number }

function playRun(save: SaveData, start: (s: SaveData) => SaveData): { save: SaveData; stats: RunStats } {
  let s = start(save);
  if (s.run && !s.run.battle) s = startFight(data, s, { ride: canRide(data, s) });
  const stats: RunStats = { won: false, fights: 0, fightsWon: 0, rounds: 0, bossFought: false, bossWon: false, xp: 0, gold: 0 };
  for (let guard = 0; guard < 600; guard++) {
    const battle = s.run?.battle;
    if (!battle) break;
    const r = playRound(data, s, autoOrders(data, battle));
    s = r.save;
    stats.rounds++;
    if (r.report) {
      stats.fights++;
      const boss = r.report.kind === 'boss';
      if (boss) stats.bossFought = true;
      if (r.report.outcome === 'won') {
        stats.fightsWon++;
        stats.xp += r.report.rewards?.xp ?? 0;
        stats.gold += r.report.rewards?.gold ?? 0;
        if (boss) stats.bossWon = true;
        if (r.report.runComplete) { stats.won = true; break; }
        s = startFight(data, s, { ride: canRide(data, s) });
      } else break;
    }
  }
  return { save: s, stats };
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '  -  ');
const pad = (v: string | number, w: number) => String(v).padStart(w);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const zones = data.zones.filter((z) => !ONLY_ZONE || z.id === ONLY_ZONE);

if (!SKIP_LEVELS) {
  for (const zone of zones) {
    console.log(`\n=== ${zone.name} (levels ${zone.minLevel}-${zone.maxLevel}), ${RUNS} runs per row ===`);
    for (const element of data.elements.starters) {
      console.log(`\n${data.elements.info[element].name} dragon`);
      console.log('Lvl  Stage      Run win  Fight win  Rounds/fight  Boss win  XP/fight  Gold/fight  Fights/level');
      let totalWins = 0;
      let totalRuns = 0;
      for (let level = zone.minLevel; level <= zone.maxLevel; level++) {
        const rng = createRng(SEED * 1000 + level);
        let wins = 0, fights = 0, fightsWon = 0, rounds = 0, bossFought = 0, bossWon = 0, xp = 0, gold = 0;
        for (let i = 0; i < RUNS; i++) {
          const base = onLevelCharacter(element, level, rng.int(1, 2 ** 31));
          if (zoneLock(data, base, zone)) continue;
          const { stats } = playRun(base, (s) => startRun(data, s, zone.id));
          wins += stats.won ? 1 : 0;
          fights += stats.fights;
          fightsWon += stats.fightsWon;
          rounds += stats.rounds;
          bossFought += stats.bossFought ? 1 : 0;
          bossWon += stats.bossWon ? 1 : 0;
          xp += stats.xp;
          gold += stats.gold;
        }
        if (fights === 0) {
          console.log(`${pad(level, 3)}  ${stageFor(level).padEnd(9)}  locked`);
          continue;
        }
        totalWins += wins;
        totalRuns += RUNS;
        const xpPerFight = fightsWon ? xp / fightsWon : 0;
        const fpl = xpPerFight ? xpToNext(data.progression, level) / xpPerFight : 0;
        console.log(
          `${pad(level, 3)}  ${stageFor(level).padEnd(9)}  ${pad(pct(wins, RUNS), 7)}  ${pad(pct(fightsWon, fights), 9)}  ${pad((rounds / fights).toFixed(1), 12)}  ${pad(pct(bossWon, bossFought), 8)}  ${pad(xpPerFight.toFixed(0), 8)}  ${pad((gold / Math.max(1, fightsWon)).toFixed(0), 10)}  ${pad(fpl.toFixed(1), 12)}`,
        );
      }
      console.log(`All on-level runs: ${pct(totalWins, totalRuns)} won`);
    }
  }
}

// ---------- Campaign: egg to Adult to the Storm Roc ----------

function shopAndEquip(s: SaveData): SaveData {
  const d = activeDragon(s)!;
  const adult = data.dragons.stages.findIndex((x) => x.id === d.stage) >= 2;
  // Keep a few potions in the bag.
  while ((s.rider.inventory['potion'] ?? 0) < 3 && s.rider.gold >= (data.shop.items['potion'] ?? 1e9)) s = buyItem(data, s, 'potion');
  for (const g of bestGear(Math.max(s.rider.level, d.level), adult)) {
    if (!s.rider.gear.includes(g.id) && data.shop.stock.includes(g.id) && s.rider.gold >= g.price) s = buyGear(data, s, g.id);
    if (s.rider.gear.includes(g.id) && canEquip(data, s, g.id).ok) s = equip(data, s, g.id);
  }
  return s;
}

/** The highest open zone, unless an open zone's boss is ready and not beaten yet. */
function pickZone(s: SaveData): ZoneData {
  let best = data.zones[0]!;
  for (const z of data.zones) if (!zoneLock(data, s, z) && s.rider.level >= z.minLevel) best = z;
  const bossReady = data.zones.find((z) => !zoneLock(data, s, z) && s.rider.level >= z.boss.unlockRiderLevel && !s.bossesDefeated.includes(z.id));
  return bossReady ?? best;
}

if (!SKIP_CAMPAIGN) {
  const finalBoss = data.zones[data.zones.length - 1]!;
  console.log(`\nCampaign: ${CAMPAIGNS} fresh characters per starter play from egg to the ${data.enemies[finalBoss.boss.enemy]!.name}`);
  for (const element of data.elements.starters) {
    const perLevel: number[][] = [];
    const juvenileAt: number[] = [];
    const adultAt: number[] = [];
    const bossAt: Record<string, number[]> = {};
    const finished: number[] = [];
    const goldAtEnd: number[] = [];
    let losses = 0, runsPlayed = 0;
    const rng = createRng(SEED * 7919 + element.length);
    for (let c = 0; c < CAMPAIGNS; c++) {
      let s = freshCharacter(element, rng.int(1, 2 ** 31));
      let fightsAtLevel = 0;
      let fights = 0;
      for (let runs = 0; runs < 3000; runs++) {
        s = shopAndEquip(spendAll(rest(data, s, `day-${runs}`)));
        const before = s.rider.level;
        const d = activeDragon(s)!;
        const growing = growthStatus(data, d).ready;
        const zone = pickZone(s);
        const r = playRun(s, growing ? (x) => startGrowthQuest(data, x) : (x) => startRun(data, x, zone.id));
        s = r.save;
        fights += r.stats.fights;
        fightsAtLevel += r.stats.fights;
        runsPlayed++;
        if (!r.stats.won) losses++;
        const grown = activeDragon(s)!;
        if (grown.stage === 'juvenile' && d.stage === 'hatchling') juvenileAt.push(fights);
        if (grown.stage === 'adult' && d.stage === 'juvenile') adultAt.push(fights);
        if (r.stats.bossWon && !growing) (bossAt[zone.id] ??= []).push(before);
        if (s.rider.level > before) {
          for (let l = before; l < s.rider.level; l++) (perLevel[l - 1] ??= []).push(fightsAtLevel / (s.rider.level - before));
          fightsAtLevel = 0;
        }
        if (s.bossesDefeated.includes(finalBoss.id)) { finished.push(fights); goldAtEnd.push(s.rider.gold); break; }
      }
    }
    // Only count each zone's first boss win per campaign.
    const firstBoss = (z: string) => (bossAt[z] ?? []);
    console.log(`\n${data.elements.info[element].name}: beat the ${data.enemies[finalBoss.boss.enemy]!.name} in ${finished.length}/${CAMPAIGNS} campaigns, avg ${avg(finished).toFixed(0)} fights (${(avg(finished) * 2 / 60).toFixed(1)} h at 2 min/fight)`);
    console.log(`  Juvenile after ${avg(juvenileAt).toFixed(0)} fights, Adult after ${avg(adultAt).toFixed(0)} fights. Runs won: ${pct(runsPlayed - losses, runsPlayed)}.`);
    console.log(`  First boss wins at rider level: ${data.zones.map((z) => `${z.name} ${firstBoss(z.id).length ? Math.min(...firstBoss(z.id)).toFixed(0) + '+' : '-'}`).join(', ')}`);
    console.log(`  Fights per level: ${perLevel.map((xs, i) => `${i + 1}:${avg(xs).toFixed(0)}`).filter(Boolean).join(' ')}`);
    console.log(`  Gold left at the end: ${avg(goldAtEnd).toFixed(0)}`);
  }
}
