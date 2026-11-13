/**
 * Eggs, hybrids and rare finishes: what an egg is called, what it's worth to the wild,
 * and what two parents make at the Nesting Grounds. Pure: randomness comes in as an Rng.
 */
import type { Rng } from './rng';
import type { DragonState, ElementId, ElementsData, EggSpec, GameData, VariantId } from './types';
import { VARIANTS } from './types';

/** A plain egg of one element, the original breed and no finish. */
export function plainEgg(element: ElementId): EggSpec {
  return { element, element2: null, breed: 'dragon', variant: null };
}

/** Two elements can mix unless they're the same or one of the opposed pairs (Light and Shadow). */
export function canMix(data: ElementsData, a: ElementId, b: ElementId): boolean {
  if (a === b) return false;
  return !data.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function hybridKey(data: ElementsData, a: ElementId, b: ElementId): string {
  return data.ids.indexOf(a) <= data.ids.indexOf(b) ? `${a}+${b}` : `${b}+${a}`;
}

/** A hybrid's name (Steam for Fire and Tide), or both element names when the mix has none. */
export function hybridName(data: ElementsData, a: ElementId, b: ElementId): string {
  return data.hybrids[hybridKey(data, a, b)] ?? `${data.info[a].name}-${data.info[b].name}`;
}

/** The elements a dragon or egg carries: one, or two for a hybrid. */
export function elementsOf(x: { element: ElementId; element2: ElementId | null }): ElementId[] {
  return x.element2 ? [x.element, x.element2] : [x.element];
}

/** "Fire", or "Steam" for a Fire and Tide hybrid. */
export function elementLabel(data: ElementsData, x: { element: ElementId; element2: ElementId | null }): string {
  return x.element2 ? hybridName(data, x.element, x.element2) : data.info[x.element].name;
}

/** The egg's name: "Ember Egg", "Steam Egg", "Shimmer Wyvern Ember Egg". */
export function eggName(data: GameData, egg: EggSpec): string {
  const base = egg.element2
    ? `${hybridName(data.elements, egg.element, egg.element2)} Egg`
    : data.dragons.eggs[egg.element]?.name ?? `${data.elements.info[egg.element].name} Egg`;
  const breed = egg.breed !== 'dragon' ? `${data.dragons.breeds[egg.breed]?.name ?? egg.breed} ` : '';
  const variant = egg.variant ? `${data.dragons.variants.info[egg.variant].name} ` : '';
  return `${variant}${breed}${base}`;
}

/** Identical eggs (same elements, breed and finish) gathered in one group, in order of first appearance. */
export interface EggGroup { egg: EggSpec; indices: number[] }

export function groupEggs(eggs: readonly EggSpec[]): EggGroup[] {
  const groups = new Map<string, EggGroup>();
  eggs.forEach((egg, i) => {
    const key = `${egg.element}|${egg.element2 ?? ''}|${egg.breed}|${egg.variant ?? ''}`;
    const g = groups.get(key);
    if (g) g.indices.push(i);
    else groups.set(key, { egg, indices: [i] });
  });
  return [...groups.values()];
}

/** Embers the wild dragons leave for a returned egg. Rarer eggs are worth more. */
export function releaseValue(data: GameData, egg: EggSpec): number {
  const r = data.roost.releaseEmbers;
  return r.base + (egg.element2 ? r.hybrid : 0) + (egg.breed !== 'dragon' ? r.breed : 0) + (egg.variant ? r.variant : 0);
}

/** Roll whether a new egg gets a rare finish. A parent with one makes it likelier. */
export function rollVariant(data: GameData, rng: Rng, parentHasOne = false): VariantId | null {
  const v = data.dragons.variants;
  return rng.chance(parentHasOne ? v.inheritedChance : v.chance) ? rng.pick(VARIANTS) : null;
}

/** A new egg of one element from a drop, the shop or an Elder, with the usual chance of a finish. */
export function newEgg(data: GameData, rng: Rng, element: ElementId, breed = 'dragon'): EggSpec {
  return { element, element2: null, breed, variant: rollVariant(data, rng) };
}

type Parent = Pick<DragonState, 'element' | 'element2' | 'breed' | 'variant'>;

/**
 * The egg two parents make. Most of the time it takes one element from one parent; sometimes
 * (`breeding.hybridChance`) it's a hybrid: the two parents' elements mixed, or a hybrid parent's own mix.
 */
export function breedEgg(data: GameData, rng: Rng, a: Parent, b: Parent): EggSpec {
  const breed = rng.chance(0.5) ? a.breed : b.breed;
  const variant = rollVariant(data, rng, !!(a.variant || b.variant));
  if (rng.chance(data.roost.breeding.hybridChance)) {
    const mixes: [ElementId, ElementId][] = [];
    for (const p of [a, b]) if (p.element2) mixes.push([p.element, p.element2]);
    if (!a.element2 && !b.element2 && canMix(data.elements, a.element, b.element)) mixes.push([a.element, b.element]);
    if (mixes.length > 0) {
      const [x, y] = rng.pick(mixes);
      return { element: x, element2: y, breed, variant };
    }
  }
  const parent = rng.chance(0.5) ? a : b;
  return { element: rng.pick(elementsOf(parent)), element2: null, breed, variant };
}
