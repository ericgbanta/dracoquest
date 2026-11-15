/**
 * Run events between fights (VARIETY_PLAN V1): a chest, a shrine, a peddler,
 * an ambush and so on. After a won regular fight in a zone hunt an event may
 * wait in the run. It carries its own seed, so a reload shows the same scene,
 * and the option picked always gives the same result for that seed.
 *
 * This module is pure. Applying a result to the save lives in game.ts.
 */
import { createRng, seedFromString, type Rng } from './rng';
import { enemyGold } from './progression';
import { newEgg } from './eggs';
import { clampLevel, rollTraits, type PlannedFight } from './run';
import type { EggSpec, EventOption, EventOutcome, GameData, Materials, RunEventData, StatusId, TemperamentId, ZoneData } from './types';

/** An event waiting in the run. `chosen` and `result` are set once the player picks an option. */
export interface RunEvent { id: string; seed: number; chosen?: string; result?: EventResult }

/** What an option did, worked out in full so the save can show it again after a reload. */
export interface EventResult {
  option: string;
  text: string;
  /** Gold found, and gold paid. */
  gold: number;
  cost: number;
  items: Record<string, number>;
  materials: Materials;
  embers: number;
  heal: number;
  hpCost: number;
  boon?: StatusId;
  /** An extra fight put in front of the next one. */
  fight?: PlannedFight;
  egg?: EggSpec;
  temper?: TemperamentId;
  bond: number;
}

export function eventById(data: GameData, id: string): RunEventData | undefined {
  return data.runEvents.events.find((e) => e.id === id);
}

/** The events that can happen for this rider. */
export function eventsFor(data: GameData, riderLevel: number, hasDragon: boolean): RunEventData[] {
  return data.runEvents.events.filter((e) => riderLevel >= (e.minLevel ?? 1) && (!e.needsDragon || hasDragon));
}

function pickWeighted<T extends { weight: number }>(items: readonly T[], rng: Rng): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let roll = rng.float(0, total);
  for (const x of items) {
    roll -= x.weight;
    if (roll < 0) return x;
  }
  return items[items.length - 1]!;
}

/** Roll for an event after a won fight. Null most of the time. */
export function rollEvent(data: GameData, riderLevel: number, hasDragon: boolean, rng: Rng): RunEvent | null {
  if (!rng.chance(data.runEvents.chance)) return null;
  const pool = eventsFor(data, riderLevel, hasDragon);
  if (!pool.length) return null;
  const event = pickWeighted(pool, rng);
  return { id: event.id, seed: rng.int(0, 0xffffffff) };
}

/** One regular enemy's gold at this level, the unit event gold is counted in. */
const fightGold = (data: GameData, level: number) => enemyGold(data.progression, level, 1);

/** What an option costs in gold at this level. */
export function optionCost(data: GameData, option: EventOption, riderLevel: number): number {
  return (option.costGold ?? 0) + Math.round((option.costFights ?? 0) * fightGold(data, riderLevel));
}

/** Fill {zone}, {dragon} and {element} in an event's text. */
export function fillText(text: string, names: { zone: string; dragon: string; element: string }): string {
  return text.replace(/\{zone\}/g, names.zone).replace(/\{dragon\}/g, names.dragon).replace(/\{element\}/g, names.element);
}

/** The zone's single-enemy encounters open at this level: who an ambush or a champion path sends. */
function loners(zone: ZoneData, riderLevel: number): string[] {
  const ids = zone.encounters.filter((e) => e.enemies.length === 1 && (e.minLevel ?? 0) <= riderLevel).map((e) => e.enemies[0]!);
  return ids.length ? ids : [zone.encounters[0]!.enemies[0]!];
}

/** The sturdiest regular enemy of the zone at this level, whose stats a mimic borrows. */
function sturdiest(data: GameData, zone: ZoneData, level: number): string {
  const ids = [...new Set(zone.encounters.flatMap((e) => e.enemies))];
  const hp = (id: string) => data.enemies[id]!.base.hp + data.enemies[id]!.perLevel.hp * (level - 1);
  return ids.reduce((a, b) => (hp(b) > hp(a) ? b : a), ids[0]!);
}

/** The enemy a mimic uses for its art and moves. */
export const MIMIC = 'treasure-mimic';

function eventFight(data: GameData, zone: ZoneData, riderLevel: number, spec: NonNullable<EventOutcome['fight']>, rng: Rng, eventId: string): PlannedFight {
  const level = clampLevel(zone, riderLevel);
  switch (spec.kind) {
    case 'ambush': {
      const pairLevel = clampLevel(zone, riderLevel + zone.multiEnemyLevelOffset);
      const pool = loners(zone, riderLevel);
      return { kind: 'normal', bonus: spec.bonus, event: eventId, enemies: [rng.pick(pool), rng.pick(pool)].map((enemyId) => ({ enemyId, level: pairLevel })) };
    }
    case 'mimic':
      return { kind: 'normal', bonus: spec.bonus, event: eventId, enemies: [{ enemyId: MIMIC, level, statsFrom: sturdiest(data, zone, level) }] };
    case 'champion':
      return { kind: 'normal', bonus: spec.bonus, event: eventId, enemies: [{ enemyId: rng.pick(loners(zone, riderLevel)), level, traits: rollTraits(data, rng) }] };
  }
}

/**
 * Work out what an option does. The outcome and anything random in it come
 * from the event's seed and the option, so the same pick always gives the same result.
 */
export function resolveOption(data: GameData, zone: ZoneData, riderLevel: number, event: RunEvent, optionId: string): EventResult {
  const ev = eventById(data, event.id);
  const option = ev?.options.find((o) => o.id === optionId);
  if (!ev || !option) throw new Error(`No option ${optionId} on event ${event.id}`);
  const rng = createRng((event.seed ^ seedFromString(optionId)) >>> 0);
  const out = pickWeighted(option.outcomes, rng);
  const items: Record<string, number> = { ...(out.items ?? {}) };
  for (let i = 0; i < (out.itemPick?.count ?? 0); i++) {
    const id = rng.pick(out.itemPick!.from);
    items[id] = (items[id] ?? 0) + 1;
  }
  const result: EventResult = {
    option: option.id,
    text: out.text,
    gold: Math.round((out.goldFights ?? 0) * fightGold(data, riderLevel)),
    cost: optionCost(data, option, riderLevel),
    items,
    materials: { ...(out.materials ?? {}) },
    embers: out.embers ?? 0,
    heal: out.heal ?? 0,
    hpCost: out.hpCost ?? 0,
    bond: out.bond ?? 0,
  };
  if (out.boon) result.boon = out.boon;
  if (out.temper) result.temper = out.temper;
  if (out.fight) result.fight = eventFight(data, zone, riderLevel, out.fight, rng, ev.id);
  if (out.egg) result.egg = newEgg(data, rng, zone.element);
  return result;
}
