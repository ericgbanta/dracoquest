/**
 * Versioned save data. The save is one JSON object with a `version` field.
 * Loading always runs migrations up to CURRENT_VERSION.
 *
 * This module is pure: storage goes through the SaveStorage interface,
 * which the UI backs with localStorage.
 */
import { seedFromString } from './rng';

export const CURRENT_VERSION = 1;
export const SAVE_KEY = 'dracoquest.save';
const CODE_PREFIX = 'DQ1:';

export interface Settings {
  sound: boolean;
  fastBattles: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  /** Seed for the game's RNG. */
  seed: number;
  rider: { name: string };
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

/** Index N holds the migration from version N to N + 1. Version 1 is the first, so none yet. */
export const MIGRATIONS: Record<number, Migration> = {};

export function newSave(now: number): SaveData {
  return {
    version: CURRENT_VERSION,
    createdAt: now,
    updatedAt: now,
    seed: seedFromString(`dracoquest-${now}`),
    rider: { name: 'Keeper' },
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
  for (const key of ['createdAt', 'updatedAt', 'seed']) {
    if (typeof raw[key] !== 'number') fail(`${key} missing`);
  }
  if (!isObject(raw.rider) || typeof raw.rider.name !== 'string') fail('rider missing');
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
