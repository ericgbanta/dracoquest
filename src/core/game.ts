/**
 * Save-level game actions. Each takes a SaveData and returns a new one, so
 * the UI only has to call an action and write the result.
 */
import { createRng, type Rng } from './rng';
import { createBattle, resolveRound, type BattleEvent, type Orders, type Outcome } from './battle';
import { dragonMaxHp, hatchDragon, restoreDragon, restoreRider, riderMaxHp, riderMaxMp } from './characters';
import { careFor, checkWellKept, feed, groom, type FeedResult } from './care';
import { addBond, allocateDragon, allocateRider, giveDragonXp, giveRiderXp } from './progression';
import { getZone, planRun, rollRewards, type FightKind, type Rewards } from './run';
import type { SaveData } from './save';
import type { DragonState, DragonStat, ElementId, GameData, RiderStat } from './types';

export class GameError extends Error {}

/** Run `fn` with the save's RNG and store the advanced RNG state. */
function withRng<T>(save: SaveData, fn: (rng: Rng) => T): { save: SaveData; value: T } {
  const rng = createRng(save.seed);
  const value = fn(rng);
  return { save: { ...save, seed: rng.getState() }, value };
}

export function activeDragon(save: SaveData): DragonState | null {
  return save.dragons.find((d) => d.id === save.activeDragonId) ?? null;
}

function replaceDragon(save: SaveData, dragon: DragonState): SaveData {
  return { ...save, dragons: save.dragons.map((d) => (d.id === dragon.id ? dragon : d)) };
}

function requireDragon(save: SaveData): DragonState {
  const d = activeDragon(save);
  if (!d) throw new GameError('No dragon yet');
  return d;
}

// ---------- Egg and hatching ----------

export function chooseEgg(data: GameData, save: SaveData, element: ElementId): SaveData {
  if (!data.elements.starters.includes(element)) throw new GameError('Not a starter egg');
  if (save.dragons.length > 0) throw new GameError('You already have a dragon');
  return { ...save, egg: { element, warmth: 0 } };
}

export function warmEgg(data: GameData, save: SaveData): SaveData {
  if (!save.egg) throw new GameError('No egg to warm');
  return { ...save, egg: { ...save.egg, warmth: Math.min(data.dragons.hatchTaps, save.egg.warmth + 1) } };
}

export function eggReady(data: GameData, save: SaveData): boolean {
  return !!save.egg && save.egg.warmth >= data.dragons.hatchTaps;
}

export function hatchEgg(
  data: GameData, save: SaveData, name: string, colors: { primary: string; secondary: string }, now: number,
): SaveData {
  if (!save.egg || !eggReady(data, save)) throw new GameError('The egg is not ready');
  const egg = save.egg;
  const r = withRng(save, (rng) =>
    hatchDragon(data, rng, { id: `dragon-${now.toString(36)}`, name, element: egg.element, colors, now }),
  );
  const dragon = r.value;
  return { ...r.save, egg: null, dragons: [...r.save.dragons, dragon], activeDragonId: dragon.id };
}

// ---------- Care ----------

export function feedDragon(data: GameData, save: SaveData, foodId: string, today: string): { save: SaveData; result: FeedResult } {
  const dragon = requireDragon(save);
  const result = feed(data, dragon, careFor(save.care, today), foodId);
  return { save: grantWellKept(data, { ...replaceDragon(save, result.dragon), care: result.care }), result };
}

export function groomDragon(data: GameData, save: SaveData, taps: number, today: string): { save: SaveData; bondGained: number } {
  const dragon = requireDragon(save);
  const r = groom(data, dragon, careFor(save.care, today), taps);
  return { save: grantWellKept(data, { ...replaceDragon(save, r.dragon), care: r.care }), bondGained: r.bondGained };
}

export function rest(data: GameData, save: SaveData, today: string): SaveData {
  if (save.run) throw new GameError('You cannot rest during a run');
  const care = { ...careFor(save.care, today), rested: true };
  const dragons = save.dragons.map((d) => restoreDragon(data, d));
  return grantWellKept(data, { ...save, rider: restoreRider(data, save.rider), dragons, care });
}

function grantWellKept(data: GameData, save: SaveData): SaveData {
  const r = checkWellKept(data, save.care);
  return { ...save, care: r.care, wellKeptFights: save.wellKeptFights + r.fights };
}

// ---------- Stat points ----------

export function spendRiderPoint(save: SaveData, stat: RiderStat): SaveData {
  return { ...save, rider: allocateRider(save.rider, stat) };
}

export function spendDragonPoint(save: SaveData, stat: DragonStat): SaveData {
  return replaceDragon(save, allocateDragon(requireDragon(save), stat));
}

// ---------- Zone runs ----------

export function startRun(data: GameData, save: SaveData, zoneId: string): SaveData {
  if (save.run) throw new GameError('A run is already in progress');
  getZone(data, zoneId);
  const r = withRng(save, (rng) => planRun(data, zoneId, save.rider.level, rng));
  return startFight(data, { ...r.save, run: { zoneId, fights: r.value, index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } });
}

/** Create the battle for the run's current fight. */
export function startFight(data: GameData, save: SaveData): SaveData {
  const run = save.run;
  if (!run) throw new GameError('No run in progress');
  const plan = run.fights[run.index];
  if (!plan) throw new GameError('The run is over');
  const r = withRng(save, (rng) => rng.int(0, 0xffffffff));
  const battle = createBattle(data, {
    rider: save.rider,
    dragon: activeDragon(save),
    enemies: plan.enemies,
    seed: r.value,
    canFlee: plan.kind !== 'boss',
  });
  return { ...r.save, run: { ...run, battle } };
}

