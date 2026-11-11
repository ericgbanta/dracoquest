/**
 * Loads and validates the JSON data files in /src/data.
 * Every balance number comes from here, never from code constants.
 */
import elementsJson from '../data/elements.json';
import combatJson from '../data/combat.json';
import statusesJson from '../data/statuses.json';
import progressionJson from '../data/progression.json';
import dragonsJson from '../data/dragons.json';
import careJson from '../data/care.json';
import foodsJson from '../data/foods.json';
import itemsJson from '../data/items.json';
import enemiesJson from '../data/enemies.json';
import zonesJson from '../data/zones.json';
import gearJson from '../data/gear.json';
import talentsJson from '../data/talents.json';
import questsJson from '../data/quests.json';
import shopJson from '../data/shop.json';
import roostJson from '../data/roost.json';
import eventsJson from '../data/events.json';
import type {
  CombatData, ElementsData, EnemyData, GameData, GearData, ItemData, ProgressionData, QuestData, ShopData, StatusData, StatusId,
  EventData, RoostData, TalentsData, ZoneData,
} from './types';

export type * from './types';

export class DataError extends Error {}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireNumbers(name: string, obj: unknown, keys: string[]): void {
  if (!isObj(obj)) throw new DataError(`${name}: not an object`);
  for (const key of keys) {
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new DataError(`${name}.${key}: expected a finite number, got ${JSON.stringify(v)}`);
    }
  }
}

export function validateElements(raw: unknown): ElementsData {
  if (!isObj(raw)) throw new DataError('elements: not an object');
  const ids = raw.ids;
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
  checkList('ring', raw.ring);
  checkList('pairs', raw.pairs);
  checkList('starters', raw.starters);
  requireNumbers('elements.multipliers', raw.multipliers, ['strong', 'neutral', 'weak', 'same']);
  if (!isObj(raw.info)) throw new DataError('elements.info: missing');
  for (const id of known) if (!isObj(raw.info[id])) throw new DataError(`elements.info.${id}: missing`);
  return raw as unknown as ElementsData;
}

export function validateCombat(raw: unknown): CombatData {
  requireNumbers('combat', raw, ['statDivisor', 'critMultiplier', 'damageRandMin', 'damageRandMax', 'minDamage']);
  const c = raw as Record<string, unknown>;
  requireNumbers('combat.hit', c.hit, ['base', 'perPoint', 'min', 'max']);
  requireNumbers('combat.breath', c.breath, ['max', 'perRound', 'perSpirit', 'onDealDamage', 'onTakeDamage']);
  return raw as CombatData;
}

export function validateProgression(raw: unknown): ProgressionData {
  requireNumbers('progression', raw, ['levelCap', 'xpBase', 'xpExponent', 'statPointsPerLevel', 'secondPartnerRiderLevel']);
  return raw as ProgressionData;
}

export interface RawData {
  elements: unknown; combat: unknown; statuses: unknown; progression: unknown; dragons: unknown;
  care: unknown; foods: unknown; items: unknown; enemies: unknown; zones: unknown;
  gear: unknown; talents: unknown; quests: unknown; shop: unknown; roost: unknown; events: unknown;
}

