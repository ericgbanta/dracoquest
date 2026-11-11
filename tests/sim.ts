/**
 * Balance simulator. For each zone and each on-level rider level, plays
 * 1,000 auto-battled zone runs and reports win rates. Then plays fresh
 * characters through the zone to count fights per level.
 *
 * Usage: npm run sim [-- --runs 1000 --seed 1]
 */
import { gameData as data } from '../src/core/data';
import { createRng } from '../src/core/rng';
import { autoOrders } from '../src/core/ai';
import { activeDragon, chooseEgg, hatchEgg, playRound, rest, startFight, startRun, spendDragonPoint, spendRiderPoint, warmEgg } from '../src/core/game';
import { newSave, type SaveData } from '../src/core/save';
import { dragonMaxHp, riderMaxHp, riderMaxMp } from '../src/core/characters';
import { xpToNext } from '../src/core/progression';
import type { DragonStat, ElementId, RiderStat } from '../src/core/types';

const args = process.argv.slice(2);
const arg = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const RUNS = arg('runs', 1000);
const SEED = arg('seed', 1);
const CAMPAIGNS = arg('campaigns', 200);

const RIDER_PLAN: RiderStat[] = ['strength', 'vigor', 'arcana'];
const DRAGON_PLAN: DragonStat[] = ['might', 'scale', 'spirit'];

function spendAll(save: SaveData): SaveData {
  let s = save;
  let i = 0;
  while (s.rider.statPoints > 0) s = spendRiderPoint(s, RIDER_PLAN[i++ % RIDER_PLAN.length]!);
  i = 0;
  while ((activeDragon(s)?.statPoints ?? 0) > 0) s = spendDragonPoint(s, DRAGON_PLAN[i++ % DRAGON_PLAN.length]!);
  return s;
}

function freshCharacter(element: ElementId, seed: number): SaveData {
  let s = newSave(seed);
  s = chooseEgg(data, s, element);
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, 'Sim', { primary: '#888888', secondary: '#444444' }, seed);
}

/** A character at `level` with points spent by the sim's plan and full HP. */
function onLevelCharacter(element: ElementId, level: number, seed: number): SaveData {
  let s = freshCharacter(element, seed);
  const pts = data.progression.statPointsPerLevel * (level - 1);
  s = { ...s, rider: { ...s.rider, level, statPoints: pts } };
  const d = activeDragon(s)!;
  s = { ...s, dragons: [{ ...d, level, statPoints: pts }] };
  s = spendAll(s);
  const d2 = activeDragon(s)!;
  return {
    ...s,
    rider: { ...s.rider, hp: riderMaxHp(data, s.rider), mp: riderMaxMp(data, s.rider) },
    dragons: [{ ...d2, hp: dragonMaxHp(data, d2) }],
  };
}

interface RunStats { won: boolean; fights: number; fightsWon: number; rounds: number; bossFought: boolean; bossWon: boolean; xp: number }

function playRun(save: SaveData, zoneId: string): { save: SaveData; stats: RunStats } {
  let s = startRun(data, save, zoneId);
  const stats: RunStats = { won: false, fights: 0, fightsWon: 0, rounds: 0, bossFought: false, bossWon: false, xp: 0 };
  for (let guard = 0; guard < 500; guard++) {
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
        if (boss) stats.bossWon = true;
        if (r.report.runComplete) { stats.won = true; break; }
        s = startFight(data, s);
      } else break;
    }
  }
  return { save: s, stats };
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '  -  ');
const pad = (v: string | number, w: number) => String(v).padStart(w);

for (const zone of data.zones) {
  console.log(`\n=== ${zone.name} (levels ${zone.minLevel}-${zone.maxLevel}), ${RUNS} runs per row ===`);
  for (const element of data.elements.starters) {
    console.log(`\n${data.elements.info[element].name} dragon`);
    console.log('Lvl  Run win  Fight win  Rounds/fight  Boss win  XP/fight  Fights/level');
    let totalWins = 0;
    let totalRuns = 0;
    for (let level = zone.minLevel; level <= zone.maxLevel; level++) {
      const rng = createRng(SEED * 1000 + level);
      let wins = 0, fights = 0, fightsWon = 0, rounds = 0, bossFought = 0, bossWon = 0, xp = 0;
      for (let i = 0; i < RUNS; i++) {
        const base = onLevelCharacter(element, level, rng.int(1, 2 ** 31));
        const { stats } = playRun(base, zone.id);
        wins += stats.won ? 1 : 0;
        fights += stats.fights;
        fightsWon += stats.fightsWon;
        rounds += stats.rounds;
        bossFought += stats.bossFought ? 1 : 0;
        bossWon += stats.bossWon ? 1 : 0;
        xp += stats.xp;
      }
      totalWins += wins;
      totalRuns += RUNS;
      const xpPerFight = fightsWon ? xp / fightsWon : 0;
      const fpl = xpPerFight ? xpToNext(data.progression, level) / xpPerFight : 0;
      console.log(
        `${pad(level, 3)}  ${pad(pct(wins, RUNS), 7)}  ${pad(pct(fightsWon, fights), 9)}  ${pad((rounds / fights).toFixed(1), 12)}  ${pad(pct(bossWon, bossFought), 8)}  ${pad(xpPerFight.toFixed(0), 8)}  ${pad(fpl.toFixed(1), 12)}`,
      );
    }
    console.log(`All on-level runs: ${pct(totalWins, totalRuns)} won`);
  }

  // Campaign: fresh characters play runs until they out-level the zone.
  console.log(`\nCampaign: ${CAMPAIGNS} fresh characters per starter play ${zone.name} from level 1, resting between runs`);
  console.log('Starter   Fights per level (1→2, 2→3, ...)                      Boss beaten at level');
  for (const element of data.elements.starters) {
    const perLevel: number[][] = [];
    const bossLevels: number[] = [];
    const rng = createRng(SEED * 7919);
    for (let c = 0; c < CAMPAIGNS; c++) {
      let s = freshCharacter(element, rng.int(1, 2 ** 31));
      let fightsAtLevel = 0;
      let bossAt = 0;
      for (let runs = 0; runs < 400 && s.rider.level <= zone.maxLevel; runs++) {
        const before = s.rider.level;
        const r = playRun(s, zone.id);
        s = r.save;
        fightsAtLevel += r.stats.fights;
        if (r.stats.bossWon && !bossAt) bossAt = before;
        if (s.rider.level > before) {
          (perLevel[before - 1] ??= []).push(fightsAtLevel);
          fightsAtLevel = 0;
        }
        s = spendAll(rest(data, s, `day-${runs}`));
      }
      if (bossAt) bossLevels.push(bossAt);
    }
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const row = perLevel.slice(0, zone.maxLevel).map((xs) => avg(xs).toFixed(1)).join(', ');
    console.log(`${data.elements.info[element].name.padEnd(9)} ${row.padEnd(52)}  ${bossLevels.length ? avg(bossLevels).toFixed(1) : 'never'} (${bossLevels.length}/${CAMPAIGNS})`);
  }
}
