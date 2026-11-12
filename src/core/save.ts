/**
 * Versioned save data. The save is one JSON object with a `version` field.
 * Loading always runs migrations up to CURRENT_VERSION.
 *
 * This module is pure: storage goes through the SaveStorage interface,
 * which the UI backs with localStorage.
 */
import { seedFromString } from './rng';
import { gameData } from './data';
import { newRider } from './characters';
import { freshCareDay, type CareDay } from './care';
import type { RunState } from './run';
import { newRoost, type RoostState } from './roost';
import { defaultLoadout } from './spells';
import type { DragonState, ElementId, RiderState } from './types';

export const CURRENT_VERSION = 9;
export const SAVE_KEY = 'dracoquest.save';
const CODE_PREFIX = 'DQ1:'; // Code format, not save version. The save inside carries its own version.

export interface Settings {
  sound: boolean;
  fastBattles: boolean;
  /** Draw battles as the old cards instead of the side-view stage. */
  simpleBattle: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  /** Current state of the game's RNG. Every random roll outside a battle advances it. */
  seed: number;
  rider: RiderState;
  dragons: DragonState[];
  activeDragonId: string | null;
  /** The egg picked in the tutorial, before it hatches. */
  egg: { element: ElementId; warmth: number } | null;
  care: CareDay;
  /** Fights left on the Well kept XP buff. */
  wellKeptFights: number;
  /** Enemy id → how many times fought and defeated. Weaknesses show after the first fight. */
  bestiary: Record<string, { fought: number; defeated: number }>;
  run: RunState | null;
  bossesDefeated: string[];
  /** Eggs from bosses, waiting for the Hatchery. */
  eggs: ElementId[];
  questsDone: string[];
  /** Rare currency from bosses and daily care streaks. */
  embers: number;
  /** The second battle partner (rider level 25+). */
  secondDragonId: string | null;
  roost: RoostState;
  /** Days in a row with all care done. */
  careStreak: { count: number; lastDay: string };
  /** Seasonal event gifts already claimed, as "eventId-year". */
  eventsClaimed: string[];
  stats: { fightsWon: number; fightsLost: number; runsCompleted: number };
  settings: Settings;
  /** Story quest id → the option picked at its choice. Finished story quests are in questsDone. */
  storyChoices: Record<string, string>;
  /** Today's bounty board: progress per "zone:bounty" key, and which were claimed. Resets when the day changes. */
  bounties: BountyState;
}

export interface BountyState { day: string; progress: Record<string, number>; claimed: string[] }

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveError extends Error {}

