import layout from '../../data/stage.json';
import type { BattleEvent, BattleState } from '../../core/battle';
import type { GameData } from '../../core/data';
import { act, breath, claw, finale, jitter, lungeAt, particles, popNumber, riderAttack, ring, shoot, together, type HitInfo } from './choreo';

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
  if (ev.actor === 'dragon' || ev.actor === 'dragon2') {
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

/** Play one event on the stage. Resolves when the next event may start. */
export async function direct(stage: HTMLElement, data: GameData, state: BattleState, ev: BattleEvent, opts: DirectorOpts): Promise<void> {
  const k = opts.fast ? layout.fastFactor : 1;
  const o = { fast: opts.fast, reduced: opts.reduced };
  switch (ev.t) {
    case 'hit':
    case 'miss': {
      const move = classify(data, state, ev);
      const enemy = state.enemies.find((x) => x.id === ev.actor);
      const big = enemy ? state.intents[enemy.id] !== undefined && data.enemies[enemy.enemyId ?? '']?.moves.find((m) => m.id === state.intents[enemy.id])?.intent === 'big' : false;
      const actorEl = ev.actor === 'rider' ? state.rider : ev.actor === 'dragon' ? state.dragon : ev.actor === 'dragon2' ? state.second?.fighter : enemy;
      const color = actorEl?.element ? data.elements.info[actorEl.element].color : '#c9a8ff';
      const hit: HitInfo = {
        actor: ev.actor, target: ev.target, color, big,
        text: ev.t === 'hit' ? `${ev.crit ? '★' : ''}-${ev.amount}` : 'Miss',
        kind: ev.t === 'miss' ? 'miss' : ev.crit ? 'crit' : 'dmg',
      };
      const beat = { ...o, onImpact: opts.onImpact };
      switch (move) {
        case 'slash': return riderAttack(stage, hit, beat);
        case 'arrow': return shoot(stage, { ...hit, bolt: 'arrow' }, beat);
        case 'spell': return shoot(stage, { ...hit, bolt: 'orb', color: spellColor(data, state, ev.text) }, beat);
        case 'claw': return claw(stage, hit, beat);
        case 'breath': return breath(stage, hit, beat);
        case 'combo': return together(stage, { ...hit, actor: 'dragon' }, 'rider', beat);
        case 'duo': return together(stage, { ...hit, actor: 'dragon' }, 'dragon2', beat);
        default: return lungeAt(stage, hit, beat);
      }
    }
    case 'heal':
      opts.onImpact();
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
    case 'status': {
      opts.onImpact();
      const kind = ev.status === 'burn' ? 'burn' : ev.status === 'chill' ? 'chill' : ev.status === 'shock' ? 'shock' : 'buff';
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
    case 'act':
      opts.onImpact();
      return act(stage, ev.actor, o);
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
  return ['rider', ...(state.dragon ? ['dragon'] : []), ...(state.second ? ['dragon2'] : [])];
}
