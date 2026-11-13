/**
 * Rider spells. The rider learns spells by level and takes a loadout of a
 * few into battle. Spell numbers live in combat.json, the loadout size in
 * progression.json.
 */
import type { GameData, MaterialId, Materials, RiderState, SpellData } from './types';
import { canAfford, type ForgeCost } from './forge';

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

// ---------- Power-ups ----------

/** The rider's power-up level on a spell (0 if never powered up). */
export function spellPlusOf(rider: Pick<RiderState, 'spellPlus'>, id: string): number {
  return rider.spellPlus?.[id] ?? 0;
}

/**
 * A spell as it is at `plus`: more power and a likelier status for damage and healing spells,
 * a lower MP cost for buffs. The name stays the same (the battle stage matches spells by name).
 */
export function poweredSpell(data: GameData, spell: SpellData, plus: number): SpellData {
  if (!plus) return spell;
  const p = data.forge.spells;
  if (spell.kind === 'buff') return { ...spell, mp: Math.max(1, spell.mp - p.buffMpCut * plus) };
  const out: SpellData = { ...spell, base: Math.round(spell.base * (1 + p.powerPct * plus) * 100) / 100 };
  if (spell.status && spell.statusChance !== undefined) out.statusChance = Math.min(1, Math.round((spell.statusChance + p.statusChance * plus) * 100) / 100);
  return out;
}

/** A spell from the battle's loadout, with the power-ups it was taken into the fight with. */
export function battleSpell(data: GameData, battle: { spellPlus?: Record<string, number> }, id: string): SpellData | undefined {
  const sp = spellById(data, id);
  return sp ? poweredSpell(data, sp, battle.spellPlus?.[id] ?? 0) : undefined;
}

/** What taking a spell to `plus` costs, or null past the last plus. */
export function spellUpgradeCost(data: GameData, spell: SpellData, plus: number): ForgeCost | null {
  const u = data.forge.spells.upgrades.find((x) => x.plus === plus);
  if (!u) return null;
  const materials: Materials = {};
  for (const [m, c] of Object.entries(u.materials) as [MaterialId, { base: number; perLevels: number }][]) {
    materials[m] = c.base + Math.floor(spell.level / c.perLevels);
  }
  return { gold: u.minGold + u.goldPerLevel * spell.level, embers: u.embers, materials };
}

/** Why a spell can't be powered up now, or null if it can. */
export function spellUpgradeBlocker(data: GameData, rider: RiderState, embers: number, id: string): string | null {
  const sp = spellById(data, id);
  if (!sp) return 'There is no such spell';
  if (sp.level > rider.level) return `${sp.name} isn't learned yet`;
  const cost = spellUpgradeCost(data, sp, spellPlusOf(rider, id) + 1);
  if (!cost) return 'Already at full power';
  if (!canAfford({ gold: rider.gold, embers, materials: rider.materials }, cost)) return 'Not enough materials, gold or embers';
  return null;
}

/** Power up a spell by one plus. Returns the new rider and the embers spent. */
export function upgradeSpell(data: GameData, rider: RiderState, embers: number, id: string): { rider: RiderState; embersSpent: number; plus: number } {
  const blocker = spellUpgradeBlocker(data, rider, embers, id);
  if (blocker) throw new SpellError(blocker);
  const plus = spellPlusOf(rider, id) + 1;
  const cost = spellUpgradeCost(data, spellById(data, id)!, plus)!;
  const materials = { ...rider.materials };
  for (const [m, n] of Object.entries(cost.materials) as [MaterialId, number][]) materials[m] = (materials[m] ?? 0) - n;
  return {
    rider: { ...rider, gold: rider.gold - cost.gold, materials, spellPlus: { ...rider.spellPlus, [id]: plus } },
    embersSpent: cost.embers,
    plus,
  };
}
