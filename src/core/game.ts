/**
 * Save-level game actions. Each takes a SaveData and returns a new one, so
 * the UI only has to call an action and write the result.
 */
import { createRng, type Rng } from './rng';
import { createBattle, resolveRound, type BattleEvent, type Orders, type Outcome } from './battle';
import { dragonMaxHp, hatchDragon, restoreDragon, restoreRider, riderMaxHp, riderMaxMp } from './characters';
import { careFor, checkWellKept, feed, groom, type FeedResult } from './care';
import {
  addTemper, availableTrips, buildingLevel, collectPantry, hatcherySlotsFree, incubate, nestSlots, previousDay, rollTripLoot,
  tickPantry, trainingHours, trainingXp, tripById, upgradeCost, type TripLoot,
} from './roost';
import { addBond, allocateDragon, allocateRider, dragonLevelCap, giveDragonXp, giveRiderXp } from './progression';
import { bonusOf, dragonBonus, gearItem, learnTalent as learn, respecCost, riderBonus } from './loadout';
import { getZone, planQuest, planRun, rollGear, rollRewards, type FightKind, type Rewards } from './run';
import type { SaveData } from './save';
import type { StoryReward } from './types';
import type { BuildingId, DragonSlot, DragonState, DragonStat, EggSpec, ElementId, GameData, GearSlot, RiderSlot, RiderStat, StageData, ZoneData } from './types';
import { DRAGON_SLOTS } from './types';
import { activeEvent, eventKey, eventOnlyIds } from './events';
import { breedEgg, newEgg, plainEgg, releaseValue, rollVariant } from './eggs';
import { learnSpells, setLoadout, SpellError } from './spells';
import { addMaterials, craftGear, ForgeError, upgradeGear } from './forge';
import {
  bountiesForDay, bountyBoard, bountyDone, bountyKey, countBounties, grantReward, planStory, rewardRider, storyById, storyStatus,
} from './adventures';

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

/** The second battle partner, if one is set. */
export function secondDragon(save: SaveData): DragonState | null {
  return save.secondDragonId ? save.dragons.find((d) => d.id === save.secondDragonId) ?? null : null;
}

export function isPartner(save: SaveData, id: string): boolean {
  return id === save.activeDragonId || id === save.secondDragonId;
}

/** A dragon by id, or the lead partner when no id is given. */
function requireDragon(save: SaveData, id?: string): DragonState {
  const d = id ? save.dragons.find((x) => x.id === id) : activeDragon(save);
  if (!d) throw new GameError('No dragon yet');
  return d;
}

// ---------- Egg and hatching ----------

export function chooseEgg(data: GameData, save: SaveData, element: ElementId): SaveData {
  if (!data.elements.starters.includes(element)) throw new GameError('Not a starter egg');
  if (save.dragons.length > 0) throw new GameError('You already have a dragon');
  return { ...save, egg: { ...plainEgg(element), warmth: 0 } };
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
    hatchDragon(data, rng, {
      id: `dragon-${now.toString(36)}`, name, element: egg.element, element2: egg.element2, breed: egg.breed, variant: egg.variant, colors, now,
    }),
  );
  const dragon = r.value;
  if (save.dragons.length >= nestSlots(data, save.roost)) throw new GameError('The Nest is full. Upgrade it for more room.');
  // A new dragon joins the Nest. It only becomes the lead if it's the first.
  return { ...r.save, egg: null, dragons: [...r.save.dragons, dragon], activeDragonId: save.activeDragonId ?? dragon.id };
}

// ---------- Care ----------

export function feedDragon(data: GameData, save: SaveData, foodId: string, today: string, dragonId?: string): { save: SaveData; result: FeedResult } {
  const dragon = requireDragon(save, dragonId);
  if ((save.rider.inventory[foodId] ?? 0) <= 0) throw new GameError('You have none of that food. Buy some in town.');
  const result = feed(data, dragon, foodId, today);
  result.dragon = addTemper(data, result.dragon, 'care');
  const inventory = { ...save.rider.inventory, [foodId]: (save.rider.inventory[foodId] ?? 0) - 1 };
  const next = { ...replaceDragon(save, result.dragon), rider: { ...save.rider, inventory } };
  return { save: grantWellKept(data, next, today), result };
}

export function groomDragon(data: GameData, save: SaveData, taps: number, today: string, dragonId?: string): { save: SaveData; bondGained: number } {
  const dragon = requireDragon(save, dragonId);
  const r = groom(data, dragon, taps, today);
  return { save: grantWellKept(data, replaceDragon(save, addTemper(data, r.dragon, 'groom')), today), bondGained: r.bondGained };
}