/** A migration takes a save at version N and returns it at version N + 1. */
export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** Index N holds the migration from version N to N + 1. */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 (Phase 0) had only a rider name and settings. v2 adds the full rider, dragons, care, and runs.
  1: (save) => {
    const oldRider = (save.rider ?? {}) as { name?: unknown };
    const name = typeof oldRider.name === 'string' && oldRider.name ? oldRider.name : 'Keeper';
    return {
      ...save,
      rider: newRider(gameData, name),
      dragons: [],
      activeDragonId: null,
      egg: null,
      care: freshCareDay(''),
      wellKeptFights: 0,
      bestiary: {},
      run: null,
      bossesDefeated: [],
      stats: { fightsWon: 0, fightsLost: 0, runsCompleted: 0 },
    };
  },
  // v2 (Phase 1) → v3 adds gear, talents, eggs, quests, and food in the bag (food was free before).
  2: (save) => {
    const rider = (save.rider ?? {}) as Record<string, unknown>;
    const inventory = { ...((rider.inventory as Record<string, number>) ?? {}) };
    inventory['river-trout'] = (inventory['river-trout'] ?? 0) + 3;
    inventory['sweetroot'] = (inventory['sweetroot'] ?? 0) + 3;
    const dragons = ((save.dragons as Record<string, unknown>[]) ?? []).map((d) => ({
      ...d, talents: {}, freeRespecsUsed: 0, equipment: {},
    }));
    // A v2 run has no weapon data in its battle, so drop an unfinished run. Rewards were already banked.
    return {
      ...save,
      rider: { ...rider, inventory, gear: ['ash-blade', 'padded-vest'], equipment: { weapon: 'ash-blade', armor: 'padded-vest' } },
      dragons,
      run: null,
      eggs: [],
      questsDone: [],
    };
  },
  // v3 (Phase 2) → v4 adds the Roost: buildings, embers, a second partner, per-dragon care, and temperament.
  3: (save) => {
    const care = (save.care ?? {}) as { day?: string; meals?: number; groomed?: boolean; rested?: boolean; wellKeptGiven?: boolean };
    const day = typeof care.day === 'string' ? care.day : '';
    const dragons = ((save.dragons as Record<string, unknown>[]) ?? []).map((d) => ({
      ...d,
      // Today's meals and grooming move onto the lead dragon, who was the only one cared for.
      care: d.id === save.activeDragonId ? { day, meals: care.meals ?? 0, groomed: !!care.groomed } : { day: '', meals: 0, groomed: false },
      assignment: { kind: 'idle' },
      temper: { bold: 0, gentle: 0, clever: 0, proud: 0 },
    }));
    return {
      ...save,
      dragons,
      care: { day, rested: !!care.rested, wellKeptGiven: !!care.wellKeptGiven },
      embers: 0,
      secondDragonId: null,
      roost: newRoost(typeof save.updatedAt === 'number' ? save.updatedAt : 0),
      careStreak: { count: 0, lastDay: '' },
    };
  },
  // v4 (Phase 3) → v5 adds egg laying for Elders and seasonal event gifts.
  4: (save) => ({
    ...save,
    dragons: ((save.dragons as Record<string, unknown>[]) ?? []).map((d) => ({ ...d, laidEgg: false })),
    eventsClaimed: [],
  }),
  // v5 → v6 adds the Simple battle setting (the card layout instead of the battle stage).
  5: (save) => ({
    ...save,
    settings: { ...(save.settings as Record<string, unknown>), simpleBattle: false },
  }),
  // v6 → v7 adds rider spells: a loadout of the first spells the rider's level has learned.
  // A battle in progress keeps the two spells every rider had before.
  6: (save) => {
    const rider = (save.rider ?? {}) as Record<string, unknown>;
    const level = typeof rider.level === 'number' ? rider.level : 1;
    const run = save.run as Record<string, unknown> | null | undefined;
    const battle = run?.battle as Record<string, unknown> | null | undefined;
    return {
      ...save,
      rider: { ...rider, spells: defaultLoadout(gameData, level) },
      run: run && battle ? { ...run, battle: { ...battle, spells: defaultLoadout(gameData, 1) } } : run ?? null,
    };
  },
  // v7 → v8 adds the Forge: materials and gear upgrades on the rider, and the Forge's building level.
  7: (save) => {
    const rider = (save.rider ?? {}) as Record<string, unknown>;
    const roost = (save.roost ?? {}) as Record<string, unknown>;
    const levels = (roost.levels ?? {}) as Record<string, unknown>;
    return {
      ...save,
      rider: { ...rider, materials: {}, upgrades: {} },
      roost: { ...roost, levels: { ...levels, forge: 0 } },
    };
  },
  // v8 → v9 adds story quest choices and the daily bounty board.
  8: (save) => ({ ...save, storyChoices: {}, bounties: { day: '', progress: {}, claimed: [] } }),
};

export function newSave(now: number): SaveData {
  return {
    version: CURRENT_VERSION,
    createdAt: now,
    updatedAt: now,
    seed: seedFromString(`dracoquest-${now}`),
    rider: newRider(gameData, 'Keeper'),
    dragons: [],
    activeDragonId: null,
    egg: null,
    care: freshCareDay(''),
    wellKeptFights: 0,
    bestiary: {},
    run: null,
    bossesDefeated: [],
    eggs: [],
    questsDone: [],
    embers: 0,
    secondDragonId: null,
    roost: newRoost(now),
    careStreak: { count: 0, lastDay: '' },
    eventsClaimed: [],
    stats: { fightsWon: 0, fightsLost: 0, runsCompleted: 0 },
    settings: { sound: false, fastBattles: false, simpleBattle: false },
    storyChoices: {},
    bounties: { day: '', progress: {}, claimed: [] },
  };
}

export function migrate(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  target: number = CURRENT_VERSION,
): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SaveError('Save is not an object');
  }
  let save = { ...(raw as Record<string, unknown>) };
  let version = save.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('Save has no valid version');
  }
  if (version > target) {
    throw new SaveError(`Save is from a newer version (${version}) than this game (${target})`);
  }
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new SaveError(`No migration from version ${version}`);
    save = step(save);
    version += 1;
    save.version = version;
  }
  return save;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Checks a migrated save has the current shape. */