export interface FightReport {
  outcome: Exclude<Outcome, 'ongoing'>;
  kind: FightKind;
  rewards: Rewards | null;
  riderLevelsGained: number;
  dragonLevelsGained: number;
  bondGained: number;
  runComplete: boolean;
  wellKept: boolean;
}

export interface RoundReport { save: SaveData; events: BattleEvent[]; report: FightReport | null }

export function playRound(data: GameData, save: SaveData, orders: Orders): RoundReport {
  const run = save.run;
  if (!run?.battle) throw new GameError('No battle in progress');
  const { state: battle, events } = resolveRound(data, run.battle, orders);
  const next: SaveData = { ...save, run: { ...run, battle } };
  if (battle.outcome === 'ongoing') return { save: next, events, report: null };
  const finished = finishFight(data, next);
  return { save: finished.save, events, report: finished.report };
}

function finishFight(data: GameData, save: SaveData): { save: SaveData; report: FightReport } {
  const run = save.run!;
  const battle = run.battle!;
  const plan = run.fights[run.index]!;
  const outcome = battle.outcome as FightReport['outcome'];

  // Carry HP, MP, and items out of the battle.
  let rider = { ...save.rider, hp: battle.rider.hp, mp: battle.rider.mp, inventory: battle.inventory };
  let dragon = activeDragon(save);
  if (dragon) dragon = { ...dragon, hp: battle.dragon ? battle.dragon.hp : 0 };

  const bestiary = { ...save.bestiary };
  for (const f of battle.enemies) {
    const id = f.enemyId!;
    const entry = bestiary[id] ?? { fought: 0, defeated: 0 };
    bestiary[id] = { fought: entry.fought + 1, defeated: entry.defeated + (f.hp <= 0 ? 1 : 0) };
  }

  let next: SaveData = { ...save, bestiary };
  const report: FightReport = {
    outcome, kind: plan.kind, rewards: null, riderLevelsGained: 0, dragonLevelsGained: 0,
    bondGained: 0, runComplete: false, wellKept: false,
  };

  if (outcome === 'won') {
    const wellKept = next.wellKeptFights > 0;
    const xpBonus = wellKept ? data.care.wellKept.xpBonus : 0;
    const r = withRng(next, (rng) => rollRewards(data, run.zoneId, battle, rng, xpBonus));
    next = r.save;
    const rewards = r.value;
    report.rewards = rewards;
    report.wellKept = wellKept;

    const rl = giveRiderXp(data, rider, rewards.xp);
    rider = rl.state;
    report.riderLevelsGained = rl.levelsGained;
    rider.gold += rewards.gold;
    rider.inventory = { ...rider.inventory };
    for (const [item, n] of Object.entries(rewards.drops)) rider.inventory[item] = (rider.inventory[item] ?? 0) + n;
    if (rl.levelsGained > 0 && data.progression.levelUpRestoresHp) {
      rider = { ...rider, hp: riderMaxHp(data, rider), mp: riderMaxMp(data, rider) };
    }

    if (dragon) {
      const dl = giveDragonXp(data, dragon, rewards.xp);
      dragon = dl.state;
      report.dragonLevelsGained = dl.levelsGained;
      if (dl.levelsGained > 0 && data.progression.levelUpRestoresHp) dragon = { ...dragon, hp: dragonMaxHp(data, dragon) };
      if (battle.dragon && battle.dragon.hp > 0) {
        const before = dragon.bond;
        dragon = addBond(data, dragon, plan.kind === 'boss' ? data.progression.bond.perBossWin : data.progression.bond.perWin);
        report.bondGained = dragon.bond - before;
      }
    }

    const index = run.index + 1;
    const complete = index >= run.fights.length;
    report.runComplete = complete;
    const totals = {
      xp: run.totals.xp + rewards.xp,
      gold: run.totals.gold + rewards.gold,
      drops: { ...run.totals.drops },
    };
    for (const [item, n] of Object.entries(rewards.drops)) totals.drops[item] = (totals.drops[item] ?? 0) + n;

    next = {
      ...next,
      wellKeptFights: Math.max(0, next.wellKeptFights - 1),
      run: complete ? null : { ...run, index, battle: null, totals },
      stats: { ...next.stats, fightsWon: next.stats.fightsWon + 1, runsCompleted: next.stats.runsCompleted + (complete ? 1 : 0) },
      bossesDefeated: plan.kind === 'boss' && !next.bossesDefeated.includes(run.zoneId)
        ? [...next.bossesDefeated, run.zoneId] : next.bossesDefeated,
    };
  } else if (outcome === 'lost') {
    // A loss ends the run. Rewards from fights already won are kept.
    rider = { ...rider, hp: 1 };
    next = { ...next, run: null, stats: { ...next.stats, fightsLost: next.stats.fightsLost + 1 } };
  } else {
    next = { ...next, run: null };
  }

  next = { ...next, rider };
  if (dragon) next = replaceDragon(next, dragon);
  return { save: next, report };
}

/** Leave a run between fights. Everything earned so far is kept. */
export function leaveRun(save: SaveData): SaveData {
  if (save.run?.battle) throw new GameError('Finish or flee the current fight first');
  return { ...save, run: null };
}
