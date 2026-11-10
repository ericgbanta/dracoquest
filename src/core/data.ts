/**
 * Loads and validates the JSON data files in /src/data.
 * Every balance number comes from here, never from code constants.
 */
import elementsJson from '../data/elements.json';
import combatJson from '../data/combat.json';
import progressionJson from '../data/progression.json';

export type ElementId = 'fire' | 'frost' | 'verdant' | 'stone' | 'storm' | 'tide' | 'light' | 'shadow';

export interface ElementsData {
  ids: ElementId[];
  ring: ElementId[];
  pairs: [ElementId, ElementId][];
  starters: ElementId[];
  multipliers: { strong: number; neutral: number; weak: number; same: number };
}

export interface CombatData {
  statDivisor: number;
  critMultiplier: number;
  damageRandMin: number;
  damageRandMax: number;
  minDamage: number;
}

export interface ProgressionData {
  levelCap: number;
  xpBase: number;
  xpExponent: number;
  statPointsPerLevel: number;
  secondPartnerRiderLevel: number;
}

export interface GameData {
  elements: ElementsData;
  combat: CombatData;
  progression: ProgressionData;
}

export class DataError extends Error {}

function requireNumbers(name: string, obj: unknown, keys: string[]): void {
  if (typeof obj !== 'object' || obj === null) throw new DataError(`${name}: not an object`);
  const rec = obj as Record<string, unknown>;
  for (const key of keys) {
    const v = rec[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new DataError(`${name}.${key}: expected a finite number, got ${JSON.stringify(v)}`);
    }
  }
}

export function validateElements(raw: unknown): ElementsData {
  if (typeof raw !== 'object' || raw === null) throw new DataError('elements: not an object');
  const e = raw as Record<string, unknown>;
  const ids = e.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x) => typeof x === 'string')) {
    throw new DataError('elements.ids: expected a non-empty string array');
  }
  const known = new Set<string>(ids);
  const checkList = (key: string, list: unknown): void => {
    if (!Array.isArray(list)) throw new DataError(`elements.${key}: expected an array`);
    for (const id of list.flat()) {
      if (!known.has(id as string)) throw new DataError(`elements.${key}: unknown element "${String(id)}"`);
    }
  };
  checkList('ring', e.ring);
  checkList('pairs', e.pairs);
  checkList('starters', e.starters);
  requireNumbers('elements.multipliers', e.multipliers, ['strong', 'neutral', 'weak', 'same']);
  return raw as ElementsData;
}

export function validateCombat(raw: unknown): CombatData {
  requireNumbers('combat', raw, ['statDivisor', 'critMultiplier', 'damageRandMin', 'damageRandMax', 'minDamage']);
  return raw as CombatData;
}

export function validateProgression(raw: unknown): ProgressionData {
  requireNumbers('progression', raw, ['levelCap', 'xpBase', 'xpExponent', 'statPointsPerLevel', 'secondPartnerRiderLevel']);
  return raw as ProgressionData;
}

export function loadGameData(raw: { elements: unknown; combat: unknown; progression: unknown }): GameData {
  return {
    elements: validateElements(raw.elements),
    combat: validateCombat(raw.combat),
    progression: validateProgression(raw.progression),
  };
}

/** The game's data, validated once at startup. */
export const gameData: GameData = loadGameData({
  elements: elementsJson,
  combat: combatJson,
  progression: progressionJson,
});
