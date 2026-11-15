/**
 * Daily zone conditions (VARIETY_PLAN V3): each zone gets one condition a day,
 * picked from a seed of the day and the zone, like the bounty board. A hunt
 * stores the condition it started with, so a run never changes at midnight.
 */
import { createRng, seedFromString } from './rng';
import type { ConditionData, ElementId, GameData, ZoneData } from './types';

/** A condition as a run holds it: its id, and the element for a surge. */
export interface RunCondition { id: string; element?: ElementId }

export function conditionById(data: GameData, id: string | undefined): ConditionData | undefined {
  return id ? data.conditions.conditions.find((c) => c.id === id) : undefined;
}

/** Today's condition in a zone. The same day and zone always give the same one. */
export function conditionFor(data: GameData, zone: ZoneData, day: string): RunCondition {
  const list = data.conditions.conditions;
  const rng = createRng(seedFromString(`condition:${day}:${zone.id}`));
  const total = list.reduce((s, c) => s + c.weight, 0);
  let roll = rng.float(0, total);
  let pick = list[list.length - 1]!;
  for (const c of list) {
    roll -= c.weight;
    if (roll < 0) { pick = c; break; }
  }
  if (!pick.zoneElement) return { id: pick.id };
  return { id: pick.id, element: rng.pick(zone.elements ?? [zone.element]) };
}

/** The condition's name and text with its element filled in. */
export function describeCondition(data: GameData, c: RunCondition): { name: string; text: string; icon: string } | null {
  const d = conditionById(data, c.id);
  if (!d) return null;
  const el = c.element ? data.elements.info[c.element].name : '';
  const fill = (t: string) => t.replace(/\{element\}/g, el);
  return { name: fill(d.name), text: fill(d.text), icon: d.icon };
}

/** What a condition does in battle, with a surge's element. */
export function battleCondition(data: GameData, c: RunCondition | null | undefined): BattleCondition | null {
  const d = conditionById(data, c?.id);
  if (!d?.battle) return null;
  const out: BattleCondition = {};
  if (d.battle.dodgeBonus) out.dodgeBonus = d.battle.dodgeBonus;
  if (d.battle.breathPerRound) out.breathPerRound = d.battle.breathPerRound;
  if (d.battle.elementBoost && c?.element) out.boost = { element: c.element, multiplier: d.battle.elementBoost };
  return out;
}

/** The battle side of a condition, stored on the fight. */
export interface BattleCondition { dodgeBonus?: number; breathPerRound?: number; boost?: { element: ElementId; multiplier: number } }
