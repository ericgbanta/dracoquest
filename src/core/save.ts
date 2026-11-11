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
import type { DragonState, ElementId, RiderState } from './types';

export const CURRENT_VERSION = 2;
export const SAVE_KEY = 'dracoquest.save';
const CODE_PREFIX = 'DQ1:'; // Code format, not save version. The save inside carries its own version.

export interface Settings {
  sound: boolean;
  fastBattles: boolean;
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
  stats: { fightsWon: number; fightsLost: number; runsCompleted: number };
  settings: Settings;
}

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
    stats: { fightsWon: 0, fightsLost: 0, runsCompleted: 0 },
    settings: { sound: false, fastBattles: false },
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
    || !isObject(rider.inventory)) fail('rider damaged');
  if (!Array.isArray(raw.dragons)) fail('dragons missing');
  for (const d of raw.dragons as unknown[]) {
    if (!isObject(d) || typeof d.id !== 'string' || typeof d.level !== 'number' || !isObject(d.stats)) fail('dragon damaged');
  }
  if (raw.activeDragonId !== null && typeof raw.activeDragonId !== 'string') fail('active dragon damaged');
  if (!isObject(raw.care) || typeof raw.care.day !== 'string') fail('care missing');
  if (!isObject(raw.bestiary)) fail('bestiary missing');
  if (raw.run !== null && !isObject(raw.run)) fail('run damaged');
  if (!Array.isArray(raw.bossesDefeated)) fail('bosses missing');
  if (!isObject(raw.stats)) fail('stats missing');
  if (!isObject(raw.settings)) fail('settings missing');
  const s = raw.settings as Record<string, unknown>;
  if (typeof s.sound !== 'boolean' || typeof s.fastBattles !== 'boolean') fail('settings damaged');
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

export function importSaveCode(code: string): SaveData {
  const trimmed = code.replace(/\s+/g, '');
  if (!trimmed.startsWith(CODE_PREFIX)) throw new SaveError('That is not a DracoQuest save code');
  let json: string;
  try {
    json = fromBase64(trimmed.slice(CODE_PREFIX.length));
  } catch {
    throw new SaveError('Save code is damaged');
  }
  return parseSave(json);
}

/** Load from storage, or start a new save if there is none. Throws SaveError on a damaged save. */
export function loadSave(storage: SaveStorage, now: number): SaveData {
  const json = storage.getItem(SAVE_KEY);
  if (json === null) return newSave(now);
  return parseSave(json);
}

export function writeSave(storage: SaveStorage, save: SaveData, now: number): SaveData {
  const stamped = { ...save, updatedAt: now };
  storage.setItem(SAVE_KEY, serializeSave(stamped));
  return stamped;
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
