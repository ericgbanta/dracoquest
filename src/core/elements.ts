import type { ElementId, ElementsData } from './types';

export type Matchup = 'strong' | 'neutral' | 'weak' | 'same';

/** True when `a` beats `b`: next on the ring, or the other half of a pair (Light and Shadow). */
export function beats(data: ElementsData, a: ElementId, b: ElementId): boolean {
  const i = data.ring.indexOf(a);
  if (i >= 0) {
    const j = data.ring.indexOf(b);
    return j >= 0 && (i + 1) % data.ring.length === j;
  }
  return data.pairs.some(([x, y]) => (x === a && y === b) || (y === a && x === b));
}

export function matchup(data: ElementsData, attacker: ElementId | null, defender: ElementId | null): Matchup {
  if (!attacker || !defender) return 'neutral';
  if (attacker === defender) return 'same';
  if (beats(data, attacker, defender)) return 'strong';
  if (beats(data, defender, attacker)) return 'weak';
  return 'neutral';
}

/**
 * Damage multiplier for an attack. A defender's resist override for the
 * attacking element replaces the matchup multiplier.
 */
export function elementMultiplier(
  data: ElementsData,
  attacker: ElementId | null,
  defender: ElementId | null,
  resist?: Partial<Record<ElementId, number>>,
): number {
  if (attacker && resist && resist[attacker] !== undefined) return resist[attacker];
  return data.multipliers[matchup(data, attacker, defender)];
}

/**
 * Damage multiplier against a fighter that may be a hybrid: a hybrid takes the average of
 * the matchups against its two elements.
 */
export function defenseMultiplier(
  data: ElementsData,
  attacker: ElementId | null,
  defender: { element: ElementId | null; element2?: ElementId | null; resist?: Partial<Record<ElementId, number>> },
): number {
  const one = elementMultiplier(data, attacker, defender.element, defender.resist);
  if (!defender.element2) return one;
  return (one + elementMultiplier(data, attacker, defender.element2, defender.resist)) / 2;
}

/**
 * The element a fighter attacks with. A hybrid uses whichever of its two elements does more
 * against the target, at `factor` power; anything else uses its one element at full power.
 */
export function attackElement(
  data: ElementsData,
  hybridFactor: number,
  source: { element: ElementId | null; element2?: ElementId | null },
  target: Parameters<typeof defenseMultiplier>[2],
): { element: ElementId | null; factor: number } {
  if (!source.element2) return { element: source.element, factor: 1 };
  const second = defenseMultiplier(data, source.element2, target) > defenseMultiplier(data, source.element, target);
  return { element: second ? source.element2 : source.element, factor: hybridFactor };
}

/** Elements that deal strong damage to `defender`. Used to show weaknesses. */
export function weaknessesOf(data: ElementsData, defender: ElementId, resist?: Partial<Record<ElementId, number>>): ElementId[] {
  return data.ids.filter((a) => elementMultiplier(data, a, defender, resist) > data.multipliers.neutral);
}
