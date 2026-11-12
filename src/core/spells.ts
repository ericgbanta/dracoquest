/**
 * Rider spells. The rider learns spells by level and takes a loadout of a
 * few into battle. Spell numbers live in combat.json, the loadout size in
 * progression.json.
 */
import type { GameData, RiderState, SpellData } from './types';

export function spellById(data: GameData, id: string): SpellData | undefined {
  return data.combat.riderMoves.spells.find((s) => s.id === id);
}

/** Spells a rider of this level knows, in the order they are learned. */
export function knownSpells(data: GameData, level: number): SpellData[] {
  return data.combat.riderMoves.spells.filter((s) => s.level <= level).sort((a, b) => a.level - b.level);
}

/** Spells learned on the way from one level to another (exclusive, inclusive). */
export function spellsLearnedBetween(data: GameData, fromLevel: number, toLevel: number): SpellData[] {
  return knownSpells(data, toLevel).filter((s) => s.level > fromLevel);
}

/** The first spells a rider knows, filling the loadout in order. Used by new riders and the v7 migration. */
export function defaultLoadout(data: GameData, level: number): string[] {
  return knownSpells(data, level).slice(0, data.progression.spellLoadoutSize).map((s) => s.id);
}

/** The rider's loadout with anything unknown, duplicated or over the limit dropped. */
export function riderLoadout(data: GameData, rider: Pick<RiderState, 'level' | 'spells'>): string[] {
  const known = new Set(knownSpells(data, rider.level).map((s) => s.id));
  const out: string[] = [];
  for (const id of rider.spells ?? []) {
    if (known.has(id) && !out.includes(id) && out.length < data.progression.spellLoadoutSize) out.push(id);
  }
  return out;
}

export class SpellError extends Error {}

/** Set the loadout. Throws SpellError if a spell is unknown, repeated, or there are too many. */
export function setLoadout(data: GameData, rider: RiderState, ids: string[]): RiderState {
  const known = new Set(knownSpells(data, rider.level).map((s) => s.id));
  if (ids.length > data.progression.spellLoadoutSize) throw new SpellError(`You can take ${data.progression.spellLoadoutSize} spells into battle.`);
  if (new Set(ids).size !== ids.length) throw new SpellError('That spell is already in your loadout.');
  for (const id of ids) if (!known.has(id)) throw new SpellError(`${spellById(data, id)?.name ?? 'That spell'} isn't learned yet.`);
  return { ...rider, spells: [...ids] };
}

/** After a level-up: newly learned spells fill any empty loadout slots, in the order learned. */
export function learnSpells(data: GameData, rider: RiderState, fromLevel: number): { rider: RiderState; learned: SpellData[] } {
  const learned = spellsLearnedBetween(data, fromLevel, rider.level);
  if (!learned.length) return { rider, learned };
  const spells = riderLoadout(data, rider);
  for (const s of learned) if (spells.length < data.progression.spellLoadoutSize && !spells.includes(s.id)) spells.push(s.id);
  return { rider: { ...rider, spells }, learned };
}