export function validateSave(raw: Record<string, unknown>): SaveData {
  const fail = (msg: string): never => {
    throw new SaveError(`Save is damaged: ${msg}`);
  };
  if (raw.version !== CURRENT_VERSION) fail('wrong version');
  for (const key of ['createdAt', 'updatedAt', 'seed', 'wellKeptFights']) {
    if (typeof raw[key] !== 'number') fail(`${key} missing`);
  }
  const rider = raw.rider;
  if (!isObject(rider) || typeof rider.name !== 'string' || typeof rider.level !== 'number' || !isObject(rider.stats)
    || !isObject(rider.inventory) || !Array.isArray(rider.gear) || !isObject(rider.equipment)
    || !Array.isArray(rider.spells) || !(rider.spells as unknown[]).every((x) => typeof x === 'string')
    || !isObject(rider.materials) || !isObject(rider.upgrades)) fail('rider damaged');
  if (!Array.isArray(raw.dragons)) fail('dragons missing');
  for (const d of raw.dragons as unknown[]) {
    if (!isObject(d) || typeof d.id !== 'string' || typeof d.level !== 'number' || !isObject(d.stats)
      || !isObject(d.talents) || !isObject(d.equipment) || !isObject(d.care) || !isObject(d.assignment) || !isObject(d.temper)) fail('dragon damaged');
  }
  if (raw.activeDragonId !== null && typeof raw.activeDragonId !== 'string') fail('active dragon damaged');
  if (!isObject(raw.care) || typeof raw.care.day !== 'string') fail('care missing');
  if (!isObject(raw.bestiary)) fail('bestiary missing');
  if (raw.run !== null && !isObject(raw.run)) fail('run damaged');
  if (!Array.isArray(raw.bossesDefeated)) fail('bosses missing');
  if (!Array.isArray(raw.eggs) || !Array.isArray(raw.questsDone)) fail('eggs or quests missing');
  if (typeof raw.embers !== 'number' || !isObject(raw.roost) || !isObject(raw.careStreak)) fail('roost missing');
  if (!isObject((raw.roost as Record<string, unknown>).levels) || typeof ((raw.roost as Record<string, unknown>).levels as Record<string, unknown>).forge !== 'number') fail('roost damaged');
  if (raw.secondDragonId !== null && typeof raw.secondDragonId !== 'string') fail('second partner damaged');
  if (!Array.isArray(raw.eventsClaimed)) fail('events missing');
  for (const d of raw.dragons as Record<string, unknown>[]) if (typeof d.laidEgg !== 'boolean') fail('dragon damaged');
  if (!isObject(raw.stats)) fail('stats missing');
  if (!isObject(raw.settings)) fail('settings missing');
  const b = raw.bounties as Record<string, unknown> | undefined;
  if (!isObject(raw.storyChoices) || !isObject(b) || typeof b.day !== 'string' || !isObject(b.progress) || !Array.isArray(b.claimed)) fail('adventures missing');
  const s = raw.settings as Record<string, unknown>;
  if (typeof s.sound !== 'boolean' || typeof s.fastBattles !== 'boolean' || typeof s.simpleBattle !== 'boolean') fail('settings damaged');
  return raw as unknown as SaveData;
}

/** Parse a JSON save string of any supported version. */
export function parseSave(json: string): SaveData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new SaveError('Save is not valid JSON');
  }
  return validateSave(migrate(raw));
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

// Base64 that handles any Unicode (rider names can have emoji).
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** Export code: a prefixed base64 string the player can copy. */
export function exportSaveCode(save: SaveData): string {
  return CODE_PREFIX + toBase64(serializeSave(save));
}

// Characters a phone can slip into copied text without showing them.
const INVISIBLE = /[\u200b-\u200f\u2060\ufeff]/g;
const BASE64 = /^[A-Za-z0-9+/]+=*$/;

function decodeCode(body: string): SaveData {
  let json: string;
  try {
    json = fromBase64(body);
    JSON.parse(json);
  } catch {
    throw new SaveError('Save code is damaged or cut short. Copy the whole code and try again.');
  }
  return parseSave(json);
}

/**
 * Reads a save code. Forgiving about how it was copied: spaces and line breaks anywhere,
 * a code inside a longer message, a "dq1:" start in small letters, or a code missing its "DQ1:" start (an iPhone treats
 * the colon as a word break, so selecting the code by tapping it can leave the start off).
 */