export function rest(data: GameData, save: SaveData, today: string): SaveData {
  if (save.run) throw new GameError('You cannot rest during a run');
  const care = { ...careFor(save.care, today), rested: true };
  const dragons = save.dragons.map((d) => restoreDragon(data, d));
  return grantWellKept(data, { ...save, rider: restoreRider(data, save.rider), dragons, care }, today);
}

/** Grant Well kept once a day when all care is done, plus embers for keeping a daily streak. */
function grantWellKept(data: GameData, save: SaveData, today: string): SaveData {
  const r = checkWellKept(data, careFor(save.care, today), save.dragons, today);
  if (r.fights === 0) return { ...save, care: careFor(save.care, today) };
  const e = data.roost.embers;
  const streak = save.careStreak.lastDay === previousDay(today) ? save.careStreak.count + 1 : 1;
  const bonus = streak % e.streakBonusEvery === 0 ? e.streakBonus : 0;
  return {
    ...save,
    care: r.care,
    wellKeptFights: save.wellKeptFights + r.fights,
    embers: save.embers + e.wellKeptDay + bonus,
    careStreak: { count: streak, lastDay: today },
  };
}

// ---------- Stat points ----------

export function spendRiderPoint(save: SaveData, stat: RiderStat): SaveData {
  return { ...save, rider: allocateRider(save.rider, stat) };
}

// ---------- Forge ----------

function forgeAction<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ForgeError) throw new GameError(e.message);
    throw e;
  }
}

/** Upgrade a rider gear piece by one plus at the Forge. */
export function forgeUpgrade(data: GameData, save: SaveData, gearId: string): SaveData {
  if (save.run) throw new GameError('Use the Forge at the Roost, not mid-run');
  const r = forgeAction(() => upgradeGear(data, save.rider, save.embers, save.roost, gearId));
  return { ...save, rider: r.rider, embers: save.embers - r.embersSpent };
}

/** Craft a Forge-only piece. */
export function forgeCraft(data: GameData, save: SaveData, gearId: string): SaveData {
  if (save.run) throw new GameError('Use the Forge at the Roost, not mid-run');
  const r = forgeAction(() => craftGear(data, save.rider, save.embers, save.roost, gearId));
  return { ...save, rider: r.rider, embers: save.embers - r.embersSpent };
}

/** Set the rider's spell loadout. */
export function setSpells(data: GameData, save: SaveData, ids: string[]): SaveData {
  try {
    return { ...save, rider: setLoadout(data, save.rider, ids) };
  } catch (e) {
    if (e instanceof SpellError) throw new GameError(e.message);
    throw e;
  }
}

export function spendDragonPoint(save: SaveData, stat: DragonStat, dragonId?: string): SaveData {
  return replaceDragon(save, allocateDragon(requireDragon(save, dragonId), stat));
}

// ---------- Zone runs ----------

function stageIndex(data: GameData, stage: string): number {
  return data.dragons.stages.findIndex((s) => s.id === stage);
}

/** Why a zone is locked, or null if it's open. */
export function zoneLock(data: GameData, save: SaveData, zone: ZoneData): string | null {
  if (zone.unlock) {
    const after = data.zones.find((z) => z.id === zone.unlock!.afterBoss);
    const boss = after ? data.enemies[after.boss.enemy]?.name : undefined;
    const needLevel = save.rider.level < zone.unlock.level;
    const needBoss = !save.bossesDefeated.includes(zone.unlock.afterBoss);
    if (needLevel && needBoss) return `Opens at rider level ${zone.unlock.level}, after you beat the ${boss}`;
    if (needLevel) return `Opens at rider level ${zone.unlock.level}`;
    if (needBoss) return `Opens after you beat the ${boss}`;
  }
  if (!zone.gate) return null;
  const d = activeDragon(save);
  if (!d || stageIndex(data, d.stage) < stageIndex(data, zone.gate.stage)) return zone.gate.text;
  return null;
}

/** Start a hunt. `today` ("YYYY-MM-DD") rolls the bounty board over to a new day. */
export function startRun(data: GameData, save: SaveData, zoneId: string, today?: string): SaveData {
  if (save.run) throw new GameError('A run is already in progress');
  const zone = getZone(data, zoneId);
  const lock = zoneLock(data, save, zone);
  if (lock) throw new GameError(lock);
  const r = withRng(save, (rng) => planRun(data, zoneId, save.rider.level, rng));
  const bounties = today ? bountiesForDay(save.bounties, today) : save.bounties;
  return startFight(data, { ...r.save, bounties, run: { zoneId, fights: r.value, index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } });
}

