import { describe, expect, it } from 'vitest';
import fixtureV1 from './fixtures/save-v1.json';
import { gameData } from '../src/core/data';
import {
  CURRENT_VERSION,
  SAVE_KEY,
  SaveError,
  exportSaveCode,
  importSaveCode,
  loadSave,
  memoryStorage,
  migrate,
  newSave,
  parseSave,
  writeSave,
  type Migration,
} from '../src/core/save';

const NOW = 1794355200000;

describe('save', () => {
  it('creates a new save at the current version', () => {
    const s = newSave(NOW);
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.settings.sound).toBe(false);
  });

  it('loads a new save when storage is empty', () => {
    const s = loadSave(memoryStorage(), NOW);
    expect(s).toEqual(newSave(NOW));
  });

  it('survives a write and reload', () => {
    const storage = memoryStorage();
    const s = newSave(NOW);
    s.rider.name = 'Ash';
    writeSave(storage, s, NOW + 1000);
    const loaded = loadSave(storage, NOW + 5000);
    expect(loaded.rider.name).toBe('Ash');
    expect(loaded.updatedAt).toBe(NOW + 1000);
  });

  it('migrates the version 1 fixture to the current version', () => {
    const s = parseSave(JSON.stringify(fixtureV1));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Keeper');
    expect(s.rider.level).toBe(1);
    expect(s.rider.inventory).toEqual(gameData.progression.startingInventory);
    expect(s.dragons).toEqual([]);
    expect(s.egg).toBeNull();
    expect(s.run).toBeNull();
    expect(s.settings.fastBattles).toBe(true);
    expect(s.seed).toBe(123456789);
    expect(s.createdAt).toBe(fixtureV1.createdAt);
  });

  it('migrates a version 1 save with a missing name to the default', () => {
    const s = parseSave(JSON.stringify({ ...fixtureV1, rider: {} }));
    expect(s.rider.name).toBe('Keeper');
  });

  it('round-trips through an export code, including Unicode names', () => {
    const s = newSave(NOW);
    s.rider.name = 'Émber 🐉';
    const code = exportSaveCode(s);
    expect(code.startsWith('DQ1:')).toBe(true);
    expect(importSaveCode(code)).toEqual(s);
  });

  it('accepts a code with stray whitespace from copy and paste', () => {
    const code = exportSaveCode(newSave(NOW));
    const messy = `  ${code.slice(0, 10)}\n${code.slice(10)}  `;
    expect(importSaveCode(messy)).toEqual(newSave(NOW));
  });

  it('rejects bad codes and damaged saves', () => {
    expect(() => importSaveCode('hello')).toThrow(SaveError);
    expect(() => importSaveCode('DQ1:!!!not-base64')).toThrow(SaveError);
    expect(() => parseSave('{not json')).toThrow(SaveError);
    expect(() => parseSave('{"version":2}')).toThrow(SaveError);
    expect(() => parseSave('{"rider":{}}')).toThrow(/version/);
    expect(() => parseSave(JSON.stringify({ ...fixtureV1, version: 999 }))).toThrow(/newer/);
  });

  it('throws on a damaged save in storage instead of overwriting it', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{"version":2,"oops":true}');
    expect(() => loadSave(storage, NOW)).toThrow(SaveError);
    expect(storage.getItem(SAVE_KEY)).toBe('{"version":2,"oops":true}');
  });

  it('runs migrations in order up to the target version', () => {
    const migrations: Record<number, Migration> = {
      1: (s) => ({ ...s, gold: 0 }),
      2: (s) => ({ ...s, gold: (s.gold as number) + 10 }),
    };
    const out = migrate({ version: 1 }, migrations, 3);
    expect(out).toEqual({ version: 3, gold: 10 });
  });

  it('fails clearly when a migration step is missing', () => {
    expect(() => migrate({ version: 1 }, {}, 2)).toThrow(/No migration from version 1/);
  });
});