export function loadGameData(raw: RawData): GameData {
  const elements = validateElements(raw.elements);
  const combat = validateCombat(raw.combat);
  const progression = validateProgression(raw.progression);
  const statuses = raw.statuses as Record<StatusId, StatusData>;
  const elementIds = new Set<string>(elements.ids);

  for (const id of elements.ids) {
    if (!statuses[elements.info[id].status]) throw new DataError(`elements.info.${id}.status: unknown status`);
  }

  const enemyList = raw.enemies as EnemyData[];
  const enemies: Record<string, EnemyData> = {};
  const stats = ['hp', 'attack', 'power', 'defense', 'swift', 'dodge'];
  for (const e of enemyList) {
    if (enemies[e.id]) throw new DataError(`enemies: duplicate id "${e.id}"`);
    if (!elementIds.has(e.element)) throw new DataError(`enemies.${e.id}: unknown element "${e.element}"`);
    requireNumbers(`enemies.${e.id}.base`, e.base, stats);
    requireNumbers(`enemies.${e.id}.perLevel`, e.perLevel, stats);
    if (!Array.isArray(e.moves) || e.moves.length === 0) throw new DataError(`enemies.${e.id}: no moves`);
    for (const m of e.moves) {
      if (m.status && !statuses[m.status]) throw new DataError(`enemies.${e.id}.${m.id}: unknown status "${m.status}"`);
      if (m.buff && !statuses[m.buff]) throw new DataError(`enemies.${e.id}.${m.id}: unknown buff "${m.buff}"`);
      if (m.shiftTo && !elementIds.has(m.shiftTo)) throw new DataError(`enemies.${e.id}.${m.id}: unknown element`);
    }
    enemies[e.id] = e;
  }

  const items = raw.items as ItemData[];
  const itemIds = new Set(items.map((i) => i.id));
  const zones = raw.zones as ZoneData[];
  for (const z of zones) {
    for (const enc of z.encounters) {
      for (const id of enc.enemies) if (!enemies[id]) throw new DataError(`zones.${z.id}: unknown enemy "${id}"`);
    }
    if (!enemies[z.boss.enemy]) throw new DataError(`zones.${z.id}: unknown boss`);
    if (!enemies[z.miniBoss.enemy]) throw new DataError(`zones.${z.id}: unknown mini-boss`);
    for (const id of Object.keys(z.dropChances)) if (!itemIds.has(id)) throw new DataError(`zones.${z.id}: unknown drop "${id}"`);
  }
  const foodIds = new Set((raw.foods as { id: string }[]).map((f) => f.id));
  for (const id of Object.keys(progression.startingInventory)) {
    if (!itemIds.has(id) && !foodIds.has(id)) throw new DataError(`progression.startingInventory: unknown item "${id}"`);
  }

  const gear: Record<string, GearData> = {};
  for (const g of raw.gear as GearData[]) {
    if (gear[g.id]) throw new DataError(`gear: duplicate id "${g.id}"`);
    if (g.slot === 'weapon' && (typeof g.damage !== 'number' || !g.weaponType)) throw new DataError(`gear.${g.id}: weapons need damage and weaponType`);
    if (g.element && !elementIds.has(g.element)) throw new DataError(`gear.${g.id}: unknown element`);
    gear[g.id] = g;
  }

  const talents = raw.talents as TalentsData;
  const treeIds = new Set(talents.trees.map((t) => t.id));
  const talentIds = new Set<string>();
  for (const t of talents.talents) {
    if (talentIds.has(t.id)) throw new DataError(`talents: duplicate id "${t.id}"`);
    talentIds.add(t.id);
    if (!treeIds.has(t.tree)) throw new DataError(`talents.${t.id}: unknown tree`);
    if (t.skill?.status && !statuses[t.skill.status]) throw new DataError(`talents.${t.id}: unknown status`);
  }

  const quests: Record<string, QuestData> = {};
  for (const q of raw.quests as QuestData[]) {
    for (const step of q.steps) for (const id of step.enemies) if (!enemies[id]) throw new DataError(`quests.${q.id}: unknown enemy "${id}"`);
    quests[q.id] = q;
  }
  for (const st of (raw.dragons as GameData['dragons']).stages) {
    if (st.quest && !quests[st.quest]) throw new DataError(`dragons.stages.${st.id}: unknown quest`);
  }

  const shop = raw.shop as ShopData;
  for (const id of shop.stock) if (!gear[id]) throw new DataError(`shop.stock: unknown gear "${id}"`);
  for (const id of Object.keys(shop.items)) if (!itemIds.has(id)) throw new DataError(`shop.items: unknown item "${id}"`);
  for (const z of zones) {
    if (z.gate && !(raw.dragons as GameData['dragons']).stages.some((st) => st.id === z.gate!.stage)) throw new DataError(`zones.${z.id}: unknown gate stage`);
  }

  return {
    elements,
    combat,
    statuses,
    progression,
    dragons: raw.dragons as GameData['dragons'],
    care: raw.care as GameData['care'],
    foods: raw.foods as GameData['foods'],
    items,
    enemies,
    zones,
    gear,
    talents,
    quests,
    shop,
    roost: validateRoost(raw.roost, foodIds),
    events: validateEvents(raw.events, new Set([...foodIds, ...itemIds, ...Object.keys(gear)])),
  };
}

function validateEvents(raw: unknown, known: Set<string>): EventData[] {
  const list = raw as EventData[];
  for (const e of list) {
    if (!/^\d\d-\d\d$/.test(e.start) || !/^\d\d-\d\d$/.test(e.end)) throw new DataError(`events.${e.id}: dates must be MM-DD`);
    for (const id of [...e.shop, ...Object.keys(e.gift.items)]) if (!known.has(id)) throw new DataError(`events.${e.id}: unknown item "${id}"`);
  }
  return list;
}

function validateRoost(raw: unknown, foodIds: Set<string>): RoostData {
  const r = raw as RoostData;
  if (!r?.buildings?.nest || !Array.isArray(r.trips)) throw new DataError('roost: missing buildings or trips');
  if (!foodIds.has(r.premiumFood)) throw new DataError('roost.premiumFood: unknown food');
  for (const t of r.trips) requireNumbers(`roost.trips.${t.id}`, t, ['hours', 'minLevel', 'food', 'emberChance']);
  return r;
}

/** The game's data, validated once at startup. */
export const gameData: GameData = loadGameData({
  elements: elementsJson,
  combat: combatJson,
  statuses: statusesJson,
  progression: progressionJson,
  dragons: dragonsJson,
  care: careJson,
  foods: foodsJson,
  items: itemsJson,
  enemies: enemiesJson,
  zones: zonesJson,
  gear: gearJson,
  talents: talentsJson,
  quests: questsJson,
  shop: shopJson,
  roost: roostJson,
  events: eventsJson,
});