/** Start a story quest. Like growth quests, the first fight starts from the interlude, after its dialogue. */
export function startStory(data: GameData, save: SaveData, storyId: string, today?: string): SaveData {
  if (save.run) throw new GameError('Finish your current run first');
  const q = storyById(data, storyId);
  if (!q) throw new GameError('There is no such quest');
  const lock = zoneLock(data, save, getZone(data, q.zone));
  if (lock) throw new GameError(lock);
  const status = storyStatus(data, save, q);
  if (status.state === 'done') throw new GameError('You already finished that quest');
  if (status.state === 'locked') throw new GameError(status.reason);
  const bounties = today ? bountiesForDay(save.bounties, today) : save.bounties;
  return { ...save, bounties, run: { zoneId: q.zone, fights: planStory(q), index: 0, battle: null, storyId: q.id, totals: { xp: 0, gold: 0, drops: {} } } };
}

/** Pick an option at a finished story quest's choice. */
export function chooseStory(data: GameData, save: SaveData, storyId: string, optionId: string): SaveData {
  const q = storyById(data, storyId);
  const option = q?.choice?.options.find((o) => o.id === optionId);
  if (!q || !option) throw new GameError('There is no such choice');
  const status = storyStatus(data, save, q);
  if (status.state !== 'done') throw new GameError('Finish the quest first');
  if (!status.choicePending) throw new GameError('You already chose');
  let next = grantReward(save, option.reward);
  const lead = activeDragon(next);
  if (lead) {
    const temper = { ...lead.temper, [option.temper]: lead.temper[option.temper] + data.progression.storyChoiceTemper };
    next = replaceDragon(next, { ...lead, temper });
  }
  return { ...next, storyChoices: { ...next.storyChoices, [storyId]: optionId } };
}

