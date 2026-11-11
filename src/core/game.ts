/**
 * Save-level game actions. Each takes a SaveData and returns a new one, so
 * the UI only has to call an action and write the result.
 */
import { createRng, type Rng } from './rng';
import { createBattle, resolveRound, type BattleEvent, type Orders, type Outcome } from './battle';
import { dragonMaxHp, hatchDragon, restoreDragon, restoreRider, riderMaxHp, riderMaxMp } from './characters';
import { careFor, checkWellKept, feed, groom, type FeedResult } from './care';
import { addBond, allocateDragon, allocateRider, dragonLevelCap, giveDragonXp, giveRiderXp } from './progression';
import { dragonBonus, gearItem, learnTalent as learn, respecCost } from './loadout';
import { getZone, planQuest, planRun, rollRewards, type FightKind, type Rewards } from './run';
import type { SaveData } from './save';
import type { DragonSlot, DragonState, DragonStat, ElementId, GameData, GearSlot, RiderSlot, RiderStat, StageData, ZoneData } from './types';
import { DRAGON_SLOTS } from './types';

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
  if ((save.rider.inventory[foodId] ?? 0) <= 0) throw new GameError('You have none of that food. Buy some in town.');
  const result = feed(data, dragon, careFor(save.care, today), foodId);
  const inventory = { ...save.rider.inventory, [foodId]: (save.rider.inventory[foodId] ?? 0) - 1 };
  const next = { ...replaceDragon(save, result.dragon), care: result.care, rider: { ...save.rider, inventory } };
  return { save: grantWellKept(data, next), result };
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

function stageIndex(data: GameData, stage: string): number {
  return data.dragons.stages.findIndex((s) => s.id === stage);
}

/** Why a zone is locked, or null if it's open. */
export function zoneLock(data: GameData, save: SaveData, zone: ZoneData): string | null {
  if (!zone.gate) return null;
  const d = activeDragon(save);
  if (!d || stageIndex(data, d.stage) < stageIndex(data, zone.gate.stage)) return zone.gate.text;
  return null;
}

export function startRun(data: GameData, save: SaveData, zoneId: string): SaveData {
  if (save.run) throw new GameError('A run is already in progress');
  const zone = getZone(data, zoneId);
  const lock = zoneLock(data, save, zone);
  if (lock) throw new GameError(lock);
  const r = withRng(save, (rng) => planRun(data, zoneId, save.rider.level, rng));
  return startFight(data, { ...r.save, run: { zoneId, fights: r.value, index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } });
}

/** Ride mode is offered for boss fights once the dragon is an Adult and awake. */
export function canRide(data: GameData, save: SaveData): boolean {
  const run = save.run;
  const d = activeDragon(save);
  const plan = run?.fights[run.index];
  return !!d && d.hp > 0 && plan?.kind === 'boss' && stageIndex(data, d.stage) >= stageIndex(data, 'adult');
}

