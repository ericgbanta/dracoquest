/**
 * Adventures beyond the zone run: story quests (a zone's story, played once,
 * with an occasional choice) and the daily bounty board. Pure: the day comes
 * in as a "YYYY-MM-DD" string from the UI.
 */
import { createRng, seedFromString } from './rng';
import type { BattleState } from './battle';
import type { PlannedFight } from './run';
import type { BountyState, SaveData } from './save';
import type { BountyData, GameData, RiderState, StoryData, StoryReward } from './types';
import { MATERIALS } from './types';

// ---------- Story quests ----------

export function storiesFor(data: GameData, zoneId: string): StoryData[] {
  return data.stories.filter((q) => q.zone === zoneId);
}

export function storyById(data: GameData, id: string): StoryData | undefined {
  return data.stories.find((q) => q.id === id);
}

export type StoryStatus =
  | { state: 'done'; choicePending: boolean }
  | { state: 'available' }
  | { state: 'locked'; reason: string };

export function storyStatus(data: GameData, save: SaveData, q: StoryData): StoryStatus {
  if (save.questsDone.includes(q.id)) return { state: 'done', choicePending: !!q.choice && !save.storyChoices[q.id] };
  if (q.requires && !save.questsDone.includes(q.requires)) {
    return { state: 'locked', reason: `Finish "${storyById(data, q.requires)?.name ?? q.requires}" first` };
  }
  if (save.rider.level < q.minLevel) return { state: 'locked', reason: `Reach rider level ${q.minLevel}` };
  return { state: 'available' };
}

/** How many of a zone's story quests are done. */
export function storyProgress(data: GameData, save: SaveData, zoneId: string): { done: number; total: number } {
  const list = storiesFor(data, zoneId);
  return { done: list.filter((q) => save.questsDone.includes(q.id)).length, total: list.length };
}

/** A story quest as a run's fights. Boss and mini-boss steps count as those fights, with their drops. */
export function planStory(q: StoryData): PlannedFight[] {
  return q.steps.map((step) => ({
    kind: step.boss ? 'boss' : step.mini ? 'mini' : 'story',
    intro: step.intro,
    enemies: step.enemies.map((id) => ({ enemyId: id, level: step.level })),
  }));
}

/** A reward's gold, items and materials on the rider. Embers and XP are added by the caller. */
export function rewardRider(rider: RiderState, r: StoryReward): RiderState {
  const inventory = { ...rider.inventory };
  for (const [id, n] of Object.entries(r.items ?? {})) inventory[id] = (inventory[id] ?? 0) + n;
  const materials = { ...rider.materials };
  for (const m of MATERIALS) if (r.materials?.[m]) materials[m] = (materials[m] ?? 0) + r.materials[m]!;
  return { ...rider, gold: rider.gold + (r.gold ?? 0), inventory, materials };
}

/** Gold, embers, items and materials from a reward (not XP). */
export function grantReward(save: SaveData, r: StoryReward): SaveData {
  return { ...save, embers: save.embers + (r.embers ?? 0), rider: rewardRider(save.rider, r) };
}

// ---------- Bounties ----------

export const bountyKey = (zoneId: string, id: string) => `${zoneId}:${id}`;

/** The bounties a zone posts on a given day. The same day and zone always give the same board. */
export function bountyBoard(data: GameData, zoneId: string, day: string): BountyData[] {
  const pool = data.bounties.pools[zoneId];
  if (!pool || !day) return [];
  const rng = createRng(seedFromString(`bounties:${day}:${zoneId}`));
  const left = [...pool];
  const out: BountyData[] = [];
  while (out.length < data.bounties.perDay && left.length) out.push(left.splice(rng.int(0, left.length - 1), 1)[0]!);
  return out;
}

/** The board for `today`: a new day starts an empty board. */
export function bountiesForDay(state: BountyState, today: string): BountyState {
  return state.day === today ? state : { day: today, progress: {}, claimed: [] };
}

/** Count a won fight towards today's bounties in the zone. `cleared` is true when it finished a hunt. */
export function countBounties(data: GameData, state: BountyState, zoneId: string, battle: BattleState, cleared: boolean): BountyState {
  const board = bountyBoard(data, zoneId, state.day);
  if (!board.length) return state;
  const progress = { ...state.progress };
  for (const b of board) {
    const key = bountyKey(zoneId, b.id);
    const add = b.kind === 'wins' ? 1
      : b.kind === 'clear' ? (cleared ? 1 : 0)
      : battle.enemies.filter((e) => e.enemyId === b.enemy && e.hp <= 0).length;
    if (add) progress[key] = Math.min(b.count, (progress[key] ?? 0) + add);
  }
  return { ...state, progress };
}

export function bountyDone(state: BountyState, zoneId: string, b: BountyData): boolean {
  return (state.progress[bountyKey(zoneId, b.id)] ?? 0) >= b.count;
}

/** How many of a zone's bounties today are ready to claim. */
export function bountiesReady(data: GameData, state: BountyState, zoneId: string, today: string): number {
  const s = bountiesForDay(state, today);
  return bountyBoard(data, zoneId, today).filter((b) => bountyDone(s, zoneId, b) && !s.claimed.includes(bountyKey(zoneId, b.id))).length;
}