export function importSaveCode(code: string): SaveData {
  const text = code.replace(INVISIBLE, '');
  const compact = text.replace(/\s+/g, '');
  const tries: string[] = [];
  // The start can come back as "dq1:" (autocorrect or a notes app). Only the start is safe to
  // match in any case: the rest is base64, where capitals matter.
  if (compact.toUpperCase().startsWith(CODE_PREFIX)) tries.push(compact.slice(CODE_PREFIX.length));
  const inside = text.match(/DQ1:\s*([A-Za-z0-9+/]+=*)/i);
  if (inside?.[1]) tries.push(inside[1]);
  if (BASE64.test(compact) && compact.length >= 20) tries.push(compact);
  if (tries.length === 0) throw new SaveError('That is not a DracoQuest save code');
  let first: unknown;
  for (const body of new Set(tries)) {
    try {
      return decodeCode(body);
    } catch (err) {
      first ??= err;
    }
  }
  throw first;
}

/** How many saved games one device can hold. */
export const SLOT_COUNT = 3;
/** Which slot is in play. Kept outside the save so the save's shape never changes. */
export const ACTIVE_SLOT_KEY = 'dracoquest.slot';

/**
 * Storage key for a slot. Slot 1 keeps the original key, so a save made
 * before slots existed is slot 1 and is never moved or rewritten.
 */
export function slotKey(slot: number): string {
  return slot === 1 ? SAVE_KEY : `${SAVE_KEY}.${slot}`;
}

function isSlot(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT;
}

/** The slot in play. Anything missing or unreadable means slot 1. */
export function readActiveSlot(storage: SaveStorage): number {
  const n = Number(storage.getItem(ACTIVE_SLOT_KEY));
  return isSlot(n) ? n : 1;
}

export function writeActiveSlot(storage: SaveStorage, slot: number): void {
  if (!isSlot(slot)) throw new SaveError(`There is no save slot ${slot}`);
  storage.setItem(ACTIVE_SLOT_KEY, String(slot));
}

/** Load from storage, or start a new save if there is none. Throws SaveError on a damaged save. */
export function loadSave(storage: SaveStorage, now: number, slot = 1): SaveData {
  const json = storage.getItem(slotKey(slot));
  if (json === null) return newSave(now);
  return parseSave(json);
}

export function writeSave(storage: SaveStorage, save: SaveData, now: number, slot = 1): SaveData {
  const stamped = { ...save, updatedAt: now };
  storage.setItem(slotKey(slot), serializeSave(stamped));
  return stamped;
}

/** What the saved games list shows for one slot. */
export type SlotSummary =
  | { slot: number; state: 'empty' }
  | { slot: number; state: 'damaged'; error: string }
  | {
    slot: number;
    state: 'ok';
    riderName: string;
    riderLevel: number;
    /** The lead dragon, or null before the first egg hatches. */
    dragon: { name: string; element: ElementId; stage: string; level: number } | null;
    dragonCount: number;
    updatedAt: number;
  };

/** Reads a slot for the list without changing what is stored. */
export function slotSummary(storage: SaveStorage, slot: number): SlotSummary {
  const json = storage.getItem(slotKey(slot));
  if (json === null) return { slot, state: 'empty' };
  let save: SaveData;
  try {
    save = parseSave(json);
  } catch (err) {
    return { slot, state: 'damaged', error: err instanceof SaveError ? err.message : 'Unknown error' };
  }
  const lead = save.dragons.find((d) => d.id === save.activeDragonId) ?? save.dragons[0] ?? null;
  const stageName = (id: string) => gameData.dragons.stages.find((st) => st.id === id)?.name ?? id;
  return {
    slot,
    state: 'ok',
    riderName: save.rider.name,
    riderLevel: save.rider.level,
    dragon: lead ? { name: lead.name, element: lead.element, stage: stageName(lead.stage), level: lead.level } : null,
    dragonCount: save.dragons.length,
    updatedAt: save.updatedAt,
  };
}

export function listSlots(storage: SaveStorage): SlotSummary[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => slotSummary(storage, i + 1));
}

/** Deletes one slot's save. The slot in play cannot be deleted; start a new save in it instead. */
export function deleteSlot(storage: SaveStorage, slot: number): void {
  if (!isSlot(slot)) throw new SaveError(`There is no save slot ${slot}`);
  if (slot === readActiveSlot(storage)) throw new SaveError('That save is in play. Switch to another slot first.');
  storage.removeItem(slotKey(slot));
}

/** In-memory storage for tests and for browsers with storage blocked. */
export function memoryStorage(): SaveStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