/** Create the battle for the run's current fight. */
export function startFight(data: GameData, save: SaveData, opts: { ride?: boolean } = {}): SaveData {
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
    ride: !!opts.ride && canRide(data, save),
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
  /** Set when a growth quest finished and the dragon grew. */
  grewTo?: string;
  egg?: ElementId;
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
  if (battle.ride) {
    // Split a mounted unit's HP back between rider and dragon.
    const frac = battle.rider.hp / battle.rider.maxHp;
    rider.hp = Math.round(battle.ride.riderMaxHp * frac);
    if (dragon) dragon = { ...dragon, hp: Math.round(battle.ride.dragonMaxHp * frac) };
  } else if (dragon) dragon = { ...dragon, hp: battle.dragon ? battle.dragon.hp : 0 };

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
    const r = withRng(next, (rng) => {
      const rewards = rollRewards(data, run.zoneId, battle, rng, xpBonus, dragon ? dragonBonus(data, dragon) : {});
      // Bosses drop an egg of their zone's element: always the first time, sometimes after.
      const zone = getZone(data, run.zoneId);
      if (plan.kind === 'boss' && zone.eggDrop) {
        const first = !save.bossesDefeated.includes(zone.id);
        if (first || rng.chance(zone.eggDrop.chance)) rewards.egg = zone.eggDrop.element;
      }
      return rewards;
    });
    next = r.save;
    const rewards = r.value;
    if (rewards.egg) {
      report.egg = rewards.egg;
      next = { ...next, eggs: [...next.eggs, rewards.egg] };
    }
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
      if ((battle.dragon && battle.dragon.hp > 0) || (battle.ride && battle.rider.hp > 0)) {
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
    if (complete && run.questId && dragon) {
      const grown = growDragon(data, dragon);
      dragon = grown;
      report.grewTo = grown.stage;
      next = { ...next, questsDone: next.questsDone.includes(run.questId) ? next.questsDone : [...next.questsDone, run.questId] };
    }
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

// ---------- Life stages ----------

export function nextStage(data: GameData, dragon: DragonState): StageData | null {
  const next = data.dragons.stages[stageIndex(data, dragon.stage) + 1];
  return next && next.available !== false ? next : null;
}

export interface GrowthStatus {
  next: StageData | null;
  levelOk: boolean;
  bondOk: boolean;
  /** Level and bond are met; the growth quest can start. */
  ready: boolean;
}

export function growthStatus(data: GameData, dragon: DragonState): GrowthStatus {
  const next = nextStage(data, dragon);
  if (!next) return { next: null, levelOk: false, bondOk: false, ready: false };
  const levelOk = dragon.level >= dragonLevelCap(data, dragon);
  const bondOk = dragon.bond >= next.bond;
  return { next, levelOk, bondOk, ready: levelOk && bondOk };
}

export function startGrowthQuest(data: GameData, save: SaveData): SaveData {
  if (save.run) throw new GameError('Finish your current run first');
  const dragon = requireDragon(save);
  const status = growthStatus(data, dragon);
  if (!status.ready || !status.next?.quest) throw new GameError('Your dragon is not ready to grow yet');
  const quest = data.quests[status.next.quest]!;
  // The battle starts from the interlude, after the quest's opening dialogue.
  const run = { zoneId: quest.zone, fights: planQuest(quest, dragon.level), index: 0, battle: null, questId: quest.id, totals: { xp: 0, gold: 0, drops: {} } };
  return { ...save, run };
}

/** Move the dragon to its next life stage. */
export function growDragon(data: GameData, dragon: DragonState): DragonState {
  const next = nextStage(data, dragon);
  if (!next) return dragon;
  const grown: DragonState = {
    ...dragon,
    stage: next.id,
    level: Math.max(dragon.level, next.minLevel),
    xp: dragon.level < next.minLevel ? 0 : dragon.xp,
    statPoints: dragon.statPoints + next.growthStatPoints,
    freeRespecsUsed: 0,
  };
  return { ...grown, hp: dragonMaxHp(data, grown) };
}

// ---------- Talents ----------

export function learnDragonTalent(data: GameData, save: SaveData, talentId: string): SaveData {
  return replaceDragon(save, learn(data, requireDragon(save), talentId));
}

export function respecTalents(data: GameData, save: SaveData): SaveData {
  const d = requireDragon(save);
  if (Object.keys(d.talents).length === 0) throw new GameError('No talents to reset');
  const cost = respecCost(data, d);
  if (save.rider.gold < cost) throw new GameError(`A respec costs ${cost} gold`);
  const dragon = { ...d, talents: {}, freeRespecsUsed: d.freeRespecsUsed + 1 };
  return replaceDragon({ ...save, rider: { ...save.rider, gold: save.rider.gold - cost } }, dragon);
}

// ---------- Gear and the shop ----------

const isDragonSlot = (slot: GearSlot): slot is DragonSlot => (DRAGON_SLOTS as readonly string[]).includes(slot);

export function buyGear(data: GameData, save: SaveData, gearId: string): SaveData {
  const g = gearItem(data, gearId);
  if (!g || !data.shop.stock.includes(gearId)) throw new GameError('The shop does not sell that');
  if (save.rider.gear.includes(gearId)) throw new GameError('You already own that');
  if (save.rider.gold < g.price) throw new GameError('Not enough gold');
  return { ...save, rider: { ...save.rider, gold: save.rider.gold - g.price, gear: [...save.rider.gear, gearId] } };
}

export function sellGear(data: GameData, save: SaveData, gearId: string): SaveData {
  const g = gearItem(data, gearId);
  if (!g || !save.rider.gear.includes(gearId)) throw new GameError('You do not own that');
  const equipped = Object.values(save.rider.equipment).includes(gearId) || save.dragons.some((d) => Object.values(d.equipment).includes(gearId));
  if (equipped) throw new GameError('Unequip it first');
  const price = Math.floor(g.price * data.shop.sellFraction);
  return { ...save, rider: { ...save.rider, gold: save.rider.gold + price, gear: save.rider.gear.filter((x) => x !== gearId) } };
}

export function itemPrice(data: GameData, id: string): number | null {
  if (data.shop.items[id] !== undefined) return data.shop.items[id]!;
  const food = data.foods.find((f) => f.id === id);
  return food ? food.price : null;
}

export function buyItem(data: GameData, save: SaveData, id: string, count = 1): SaveData {
  const price = itemPrice(data, id);
  if (price === null) throw new GameError('The shop does not sell that');
  const total = price * count;
  if (save.rider.gold < total) throw new GameError('Not enough gold');
  const inventory = { ...save.rider.inventory, [id]: (save.rider.inventory[id] ?? 0) + count };
  return { ...save, rider: { ...save.rider, gold: save.rider.gold - total, inventory } };
}

export type EquipCheck = { ok: true } | { ok: false; reason: string };

export function canEquip(data: GameData, save: SaveData, gearId: string): EquipCheck {
  const g = gearItem(data, gearId);
  if (!g || !save.rider.gear.includes(gearId)) return { ok: false, reason: 'You do not own that' };
  if (isDragonSlot(g.slot)) {
    const d = activeDragon(save);
    if (!d || stageIndex(data, d.stage) < stageIndex(data, 'adult')) return { ok: false, reason: 'Dragon gear needs an Adult dragon' };
    if (d.level < g.level) return { ok: false, reason: `Needs dragon level ${g.level}` };
  } else if (save.rider.level < g.level) {
    return { ok: false, reason: `Needs rider level ${g.level}` };
  }
  return { ok: true };
}

export function equip(data: GameData, save: SaveData, gearId: string): SaveData {
  if (save.run?.battle) throw new GameError('You cannot change gear mid-fight');
  const check = canEquip(data, save, gearId);
  if (!check.ok) throw new GameError(check.reason);
  const g = gearItem(data, gearId)!;
  if (isDragonSlot(g.slot)) {
    const d = requireDragon(save);
    return replaceDragon(save, clampDragonHp(data, { ...d, equipment: { ...d.equipment, [g.slot]: gearId } }));
  }
  const rider = { ...save.rider, equipment: { ...save.rider.equipment, [g.slot as RiderSlot]: gearId } };
  return { ...save, rider: clampRiderHp(data, rider) };
}

export function unequip(data: GameData, save: SaveData, slot: GearSlot): SaveData {
  if (save.run?.battle) throw new GameError('You cannot change gear mid-fight');
  if (slot === 'weapon') throw new GameError('You need a weapon');
  if (isDragonSlot(slot)) {
    const d = requireDragon(save);
    const equipment = { ...d.equipment };
    delete equipment[slot];
    return replaceDragon(save, clampDragonHp(data, { ...d, equipment }));
  }
  const equipment = { ...save.rider.equipment };
  delete equipment[slot];
  return { ...save, rider: clampRiderHp(data, { ...save.rider, equipment }) };
}

function clampRiderHp(data: GameData, r: SaveData['rider']): SaveData['rider'] {
  return { ...r, hp: Math.min(r.hp, riderMaxHp(data, r)), mp: Math.min(r.mp, riderMaxMp(data, r)) };
}

function clampDragonHp(data: GameData, d: DragonState): DragonState {
  return { ...d, hp: Math.min(d.hp, dragonMaxHp(data, d)) };
}
