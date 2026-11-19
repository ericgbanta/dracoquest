import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import { createBattle } from '../src/core/battle';
import type { ElementId } from '../src/core/types';
import spellFx from '../src/data/spellFx.json';
import assets from '../src/art/assets.json';
import { classify, enemyLook, orbLook, spellArtFor, spellLook } from '../src/ui/stage/director';

const STYLES = ['bolt', 'lance', 'rise', 'fall', 'strike', 'wave', 'self'];
const spells = data.combat.riderMoves.spells;
const fx = spellFx.spells as Record<string, { style: string; size: number; long?: boolean; hold?: boolean; finish?: { anchor: string; size: number } }>;
const T = spellFx.timing;
const file = (pattern: string, id: string) => `src/art/${pattern.replace('{id}', id)}`;

describe('spell effects data', () => {
  it('every rider spell has an effect with a known style, and no entry is left over', () => {
    expect(Object.keys(fx).sort()).toEqual(spells.map((s) => s.id).sort());
    for (const s of spells) {
      expect(STYLES, s.id).toContain(fx[s.id]!.style);
      expect(fx[s.id]!.size, s.id).toBeGreaterThan(0.05);
      expect(fx[s.id]!.size, s.id).toBeLessThan(0.6);
      // Spells cast on the party play on their target; damage spells never do.
      expect(fx[s.id]!.style === 'self', s.id).toBe(s.kind !== 'damage');
    }
  });

  it('every effect has its painted file, and the late spells their second piece', () => {
    for (const s of spells) {
      expect(existsSync(file(assets.effects.spell, s.id)), s.id).toBe(true);
      if (fx[s.id]!.finish) expect(existsSync(file(assets.effects.finish, s.id)), `finish ${s.id}`).toBe(true);
    }
    for (const piece of ['orb', 'cast', 'hit'] as const) expect(existsSync(`src/art/${assets.effects[piece]}`), piece).toBe(true);
  });

  it('the five late spells are the long ones with a finish', () => {
    const long = spells.filter((s) => fx[s.id]!.long).map((s) => s.id);
    expect(long).toEqual(['tempest', 'inferno', 'astral-nova', 'daybreak', 'eventide']);
    for (const id of long) expect(['center', 'feet']).toContain(fx[id]!.finish!.anchor);
    expect(spells.filter((s) => fx[s.id]!.finish && !fx[s.id]!.long)).toEqual([]);
    expect(Math.min(...long.map((id) => spells.find((s) => s.id === id)!.level))).toBeGreaterThanOrEqual(50);
  });

  it('a normal spell lands within 450 ms and a long one within about 700', () => {
    const toImpact = (style: string) => T.cast + (style === 'rise' ? T.rise.grow * 0.6 : style === 'strike' ? T.strike.grow : (T as unknown as Record<string, { travel: number }>)[style]!.travel);
    for (const s of spells.filter((x) => x.kind === 'damage')) {
      const ms = toImpact(fx[s.id]!.style) * (fx[s.id]!.long ? T.longFactor : 1);
      expect(ms, s.id).toBeLessThanOrEqual(fx[s.id]!.long ? 720 : 450);
    }
  });

  it('every element borrows a damage spell of that element for enemy specials', () => {
    expect(Object.keys(spellFx.elements).sort()).toEqual([...data.elements.ids].sort());
    for (const [el, id] of Object.entries(spellFx.elements)) {
      const s = spells.find((x) => x.id === id)!;
      expect(s.kind, el).toBe('damage');
      expect(s.element, el).toBe(el);
      expect(fx[id]!.long, el).toBeUndefined();
    }
  });
});

describe('which effect a move uses', () => {
  it('a rider spell uses its own art, tone and extras', () => {
    expect(spellLook(data, 'ember-lance')).toEqual({ style: 'lance', art: 'spell-ember-lance', size: fx['ember-lance']!.size, tone: 'fire', long: false, hold: false });
    expect(spellLook(data, 'arc-bolt')!.tone).toBe('arcane');
    expect(spellLook(data, 'inferno')).toMatchObject({ long: true, finish: { art: 'finish-inferno', anchor: 'feet' } });
    expect(spellLook(data, 'bright-ward')).toMatchObject({ style: 'self', hold: true });
    expect(spellLook(data, 'no-such-spell')).toBeNull();
  });

  it('a magic weapon throws an orb in its element, or arcane', () => {
    expect(orbLook('tide')).toMatchObject({ art: 'orb-tide', tone: 'tide', style: 'bolt' });
    expect(orbLook(null)).toMatchObject({ art: 'orb-arcane', tone: 'arcane' });
  });

  it('an enemy special borrows its element\'s effect; plain attacks and body blows stay a lunge', () => {
    const thornling = data.enemies['thornling']!;
    const says = (move: string) => `Thornling's ${move} hits Mira for 5.`;
    const plain = thornling.moves.find((m) => m.physical)!;
    const special = thornling.moves.find((m) => !m.physical && m.power && !spellFx.enemyMelee.includes(m.name.toLowerCase().split(' ').pop()!))!;
    expect(enemyLook(data, 'thornling', says(plain.name), 'verdant')).toBeNull();
    expect(enemyLook(data, 'thornling', says(special.name), 'verdant')).toEqual({ style: 'rise', art: 'spell-thorn-snare', size: fx['thorn-snare']!.size, tone: 'verdant' });
    // A hybrid's special uses the element the hit reports.
    expect(enemyLook(data, 'thornling', says(special.name), 'fire')!.art).toBe('spell-ember-lance');
    expect(enemyLook(data, 'thornling', says(special.name), null)).toBeNull();
    // Every enemy: a special whose name ends in a body-blow word is never thrown.
    for (const e of Object.values(data.enemies)) {
      for (const m of e.moves) {
        const last = m.name.toLowerCase().split(/[^a-z]+/).filter(Boolean).pop()!;
        if (spellFx.enemyMelee.includes(last)) expect(enemyLook(data, e.id, `${e.name}'s ${m.name} hits Mira for 5.`, e.element), `${e.id} ${m.name}`).toBeNull();
      }
    }
  });

  it('a fight loads the loadout\'s art, the enemies\' elements and their tones', () => {
    const state = { spells: ['arc-bolt', 'mend', 'inferno'], weapon: { name: 'x', damage: 1, element: 'tide' as ElementId, type: 'magic' as const }, enemies: [{ element: 'verdant' as ElementId, element2: 'stone' as ElementId, enemyId: 'thornling' }] };
    const got = spellArtFor(data, state as unknown as ReturnType<typeof createBattle>);
    expect(got.spells).toEqual(['arc-bolt', 'inferno', 'mend', 'shale-spike', 'thorn-snare']);
    expect(got.tones).toEqual(['arcane', 'fire', 'stone', 'tide', 'verdant']);
  });

  it('still classifies a spell hit as a spell', () => {
    const state = { mode: 'foot', weapon: { type: 'melee' } } as unknown as ReturnType<typeof createBattle>;
    expect(classify(data, state, { actor: 'rider', text: 'Mira\'s Ember Lance hits the Thornling for 30.' })).toBe('spell');
  });
});
