import { describe, expect, it } from 'vitest';
import { createRng, seedFromString } from '../src/core/rng';

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gives different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it('matches a known sequence for seed 42 (guards against accidental changes)', () => {
    const r = createRng(42);
    const values = Array.from({ length: 3 }, () => r.next().toFixed(8));
    expect(values).toMatchInlineSnapshot(`
      [
        "0.60110375",
        "0.44829056",
        "0.85246579",
      ]
    `);
  });

  it('keeps next() in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() covers the inclusive range and nothing outside it', () => {
    const r = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(() => r.int(5, 1)).toThrow(RangeError);
  });

  it('chance() is roughly fair', () => {
    const r = createRng(2026);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (r.chance(0.3)) hits++;
    expect(hits / 10_000).toBeGreaterThan(0.28);
    expect(hits / 10_000).toBeLessThan(0.32);
  });

  it('pick() returns array items and rejects empty arrays', () => {
    const r = createRng(5);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(r.pick(items));
    expect(() => r.pick([])).toThrow(RangeError);
  });

  it('resumes from a saved state', () => {
    const r = createRng(1234);
    r.next();
    r.next();
    const resumed = createRng(r.getState());
    expect(resumed.next()).toEqual(r.next());
  });

  it('seedFromString is stable', () => {
    expect(seedFromString('dragon')).toEqual(seedFromString('dragon'));
    expect(seedFromString('dragon')).not.toEqual(seedFromString('dragons'));
  });
});