/** Claim a finished bounty from today's board. */
export function claimBounty(data: GameData, save: SaveData, zoneId: string, bountyId: string, today: string): SaveData {
  const state = bountiesForDay(save.bounties, today);
  const b = bountyBoard(data, zoneId, today).find((x) => x.id === bountyId);
  if (!b) throw new GameError('That bounty is not on today\'s board');
  const key = bountyKey(zoneId, bountyId);
  if (state.claimed.includes(key)) throw new GameError('Already claimed');
  if (!bountyDone(state, zoneId, b)) throw new GameError('Not finished yet');
  return { ...grantReward(save, b.reward), bounties: { ...state, claimed: [...state.claimed, key] } };
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
    second: secondDragon(save),
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
  egg?: EggSpec;
  embers?: number;
  /** Set when this fight finished a story quest. */
  story?: { id: string; name: string; reward: StoryReward };
  /** Spells the rider learned from this fight's level-ups, and whether each went into the loadout. */
  spellsLearned?: { id: string; name: string; equipped: boolean }[];
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
  let second = secondDragon(save);
  if (second && battle.second) second = { ...second, hp: battle.second.fighter.hp };
  if (dragon && battle.skillUses > 0) dragon = addTemper(data, dragon, 'skill', battle.skillUses);

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
      // Gear: trophies from bosses and mini-boss, zone drops from regular fights. Quests drop none.
      const foe = plan.enemies[0]?.enemyId;
      const firstKill = !!foe && (save.bestiary[foe]?.defeated ?? 0) === 0;
      const dropPct = bonusOf(riderBonus(data, save.rider), 'dropPct') + (dragon ? bonusOf(dragonBonus(data, dragon), 'dropPct') : 0);
      const gear = rollGear(getZone(data, run.zoneId), plan.kind, new Set(save.rider.gear), firstKill, rng, dropPct);
      if (gear.length) rewards.gear = gear;
      // Bosses drop an egg of their zone's element: always the first time, sometimes after.
      const zone = getZone(data, run.zoneId);
      if (plan.kind === 'boss' && zone.eggDrop) {
        const first = !save.bossesDefeated.includes(zone.id);
        if (first || rng.chance(zone.eggDrop.chance)) rewards.egg = newEgg(data, rng, zone.eggDrop.elements ? rng.pick(zone.eggDrop.elements) : zone.eggDrop.element, zone.eggDrop.breed);
      }
      return rewards;
    });
    next = r.save;
    const rewards = r.value;
    // The last fight of a story quest adds the quest's reward XP.
    const story = run.storyId && run.index + 1 >= run.fights.length ? storyById(data, run.storyId) : undefined;
    if (story?.reward.xp) rewards.xp += story.reward.xp;
    if (rewards.egg) {
      report.egg = rewards.egg;
      next = { ...next, eggs: [...next.eggs, rewards.egg] };
    }
    report.rewards = rewards;
    report.wellKept = wellKept;

    const levelBefore = rider.level;
    const rl = giveRiderXp(data, rider, rewards.xp);
    rider = rl.state;
    report.riderLevelsGained = rl.levelsGained;
    if (rl.levelsGained > 0) {
      const learnt = learnSpells(data, rider, levelBefore);
      rider = learnt.rider;
      if (learnt.learned.length) {
        report.spellsLearned = learnt.learned.map((sp) => ({ id: sp.id, name: sp.name, equipped: rider.spells.includes(sp.id) }));
      }
    }
    rider.gold += rewards.gold;
    rider.inventory = { ...rider.inventory };
    for (const [item, n] of Object.entries(rewards.drops)) rider.inventory[item] = (rider.inventory[item] ?? 0) + n;
    if (rewards.gear) rider.gear = [...rider.gear, ...rewards.gear.filter((id) => !rider.gear.includes(id))];
    const mats = plan.kind === 'boss' ? data.forge.bossMaterials : plan.kind === 'mini' ? data.forge.miniBossMaterials : null;
    if (mats && Object.keys(mats).length) {
      rider = addMaterials(rider, mats);
      rewards.materials = mats;
    }
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
      dragon = addTemper(data, dragon, plan.kind === 'boss' ? 'bossWon' : 'fightWon');
    }
    // The second partner shares the XP too.
    if (second && battle.second) {
      second = giveDragonXp(data, second, rewards.xp).state;
      if (battle.second.fighter.hp > 0) {
        second = addBond(data, second, plan.kind === 'boss' ? data.progression.bond.perBossWin : data.progression.bond.perWin);
      }
      second = addTemper(data, second, plan.kind === 'boss' ? 'bossWon' : 'fightWon');
    }
    if (plan.kind === 'boss') {
      const first = !save.bossesDefeated.includes(run.zoneId);
      const embers = first ? data.roost.embers.bossFirstKill : data.roost.embers.bossRepeat;
      report.embers = embers;
      next = { ...next, embers: next.embers + embers };
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
    next = { ...next, bounties: countBounties(data, next.bounties, run.zoneId, battle, complete && !run.storyId && !run.questId) };
    if (complete && story) {
      rider = rewardRider(rider, story.reward);
      next = {
        ...next,
        embers: next.embers + (story.reward.embers ?? 0),
        questsDone: next.questsDone.includes(story.id) ? next.questsDone : [...next.questsDone, story.id],
      };
      report.story = { id: story.id, name: story.name, reward: story.reward };
    }
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
  if (second) next = replaceDragon(next, second);
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

export function learnDragonTalent(data: GameData, save: SaveData, talentId: string, dragonId?: string): SaveData {
  return replaceDragon(save, learn(data, requireDragon(save, dragonId), talentId));
}

export function respecTalents(data: GameData, save: SaveData, dragonId?: string): SaveData {
  const d = requireDragon(save, dragonId);
  if (Object.keys(d.talents).length === 0) throw new GameError('No talents to reset');
  const cost = respecCost(data, d);
  if (save.rider.gold < cost) throw new GameError(`A respec costs ${cost} gold`);
  const dragon = { ...d, talents: {}, freeRespecsUsed: d.freeRespecsUsed + 1 };
  return replaceDragon({ ...save, rider: { ...save.rider, gold: save.rider.gold - cost } }, dragon);
}

// ---------- Gear and the shop ----------

const isDragonSlot = (slot: GearSlot): slot is DragonSlot => (DRAGON_SLOTS as readonly string[]).includes(slot);

/** What the town sells today: regular stock plus any running event's items. */
export function shopGear(data: GameData, today: string): string[] {
  const ev = activeEvent(data, today);
  return [...data.shop.stock, ...(ev?.shop.filter((id) => data.gear[id]) ?? [])];
}

export function buyGear(data: GameData, save: SaveData, gearId: string, today = ''): SaveData {
  const g = gearItem(data, gearId);
  if (!g || !shopGear(data, today).includes(gearId)) throw new GameError('The shop does not sell that');
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
  const upgrades = { ...save.rider.upgrades };
  delete upgrades[gearId];
  return { ...save, rider: { ...save.rider, gold: save.rider.gold + price, gear: save.rider.gear.filter((x) => x !== gearId), upgrades } };
}

/** Price of an item or food the town sells today, or null if it doesn't. */
export function itemPrice(data: GameData, id: string, today = ''): number | null {
  if (data.shop.items[id] !== undefined) return data.shop.items[id]!;
  if (eventOnlyIds(data, today).has(id)) return null;
  const food = data.foods.find((f) => f.id === id);
  if (food?.event && activeEvent(data, today)?.id !== food.event) return null;
  return food ? food.price : null;
}

export function buyItem(data: GameData, save: SaveData, id: string, count = 1, today = ''): SaveData {
  const price = itemPrice(data, id, today);
  if (price === null) throw new GameError('The shop does not sell that');
  const total = price * count;
  if (save.rider.gold < total) throw new GameError('Not enough gold');
  const inventory = { ...save.rider.inventory, [id]: (save.rider.inventory[id] ?? 0) + count };
  return { ...save, rider: { ...save.rider, gold: save.rider.gold - total, inventory } };
}

/** Eggs the town sells and their prices in gold. */
export function shopEggs(data: GameData): { element: ElementId; price: number }[] {
  return Object.entries(data.shop.eggs ?? {}).map(([element, price]) => ({ element: element as ElementId, price: price! }));
}

/** Buy a dragon egg in town. It goes to the Bag, to be incubated in the Hatchery like a boss's egg. */
export function buyEgg(data: GameData, save: SaveData, element: ElementId): SaveData {
  const price = data.shop.eggs?.[element];
  if (price === undefined) throw new GameError('The shop does not sell that egg');
  if (save.rider.gold < price) throw new GameError('Not enough gold');
  const r = withRng(save, (rng) => newEgg(data, rng, element));
  return { ...r.save, rider: { ...save.rider, gold: save.rider.gold - price }, eggs: [...save.eggs, r.value] };
}

/** Return an unwanted egg to the wild. The wild dragons leave embers in thanks; rarer eggs bring more. */
export function releaseEgg(data: GameData, save: SaveData, index: number): { save: SaveData; embers: number } {
  const egg = save.eggs[index];
  if (!egg) throw new GameError('No such egg');
  const embers = releaseValue(data, egg);
  return { save: { ...save, embers: save.embers + embers, eggs: save.eggs.filter((_, i) => i !== index) }, embers };
}

export type EquipCheck = { ok: true } | { ok: false; reason: string };

/** Which dragon wears a piece of dragon gear, if any. */
export function gearWearer(save: SaveData, gearId: string): DragonState | null {
  return save.dragons.find((d) => Object.values(d.equipment).includes(gearId)) ?? null;
}

export function canEquip(data: GameData, save: SaveData, gearId: string, dragonId?: string): EquipCheck {
  const g = gearItem(data, gearId);
  if (!g || !save.rider.gear.includes(gearId)) return { ok: false, reason: 'You do not own that' };
  if (isDragonSlot(g.slot)) {
    const d = dragonId ? save.dragons.find((x) => x.id === dragonId) : activeDragon(save);
    const wearer = gearWearer(save, gearId);
    if (wearer && wearer.id !== d?.id) return { ok: false, reason: `${wearer.name} is wearing it` };
    if (!d || stageIndex(data, d.stage) < stageIndex(data, 'adult')) return { ok: false, reason: 'Dragon gear needs an Adult dragon' };
    if (d.level < g.level) return { ok: false, reason: `Needs dragon level ${g.level}` };
  } else if (save.rider.level < g.level) {
    return { ok: false, reason: `Needs rider level ${g.level}` };
  }
  return { ok: true };
}

export function equip(data: GameData, save: SaveData, gearId: string, dragonId?: string): SaveData {
  if (save.run?.battle) throw new GameError('You cannot change gear mid-fight');
  const check = canEquip(data, save, gearId, dragonId);
  if (!check.ok) throw new GameError(check.reason);
  const g = gearItem(data, gearId)!;
  if (isDragonSlot(g.slot)) {
    const d = requireDragon(save, dragonId);
    return replaceDragon(save, clampDragonHp(data, { ...d, equipment: { ...d.equipment, [g.slot]: gearId } }));
  }
  const rider = { ...save.rider, equipment: { ...save.rider.equipment, [g.slot as RiderSlot]: gearId } };
  return { ...save, rider: clampRiderHp(data, rider) };
}

export function unequip(data: GameData, save: SaveData, slot: GearSlot, dragonId?: string): SaveData {
  if (save.run?.battle) throw new GameError('You cannot change gear mid-fight');
  if (slot === 'weapon') throw new GameError('You need a weapon');
  if (isDragonSlot(slot)) {
    const d = requireDragon(save, dragonId);
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

// ---------- Partners ----------

export function canHaveSecond(data: GameData, save: SaveData): boolean {
  return save.rider.level >= data.progression.secondPartnerRiderLevel;
}

function freeForBattle(save: SaveData, id: string): DragonState {
  const d = requireDragon(save, id);
  if (d.assignment.kind === 'expedition') throw new GameError(`${d.name} is away on an expedition`);
  return d;
}

/** Make a dragon the lead partner. A training dragon stops training (and keeps what it earned). */
export function setLead(data: GameData, save: SaveData, id: string, now: number): SaveData {
  if (save.run) throw new GameError('Change partners at the Roost, not mid-run');
  freeForBattle(save, id);
  let s = stopTraining(data, save, id, now);
  const second = s.secondDragonId === id ? s.activeDragonId : s.secondDragonId;
  s = { ...s, activeDragonId: id, secondDragonId: second === id ? null : second };
  return s;
}

/** Set or clear the second partner (rider level 25+). */
export function setSecond(data: GameData, save: SaveData, id: string | null, now: number): SaveData {
  if (save.run) throw new GameError('Change partners at the Roost, not mid-run');
  if (id === null) return { ...save, secondDragonId: null };
  if (!canHaveSecond(data, save)) throw new GameError(`A second partner joins at rider level ${data.progression.secondPartnerRiderLevel}`);
  if (id === save.activeDragonId) throw new GameError('That dragon is already your lead');
  freeForBattle(save, id);
  return { ...stopTraining(data, save, id, now), secondDragonId: id };
}

// ---------- Roost buildings ----------

export function upgradeBuilding(data: GameData, save: SaveData, b: BuildingId, now: number): SaveData {
  const cost = upgradeCost(data, save.roost, b);
  if (!cost) throw new GameError('Already at the top level');
  if (save.rider.gold < cost.gold || save.embers < cost.embers) throw new GameError(`Needs ${cost.gold} gold and ${cost.embers} embers`);
  // Bank pantry food at the old rate before the new level applies.
  const roost = b === 'pantry' ? tickPantry(data, save.roost, now) : save.roost;
  return {
    ...save,
    rider: { ...save.rider, gold: save.rider.gold - cost.gold },
    embers: save.embers - cost.embers,
    roost: { ...roost, levels: { ...roost.levels, [b]: roost.levels[b] + 1 } },
  };
}

/** Bring timers up to now without collecting anything. Safe to call on every load. */
export function refreshRoost(data: GameData, save: SaveData, now: number): SaveData {
  return { ...save, roost: tickPantry(data, save.roost, now) };
}

export function collectFood(data: GameData, save: SaveData, now: number): { save: SaveData; food: string[] } {
  const r = withRng(save, (rng) => collectPantry(data, save.roost, now, rng));
  const inventory = { ...r.save.rider.inventory };
  for (const f of r.value.food) inventory[f] = (inventory[f] ?? 0) + 1;
  return { save: { ...r.save, roost: r.value.roost, rider: { ...r.save.rider, inventory } }, food: r.value.food };
}

// ---------- Hatchery ----------

export function incubateEgg(data: GameData, save: SaveData, index: number, now: number): SaveData {
  const egg = save.eggs[index];
  if (!egg) throw new GameError('No such egg');
  const cost = data.roost.buildings.hatchery.incubateEmbers;
  if (save.embers < cost) throw new GameError(`Incubating costs ${cost} embers`);
  if (hatcherySlotsFree(data, save.roost) <= 0) throw new GameError(buildingLevel(data, save.roost, 'hatchery') ? 'The Hatchery is full' : 'Build the Hatchery first');
  const roost = incubate(data, save.roost, egg, now);
  return { ...save, roost, embers: save.embers - cost, eggs: save.eggs.filter((_, i) => i !== index) };
}

/** Take a ready egg out of the Hatchery. It moves to the naming step (save.egg), already warm. */
export function takeHatchedEgg(data: GameData, save: SaveData, index: number, now: number): SaveData {
  const egg = save.roost.hatchery.eggs[index];
  if (!egg) throw new GameError('No such egg');
  if (now < egg.readyAt) throw new GameError('Not ready yet');
  if (save.egg) throw new GameError('Name your last hatchling first');
  if (save.dragons.length >= nestSlots(data, save.roost)) throw new GameError('The Nest is full. Upgrade it for more room.');
  const eggs = save.roost.hatchery.eggs.filter((_, i) => i !== index);
  const spec = { element: egg.element, element2: egg.element2, breed: egg.breed, variant: egg.variant };
  return { ...save, egg: { ...spec, warmth: data.dragons.hatchTaps }, roost: { ...save.roost, hatchery: { eggs } } };
}

// ---------- Nesting Grounds: breeding ----------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Milliseconds before a dragon can breed again (0 when it can). A clock that went backwards never adds to the wait. */
export function breedCooldownLeft(data: GameData, save: SaveData, d: DragonState, now: number): number {
  const lvl = buildingLevel(data, save.roost, 'nesting');
  if (!lvl || d.lastBredAt <= 0) return 0;
  const wait = lvl.cooldownDays * DAY_MS;
  return Math.max(0, Math.min(wait, d.lastBredAt + wait - now));
}

/** Whether a dragon is old enough to breed. */
export function canBreedStage(data: GameData, d: DragonState): boolean {
  return stageIndex(data, d.stage) >= stageIndex(data, data.roost.breeding.stage);
}

export function canBreed(data: GameData, save: SaveData, aId: string, bId: string, now: number): { ok: true } | { ok: false; reason: string } {
  if (!buildingLevel(data, save.roost, 'nesting')) return { ok: false, reason: 'Build the Nesting Grounds first' };
  if (save.roost.nesting) return { ok: false, reason: 'A pair is already nesting' };
  if (aId === bId) return { ok: false, reason: 'Pick two different dragons' };
  const a = save.dragons.find((d) => d.id === aId);
  const b = save.dragons.find((d) => d.id === bId);
  if (!a || !b) return { ok: false, reason: 'No such dragon' };
  for (const d of [a, b]) {
    if (!canBreedStage(data, d)) return { ok: false, reason: `${d.name} is too young. Dragons breed from the Adult stage.` };
    if (d.assignment.kind === 'expedition') return { ok: false, reason: `${d.name} is away on an expedition` };
    if (breedCooldownLeft(data, save, d, now) > 0) return { ok: false, reason: `${d.name} needs more rest before nesting again` };
  }
  const cost = data.roost.breeding.cost;
  if (save.rider.gold < cost.gold || save.embers < cost.embers) return { ok: false, reason: `Nesting costs ${cost.gold} gold and ${cost.embers} embers` };
  return { ok: true };
}

/**
 * Two dragons start nesting. The egg is rolled now (so reloading can't change it) and appears
 * after the building's hours. Both dragons keep fighting and training while they wait.
 */
export function startBreeding(data: GameData, save: SaveData, aId: string, bId: string, now: number): SaveData {
  const check = canBreed(data, save, aId, bId, now);
  if (!check.ok) throw new GameError(check.reason);
  const lvl = buildingLevel(data, save.roost, 'nesting')!;
  const a = requireDragon(save, aId);
  const b = requireDragon(save, bId);
  const r = withRng(save, (rng) => breedEgg(data, rng, a, b));
  const cost = data.roost.breeding.cost;
  const nesting = { parents: [aId, bId] as [string, string], readyAt: now + lvl.hours * 60 * 60 * 1000, egg: r.value };
  const next: SaveData = {
    ...r.save,
    rider: { ...save.rider, gold: save.rider.gold - cost.gold },
    embers: save.embers - cost.embers,
    roost: { ...save.roost, nesting },
  };
  return replaceDragon(replaceDragon(next, { ...a, lastBredAt: now }), { ...b, lastBredAt: now });
}

/** Take the egg from the Nesting Grounds into the bag. */
export function collectNestEgg(save: SaveData, now: number): { save: SaveData; egg: EggSpec } {
  const n = save.roost.nesting;
  if (!n) throw new GameError('Nobody is nesting');
  if (now < n.readyAt) throw new GameError('Not ready yet');
  return { save: { ...save, eggs: [...save.eggs, n.egg], roost: { ...save.roost, nesting: null } }, egg: n.egg };
}

// ---------- Training Yard ----------

export function startTraining(data: GameData, save: SaveData, id: string, now: number): SaveData {
  if (!buildingLevel(data, save.roost, 'training')) throw new GameError('Build the Training Yard first');
  if (isPartner(save, id)) throw new GameError('Battle partners train by fighting. Bench this dragon first.');
  const d = requireDragon(save, id);
  if (d.assignment.kind !== 'idle') throw new GameError(`${d.name} is busy`);
  return replaceDragon(save, { ...d, assignment: { kind: 'training', since: now } });
}

/** Collect training XP and stop training. Does nothing if the dragon isn't training. */
export function stopTraining(data: GameData, save: SaveData, id: string, now: number): SaveData {
  const d = requireDragon(save, id);
  if (d.assignment.kind !== 'training') return save;
  const hours = trainingHours(data, save.roost, d.assignment.since, now);
  const xp = trainingXp(data, save.roost, d, d.assignment.since, now);
  let next = giveDragonXp(data, d, xp).state;
  next = addTemper(data, next, 'training', Math.floor(hours / 4));
  return replaceDragon(save, { ...next, assignment: { kind: 'idle' } });
}

/** Collect training XP so far and keep training. */
export function collectTraining(data: GameData, save: SaveData, id: string, now: number): { save: SaveData; xp: number } {
  const d = requireDragon(save, id);
  if (d.assignment.kind !== 'training') throw new GameError(`${d.name} isn't training`);
  const xp = trainingXp(data, save.roost, d, d.assignment.since, now);
  const s = stopTraining(data, save, id, now);
  const after = requireDragon(s, id);
  return { save: replaceDragon(s, { ...after, assignment: { kind: 'training', since: now } }), xp };
}

// ---------- Expedition Board ----------

export function startExpedition(data: GameData, save: SaveData, id: string, tripId: string, now: number): SaveData {
  if (isPartner(save, id)) throw new GameError('Battle partners stay home. Bench this dragon first.');
  const d = requireDragon(save, id);
  if (d.assignment.kind !== 'idle') throw new GameError(`${d.name} is busy`);
  const trip = tripById(data, tripId);
  if (!trip || !availableTrips(data, save.roost, d).some((t) => t.id === tripId)) throw new GameError('That trip is not available');
  const endsAt = now + trip.hours * 60 * 60 * 1000;
  return replaceDragon(save, { ...d, assignment: { kind: 'expedition', trip: tripId, startedAt: now, endsAt } });
}

export function collectExpedition(data: GameData, save: SaveData, id: string, now: number): { save: SaveData; loot: TripLoot } {
  const d = requireDragon(save, id);
  const a = d.assignment;
  if (a.kind !== 'expedition') throw new GameError(`${d.name} isn't on an expedition`);
  if (now < a.endsAt) throw new GameError(`${d.name} is still away`);
  const r = withRng(save, (rng) => rollTripLoot(data, save.roost, a.trip, d, rng));
  const loot = r.value;
  const inventory = { ...r.save.rider.inventory };
  for (const f of loot.food) inventory[f] = (inventory[f] ?? 0) + 1;
  let dragon = giveDragonXp(data, d, loot.xp).state;
  dragon = addTemper(data, { ...dragon, assignment: { kind: 'idle' } }, 'expedition');
  const next = {
    ...r.save,
    rider: addMaterials({ ...r.save.rider, gold: r.save.rider.gold + loot.gold, inventory }, loot.materials),
    embers: r.save.embers + loot.embers,
  };
  return { save: replaceDragon(next, dragon), loot };
}

// ---------- Elder: egg laying ----------

export function canLayEgg(data: GameData, save: SaveData, id: string): { ok: true } | { ok: false; reason: string } {
  const d = save.dragons.find((x) => x.id === id);
  if (!d) return { ok: false, reason: 'No such dragon' };
  const rule = data.dragons.eggLaying;
  if (stageIndex(data, d.stage) < stageIndex(data, rule.stage)) return { ok: false, reason: 'Only Elder dragons lay eggs' };
  if (d.laidEgg) return { ok: false, reason: `${d.name} has already laid its egg` };
  if (save.embers < rule.cost.embers || save.rider.gold < rule.cost.gold) return { ok: false, reason: `Needs ${rule.cost.embers} embers` };
  return { ok: true };
}

/** An Elder lays one egg of its own element (or hybrid) and breed, once in its life. */
export function layEgg(data: GameData, save: SaveData, id: string): SaveData {
  const check = canLayEgg(data, save, id);
  if (!check.ok) throw new GameError(check.reason);
  const d = requireDragon(save, id);
  const cost = data.dragons.eggLaying.cost;
  const r = withRng(save, (rng) => ({ element: d.element, element2: d.element2, breed: d.breed, variant: rollVariant(data, rng, !!d.variant) }));
  const next = { ...r.save, embers: save.embers - cost.embers, rider: { ...save.rider, gold: save.rider.gold - cost.gold }, eggs: [...save.eggs, r.value] };
  return replaceDragon(next, { ...d, laidEgg: true });
}

// ---------- Seasonal events ----------

export function eventGiftClaimed(data: GameData, save: SaveData, today: string): boolean {
  const ev = activeEvent(data, today);
  return !!ev && save.eventsClaimed.includes(eventKey(ev, today));
}

/** Claim the running event's gift, once per event per year. */
export function claimEventGift(data: GameData, save: SaveData, today: string): SaveData {
  const ev = activeEvent(data, today);
  if (!ev) throw new GameError('No event is running');
  const key = eventKey(ev, today);
  if (save.eventsClaimed.includes(key)) throw new GameError('Already claimed this year');
  const inventory = { ...save.rider.inventory };
  for (const [id, n] of Object.entries(ev.gift.items)) inventory[id] = (inventory[id] ?? 0) + n;
  return {
    ...save,
    embers: save.embers + ev.gift.embers,
    rider: { ...save.rider, inventory },
    eventsClaimed: [...save.eventsClaimed, key],
  };
}
