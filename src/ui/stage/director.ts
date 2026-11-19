import layout from '../../data/stage.json';
import type { BattleEvent, BattleState } from '../../core/battle';
import type { GameData } from '../../core/data';
import spellFx from '../../data/spellFx.json';
import type { ElementId } from '../../core/types';
import { act, breath, cast, castStart, claw, finale, hasSpellArt, jitter, lungeAt, particles, popNumber, riderAttack, ring, selfCast, shoot, together, type HitInfo, type SpellLook, type SpellStyle } from './choreo';

/**
 * Turns one engine event into a move on the stage and resolves when the
 * next event may start. The engine is untouched: hit events only say who hit
 * whom, so the move is worked out from the move's name in the event text.
 */

export type Move = 'slash' | 'arrow' | 'spell' | 'claw' | 'breath' | 'dive' | 'combo' | 'duo' | 'lunge';

export interface DirectorOpts {
  fast: boolean;
  reduced: boolean;
  /** Apply the event to the HP shown on screen. Called at the moment of impact. */
  onImpact(): void;
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const E = layout.beats.eventMs;

const mentions = (text: string, label: string) => text.includes(`'s ${label} `);

/** Which move a hit or miss event is, from the actor and the move name in its text. */
export function classify(data: GameData, state: BattleState, ev: { actor: string; text: string }): Move {
  const c = data.combat;
  const comboHit = c.combos.some((x) => mentions(ev.text, x.name));
  const duoHit = data.roost.duoCombos.some((x) => mentions(ev.text, x.name));
  if (duoHit) return 'duo';
  if (comboHit) return 'combo';
  if (ev.actor === 'rider') {
    if (state.mode === 'ride') {
      const move = c.ride.moves.find((m) => mentions(ev.text, m.name));
      return move?.kind === 'breath' ? 'breath' : 'dive';
    }
    if (c.riderMoves.spells.some((s) => mentions(ev.text, s.name))) return 'spell';
    return state.weapon.type === 'ranged' ? 'arrow' : state.weapon.type === 'magic' ? 'spell' : 'slash';
  }
  if (ev.actor === 'dragon' || ev.actor === 'dragon2' || ev.actor === 'dragon3') {
    if (mentions(ev.text, c.dragonMoves.breath.name)) return 'breath';
    if (mentions(ev.text, c.dragonMoves.claw.name)) return 'claw';
    // A talent skill: elemental ones are breathed, the rest are claws.
    const talent = data.talents.talents.find((t) => t.skill && mentions(ev.text, t.name));
    return talent?.skill?.element === 'dragon' ? 'breath' : 'claw';
  }
  return 'lunge';
}

const ORB = '#c9a8ff';

/** Orb color for a rider spell or magic weapon: the spell's element, else the weapon's, else violet. */
export function spellColor(data: GameData, state: BattleState, text: string): string {
  const spell = data.combat.riderMoves.spells.find((s) => mentions(text, s.name));
  const el = spell ? spell.element : state.weapon.element;
  return el ? data.elements.info[el].color : ORB;
}

type SpellFxEntry = { style: string; size: number; long?: boolean; hold?: boolean; finish?: { anchor: string; size: number } };
const FX = spellFx.spells as Record<string, SpellFxEntry>;

/** How a rider spell looks on the stage (src/data/spellFx.json), or null for a spell with no entry. */
export function spellLook(data: GameData, spellId: string): SpellLook | null {
  const fx = FX[spellId];
  const spell = data.combat.riderMoves.spells.find((s) => s.id === spellId);
  if (!fx || !spell) return null;
  return {
    style: fx.style as SpellStyle, art: `spell-${spellId}`, size: fx.size, tone: spell.element ?? 'arcane', long: !!fx.long, hold: !!fx.hold,
    ...(fx.finish ? { finish: { art: `finish-${spellId}`, anchor: fx.finish.anchor as 'center' | 'feet', size: fx.finish.size } } : {}),
  };
}

/** A magic weapon's plain attack: a painted orb in the weapon's element. */
export function orbLook(element: ElementId | null): SpellLook {
  const tone = element ?? 'arcane';
  return { style: spellFx.orb.style as SpellStyle, art: `orb-${tone}`, size: spellFx.orb.size, tone };
}

/**
 * How an enemy's move looks when it is a special move with an element: the effect of that element's
 * spell, without the late spells' extras. Null for plain attacks and for moves that are clearly a
 * body blow (a bite, a slam), which stay a lunge.
 */
export function enemyLook(data: GameData, enemyId: string | undefined, text: string, element: ElementId | null | undefined): SpellLook | null {
  const move = data.enemies[enemyId ?? '']?.moves.find((m) => mentions(text, m.name));
  if (!move || move.physical || !element) return null;
  const last = move.name.toLowerCase().split(/[^a-z]+/).filter(Boolean).pop() ?? '';
  if ((spellFx.enemyMelee as string[]).includes(last)) return null;
  const id = (spellFx.elements as Record<string, string>)[element];
  const look = id ? spellLook(data, id) : null;
  return look ? { style: look.style, art: look.art, size: look.size, tone: element } : null;
}

/** Every piece of spell art a fight can show: the loadout's spells and the spells enemy elements borrow, and the tones to tint the flare, orb and hit burst. */
export function spellArtFor(data: GameData, state: BattleState): { spells: string[]; tones: string[] } {
  const spells = new Set<string>(state.spells.filter((id) => FX[id]));
  const tones = new Set<string>(['arcane']);
  for (const id of state.spells) {
    const el = data.combat.riderMoves.spells.find((s) => s.id === id)?.element;
    if (el) tones.add(el);
  }
  if (state.weapon.element) tones.add(state.weapon.element);
  const enemyElements = new Set<ElementId>();
  for (const e of state.enemies) {
    if (e.element) enemyElements.add(e.element);
    if (e.element2) enemyElements.add(e.element2);
    for (const m of data.enemies[e.enemyId ?? '']?.moves ?? []) {
      if (m.shiftTo) enemyElements.add(m.shiftTo);
      if (m.shiftTo2) enemyElements.add(m.shiftTo2);
    }
  }
  for (const el of enemyElements) {
    tones.add(el);
    const id = (spellFx.elements as Record<string, string>)[el];
    if (id) spells.add(id);
  }
  return { spells: [...spells].sort(), tones: [...tones].sort() };
}

/** The spell the rider just cast on the party; its effect plays when the heal or the ward lands. */
let pendingSelf: SpellLook | null = null;

/** Play one event on the stage. Resolves when the next event may start. */
export async function direct(stage: HTMLElement, data: GameData, state: BattleState, ev: BattleEvent, opts: DirectorOpts): Promise<void> {
  const k = opts.fast ? layout.fastFactor : 1;
  const o = { fast: opts.fast, reduced: opts.reduced };
  const landing = pendingSelf;
  pendingSelf = null;
  switch (ev.t) {
    case 'hit':
    case 'miss': {
      const move = classify(data, state, ev);
      const enemy = state.enemies.find((x) => x.id === ev.actor);
      const big = enemy ? state.intents[enemy.id] !== undefined && data.enemies[enemy.enemyId ?? '']?.moves.find((m) => m.id === state.intents[enemy.id])?.intent === 'big' : false;
      const actorEl = ev.actor === 'rider' ? state.rider : ev.actor === 'dragon' ? state.dragon : ev.actor === 'dragon2' ? state.second?.fighter : ev.actor === 'dragon3' ? state.third?.fighter : enemy;
      const used = ev.t === 'hit' && ev.element && actorEl?.element2 ? ev.element : actorEl?.element;
      const color = used ? data.elements.info[used].color : '#c9a8ff';
      const hit: HitInfo = {
        actor: ev.actor, target: ev.target, color, big, element: ev.t === 'hit' ? ev.element ?? actorEl?.element ?? null : null,
        text: ev.t === 'hit' ? `${ev.crit ? '★' : ''}-${ev.amount}` : 'Miss',
        kind: ev.t === 'miss' ? 'miss' : ev.crit ? 'crit' : 'dmg',
      };
      const beat = { ...o, onImpact: opts.onImpact };
      switch (move) {
        case 'slash': return riderAttack(stage, hit, beat);
        case 'arrow': return shoot(stage, { ...hit, bolt: 'arrow' }, beat);
        case 'spell': {
          const spell = data.combat.riderMoves.spells.find((s) => mentions(ev.text, s.name));
          const look = spell ? spellLook(data, spell.id) : orbLook(state.weapon.element);
          const tinted = { ...hit, color: spellColor(data, state, ev.text) };
          return look && hasSpellArt(stage, look) ? cast(stage, tinted, look, beat) : shoot(stage, { ...tinted, bolt: 'orb' }, beat);
        }
        case 'claw': return claw(stage, hit, beat);
        case 'breath': return breath(stage, hit, beat);
        case 'combo': return together(stage, { ...hit, actor: 'dragon' }, 'rider', beat);
        case 'duo': return together(stage, { ...hit, actor: 'dragon' }, 'dragon2', beat);
        default: {
          const look = enemy ? enemyLook(data, enemy.enemyId, ev.text, used ?? null) : null;
          return look && hasSpellArt(stage, look) ? cast(stage, hit, look, beat) : lungeAt(stage, hit, beat);
        }
      }
    }
    case 'heal':
      opts.onImpact();
      if (landing && hasSpellArt(stage, landing)) selfCast(stage, ev.target, landing, o);
      particles(stage, ev.target, 'heal', opts.fast);
      popNumber(stage, ev.target, `+${ev.amount}`, 'heal', opts.fast);
      return sleep(E.heal * k);
    case 'mp':
      opts.onImpact();
      particles(stage, ev.target, 'buff', opts.fast);
      popNumber(stage, ev.target, `+${ev.amount} MP`, 'mp', opts.fast);
      return sleep(E.mp * k);
    case 'dot': {
      opts.onImpact();
      const kind = ev.status === 'burn' ? 'burn' : ev.status === 'chill' ? 'chill' : ev.status === 'shock' ? 'shock' : null;
      if (kind) particles(stage, ev.target, kind, opts.fast);
      popNumber(stage, ev.target, `-${ev.amount}`, 'dmg', opts.fast);
      return sleep(E.dot * k);
    }
    case 'recoil':
      opts.onImpact();
      if (!o.reduced) jitter(stage, ev.target, opts.fast);
      popNumber(stage, ev.target, `-${ev.amount}`, 'dmg', opts.fast);
      return sleep(E.dot * k);
    case 'status': {
      opts.onImpact();
      const kind = ev.status === 'burn' ? 'burn' : ev.status === 'chill' ? 'chill' : ev.status === 'shock' ? 'shock' : 'buff';
      if (landing && hasSpellArt(stage, landing)) selfCast(stage, ev.target, landing, o);
      if (!o.reduced) particles(stage, ev.target, kind, opts.fast);
      if (ev.status === 'shock' && !o.reduced) jitter(stage, ev.target, opts.fast);
      stage.querySelector(`[data-plate="${ev.target}"]`)?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 260 * k });
      return sleep(E.status * k);
    }
    case 'skip':
      opts.onImpact();
      if (!o.reduced) jitter(stage, ev.actor, opts.fast);
      return sleep(E.skip * k);
    case 'shift':
      opts.onImpact();
      ring(stage, ev.actor, data.elements.info[ev.element].color, opts.fast);
      return sleep(E.shift * k);
    case 'ko':
      // The fighter slumps or topples through its CSS class once HP reads zero.
      opts.onImpact();
      return sleep(E.ko * k);
    case 'act': {
      opts.onImpact();
      // "Mira casts Mend." comes before the heal or the ward it causes; the effect plays when that lands.
      const spell = ev.actor === 'rider' ? data.combat.riderMoves.spells.find((s) => ev.text.endsWith(` casts ${s.name}.`)) : undefined;
      const look = spell ? spellLook(data, spell.id) : null;
      if (look && hasSpellArt(stage, look)) {
        pendingSelf = look;
        return castStart(stage, ev.actor, look.tone, o);
      }
      return act(stage, ev.actor, o);
    }
    case 'flee':
      opts.onImpact();
      if (ev.success) return finale(stage, 'fled', partyIds(state), o);
      return sleep(E.flee * k);
    case 'end':
      opts.onImpact();
      return finale(stage, ev.outcome === 'won' ? 'won' : ev.outcome === 'lost' ? 'lost' : 'fled', partyIds(state), o);
    default:
      opts.onImpact();
      return sleep(E.act * k);
  }
}

function partyIds(state: BattleState): string[] {
  return ['rider', ...(state.dragon ? ['dragon'] : []), ...(state.second ? ['dragon2'] : []), ...(state.third ? ['dragon3'] : [])];
}
