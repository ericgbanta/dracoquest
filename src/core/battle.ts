/**
 * Turn-based battle engine. Pure and deterministic: the same state, orders,
 * and RNG state always produce the same round.
 *
 * Each round the player gives one rider order and one dragon order (or a
 * combo, which uses both). Then everyone acts in initiative order, statuses
 * tick, the breath meter fills, and enemies choose their next intents.
 */
import { createRng, type Rng } from './rng';
import { elementMultiplier, matchup, type Matchup } from './elements';
import { dragonMaxHp, riderMaxHp, riderMaxMp } from './characters';
import { addBonus, bonusOf, dragonBonus, effectiveDragonStats, effectiveRiderStats, learnedSkills, riderBonus, riderWeapon, talentById } from './loadout';
import type {
  Bonus, DragonState, ElementId, EnemyData, EnemyMove, GameData, IntentKind, RiderState, StatusId, WeaponType,
} from './types';

export interface StatusInstance { id: StatusId; turns: number; shield?: number }

export type FighterKind = 'rider' | 'dragon' | 'enemy';

export interface Fighter {
  id: string;
  kind: FighterKind;
  name: string;
  element: ElementId | null;
  level: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  /** Main damage stat: Strength, Might, or an enemy's power. */
  power: number;
  /** Spell stat (rider Arcana) or Spirit (dragon). */
  magic: number;
  accuracy: number;
  dodge: number;
  swift: number;
  defense: number;
  critChance: number;
  statuses: StatusInstance[];
  /** Enemies only. */
  enemyId?: string;
  attack?: number;
  resist?: Partial<Record<ElementId, number>>;
  boss?: boolean;
  shifted?: boolean;
}

export type Outcome = 'ongoing' | 'won' | 'lost' | 'fled';

export interface BattleState {
  rngState: number;
  round: number;
  rider: Fighter;
  dragon: Fighter | null;
  enemies: Fighter[];
  breath: number;
  bond: number;
  /** Enemy fighter id → move id for the coming round. */
  intents: Record<string, string>;
  inventory: Record<string, number>;
  canFlee: boolean;
  outcome: Outcome;
  /** 'ride': rider and dragon fight as one mounted unit (Adult dragons, boss fights). */
  mode: 'normal' | 'ride';
  weapon: { name: string; damage: number; element: ElementId | null; type: WeaponType };
  /** Bonuses for the rider side (gear plus the dragon's rider-boosting talents). */
  riderMods: Bonus;
  dragonMods: Bonus;
  breathMultiplier: number;
  spirit: number;
  /** Learned talent skills and rounds left before each can be used again. */
  skills: string[];
  cooldowns: Record<string, number>;
  /** Max HP of each half of a mounted unit, to split HP after the fight. */
  ride: { riderMaxHp: number; dragonMaxHp: number; dragonName: string } | null;
}

export type RiderOrder =
  | { type: 'attack'; target: string }
  | { type: 'spell'; spell: string; target: string }
  | { type: 'item'; item: string }
  | { type: 'defend' }
  | { type: 'flee' }
  | { type: 'ride'; move: string; target: string };

export type DragonOrder =
  | { type: 'claw'; target: string }
  | { type: 'breath'; target: string }
  | { type: 'guard' }
  | { type: 'combo'; combo: string; target: string }
  | { type: 'skill'; skill: string; target: string };

export interface Orders { rider: RiderOrder; dragon?: DragonOrder }

export type BattleEvent =
  | { t: 'act'; actor: string; text: string }
  | { t: 'hit'; actor: string; target: string; amount: number; crit: boolean; matchup: Matchup; text: string }
  | { t: 'miss'; actor: string; target: string; text: string }
  | { t: 'heal'; actor: string; target: string; amount: number; text: string }
  | { t: 'mp'; target: string; amount: number; text: string }
  | { t: 'status'; target: string; status: StatusId; text: string }
  | { t: 'dot'; target: string; status: StatusId; amount: number; text: string }
  | { t: 'ko'; target: string; text: string }
  | { t: 'skip'; actor: string; text: string }
  | { t: 'shift'; actor: string; element: ElementId; text: string }
  | { t: 'flee'; success: boolean; text: string }
  | { t: 'end'; outcome: Outcome; text: string };

export interface EnemySpawn { enemyId: string; level: number }

export interface BattleSetup {
  rider: RiderState;
  dragon: DragonState | null;
  enemies: EnemySpawn[];
  seed: number;
  canFlee: boolean;
  /** Fight mounted. Needs a dragon that is awake. */
  ride?: boolean;
}

// ---------- Setup ----------

const WEAPON_STAT: Record<WeaponType, 'strength' | 'agility' | 'arcana'> = { melee: 'strength', ranged: 'agility', magic: 'arcana' };

function riderFighter(data: GameData, r: RiderState, mods: Bonus): Fighter {
  const c = data.combat;
  const st = effectiveRiderStats(data, r);
  const weapon = riderWeapon(data, r);
  return {
    id: 'rider', kind: 'rider', name: r.name, element: null, level: r.level,
    maxHp: riderMaxHp(data, r), hp: r.hp, maxMp: riderMaxMp(data, r), mp: r.mp,
    power: st[WEAPON_STAT[weapon.weaponType ?? 'melee']], magic: st.arcana,
    accuracy: st.agility, dodge: st.agility * c.rider.dodgePerAgility, swift: st.agility,
    defense: st.vigor * c.rider.defensePerVigor + bonusOf(mods, 'riderDefense'),
    critChance: Math.min(c.crit.max, c.crit.base + st.agility * c.crit.perAgility + bonusOf(mods, 'riderCrit')),
    statuses: [],
  };
}

function dragonFighter(data: GameData, d: DragonState, mods: Bonus): Fighter {
  const c = data.combat;
  const st = effectiveDragonStats(data, d);
  return {
    id: 'dragon', kind: 'dragon', name: d.name, element: d.element, level: d.level,
    maxHp: dragonMaxHp(data, d), hp: d.hp, maxMp: 0, mp: 0,
    power: st.might, magic: st.spirit,
    accuracy: st.swift * c.dragon.accuracyPerSwift, dodge: st.swift * c.dragon.dodgePerSwift + bonusOf(mods, 'dragonDodge'), swift: st.swift,
    defense: st.scale * c.dragon.defensePerScale + bonusOf(mods, 'dragonDefense'),
    critChance: Math.min(c.crit.max, c.crit.base + st.swift * c.crit.perSwift + bonusOf(mods, 'dragonCrit')),
    statuses: [],
  };
}

/** Rider and dragon merged into one mounted unit for Ride mode. */
function mountFighter(data: GameData, rider: Fighter, dragon: Fighter): Fighter {
  const c = data.combat;
  return {
    id: 'rider', kind: 'rider', name: `${rider.name} & ${dragon.name}`, element: dragon.element,
    level: Math.max(rider.level, dragon.level),
    maxHp: rider.maxHp + dragon.maxHp, hp: rider.hp + dragon.hp, maxMp: rider.maxMp, mp: rider.mp,
    power: (rider.power + dragon.power) / 2, magic: rider.magic,
    accuracy: Math.max(rider.accuracy, dragon.accuracy), dodge: dragon.dodge, swift: Math.max(rider.swift, dragon.swift),
    defense: (rider.defense + dragon.defense) * c.ride.defenseShare,
    critChance: Math.max(rider.critChance, dragon.critChance),
    statuses: [],
  };
}

export function enemyFighter(data: GameData, e: EnemyData, level: number, index: number): Fighter {
  const at = (k: keyof EnemyData['base']) => e.base[k] + e.perLevel[k] * (level - 1);
  const hp = Math.round(at('hp'));
  return {
    id: `e${index}`, kind: 'enemy', name: e.name, element: e.element, level,
    maxHp: hp, hp, maxMp: 0, mp: 0,
    power: at('power'), magic: 0, accuracy: at('power'), dodge: at('dodge'), swift: at('swift'),
    defense: at('defense'), critChance: data.combat.crit.base, statuses: [],
    enemyId: e.id, attack: at('attack'), resist: e.resist, boss: e.boss, shifted: false,
  };
}

export function createBattle(data: GameData, setup: BattleSetup): BattleState {
  const enemies = setup.enemies.map((s, i) => {
    const e = data.enemies[s.enemyId];
    if (!e) throw new Error(`Unknown enemy ${s.enemyId}`);
    return enemyFighter(data, e, s.level, i);
  });
  const awake = setup.dragon && setup.dragon.hp > 0 ? setup.dragon : null;
  const dMods = awake ? dragonBonus(data, awake) : {};
  // The rider side gets gear bonuses plus any rider-boosting talents from an awake dragon.
  const rMods = addBonus(riderBonus(data, setup.rider), {
    riderDefense: bonusOf(dMods, 'riderDefense'), riderCrit: bonusOf(dMods, 'riderCrit'), riderDamagePct: bonusOf(dMods, 'riderDamagePct'),
  });
  let rider = riderFighter(data, setup.rider, rMods);
  let dragon = awake ? dragonFighter(data, awake, dMods) : null;
  let ride: BattleState['ride'] = null;
  if (setup.ride && dragon) {
    ride = { riderMaxHp: rider.maxHp, dragonMaxHp: dragon.maxHp, dragonName: dragon.name };
    rider = mountFighter(data, rider, dragon);
    dragon = null;
  }
  const weapon = riderWeapon(data, setup.rider);
  const stage = setup.dragon ? data.dragons.stages.find((st) => st.id === setup.dragon!.stage) : undefined;
  const rng = createRng(setup.seed);
  const state: BattleState = {
    rngState: 0, round: 1, rider, dragon, enemies,
    breath: 0, bond: setup.dragon?.bond ?? 0, intents: {}, inventory: { ...setup.rider.inventory },
    canFlee: setup.canFlee && !enemies.some((e) => e.boss), outcome: 'ongoing',
    mode: ride ? 'ride' : 'normal',
    weapon: { name: weapon.name, damage: weapon.damage ?? 10, element: weapon.element ?? null, type: weapon.weaponType ?? 'melee' },
    riderMods: rMods, dragonMods: dMods,
    breathMultiplier: stage?.breathMultiplier ?? 1,
    spirit: awake ? effectiveDragonStats(data, awake).spirit : 0,
    skills: awake && !ride ? learnedSkills(data, awake).map((t) => t.id) : [],
    cooldowns: {},
    ride,
  };
  chooseIntents(data, state, rng);
  state.rngState = rng.getState();
  return state;
}

// ---------- Helpers ----------

const alive = (f: Fighter | null | undefined): f is Fighter => !!f && f.hp > 0;
const has = (f: Fighter, id: StatusId) => f.statuses.some((s) => s.id === id);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function livingEnemies(state: BattleState): Fighter[] {
  return state.enemies.filter(alive);
}

export function findFighter(state: BattleState, id: string): Fighter | null {
  if (id === 'rider') return state.rider;
  if (id === 'dragon') return state.dragon;
  return state.enemies.find((e) => e.id === id) ?? null;
}

export function enemyMove(data: GameData, state: BattleState, enemy: Fighter): EnemyMove | null {
  const e = enemy.enemyId ? data.enemies[enemy.enemyId] : undefined;
  return e?.moves.find((m) => m.id === state.intents[enemy.id]) ?? null;
}

export function intentOf(data: GameData, state: BattleState, enemy: Fighter): { kind: IntentKind; name: string } | null {
  const m = enemyMove(data, state, enemy);
  return m ? { kind: m.intent, name: m.name } : null;
}

export function comboAvailable(data: GameData, state: BattleState, comboId: string): boolean {
  const combo = data.combat.combos.find((c) => c.id === comboId);
  return !!combo && alive(state.dragon) && alive(state.rider) && state.bond >= combo.bond;
}

export function breathReady(data: GameData, state: BattleState): boolean {
  return state.breath >= data.combat.breath.max;
}

export function skillReady(state: BattleState, skillId: string): boolean {
  return state.skills.includes(skillId) && (state.cooldowns[skillId] ?? 0) <= 0 && alive(state.dragon);
}

function moveAllowed(state: BattleState, self: Fighter, m: EnemyMove): boolean {
  const allies = livingEnemies(state);
  switch (m.condition) {
    case 'allyHurt': return allies.some((a) => a.hp < a.maxHp * 0.7);
    case 'selfHurt': return self.hp < self.maxHp * 0.6;
    case 'notShifted': return !self.shifted;
  }
  if (m.intent === 'buff' && m.buff && has(self, m.buff)) return false;
  return true;
}

function chooseIntents(data: GameData, state: BattleState, rng: Rng): void {
  state.intents = {};
  for (const enemy of livingEnemies(state)) {
    const e = data.enemies[enemy.enemyId!]!;
    const options = e.moves.filter((m) => moveAllowed(state, enemy, m));
    const pool = options.length ? options : e.moves;
    const total = pool.reduce((s, m) => s + m.weight, 0);
    let roll = rng.float(0, total);
    let chosen = pool[pool.length - 1]!;
    for (const m of pool) {
      roll -= m.weight;
      if (roll < 0) { chosen = m; break; }
    }
    state.intents[enemy.id] = chosen.id;
  }
}

function addStatus(data: GameData, target: Fighter, id: StatusId, events: BattleEvent[]): void {
  const s = data.statuses[id];
  const existing = target.statuses.find((x) => x.id === id);
  const shield = s.shieldFraction ? Math.round(target.maxHp * s.shieldFraction) : undefined;
  if (existing) {
    existing.turns = s.duration;
    if (shield !== undefined) existing.shield = shield;
  } else {
    target.statuses.push({ id, turns: s.duration, ...(shield !== undefined ? { shield } : {}) });
  }
  events.push({ t: 'status', target: target.id, status: id, text: `${target.name} has ${s.name}.` });
}

interface RoundCtx {
  data: GameData;
  state: BattleState;
  rng: Rng;
  events: BattleEvent[];
  riderDefending: boolean;
  dragonGuarding: boolean;
  breathGain: number;
}

interface AttackSpec {
  base: number;
  stat: number;
  element: ElementId | null;
  label: string;
  damageMultiplier?: number;
  /** Extra bonus for strong element hits (Attuned talent). */
  strongBonus?: number;
}

export interface DamageInputs { base: number; stat: number; element: number; crit: boolean; roll: number; defense: number }

/**
 * The design's damage formula:
 * base × (1 + stat / 50) × element × crit × rand(0.9, 1.1) − defense, never below 1.
 * Returns the unrounded value; callers round after any final multipliers.
 */
export function damageFormula(c: GameData['combat'], d: DamageInputs): number {
  const raw = d.base * (1 + d.stat / c.statDivisor) * d.element * (d.crit ? c.critMultiplier : 1) * d.roll - d.defense;
  return Math.max(c.minDamage, raw);
}

/** Roll to hit and deal damage. Returns damage dealt (0 on a miss). */
function strike(ctx: RoundCtx, attacker: Fighter, target: Fighter, spec: AttackSpec): number {
  const { data, rng, events } = ctx;
  const c = data.combat;
  const st = data.statuses;

  let dodge = target.dodge;
  if (has(target, 'root')) dodge = 0;
  if (has(target, 'fade')) dodge += st.fade.dodgeBonus ?? 0;
  let hitChance = clamp(c.hit.base + (attacker.accuracy - dodge) * c.hit.perPoint, c.hit.min, c.hit.max);
  if (has(attacker, 'blind')) hitChance -= st.blind.accuracyPenalty ?? 0;
  if (!rng.chance(hitChance)) {
    events.push({ t: 'miss', actor: attacker.id, target: target.id, text: `${attacker.name}'s ${spec.label} misses ${target.name}.` });
    return 0;
  }

  let mult = elementMultiplier(data.elements, spec.element, target.element, target.resist);
  if (spec.element === 'storm' && has(target, 'soak')) mult *= st.soak.stormDamageMultiplier ?? 1;
  if (spec.strongBonus && mult > data.elements.multipliers.neutral) mult *= 1 + spec.strongBonus;
  const crit = rng.chance(attacker.critChance);
  const levelScale = attacker.kind === 'enemy' ? 1 : 1 + c.levelDamageScale * (attacker.level - 1);
  let base = spec.base * levelScale * (spec.damageMultiplier ?? 1);
  if (has(attacker, 'fury')) base *= st.fury.damageMultiplier ?? 1;
  let defense = target.defense;
  if (has(target, 'crack')) defense *= st.crack.defenseMultiplier ?? 1;
  if (has(target, 'harden')) defense += st.harden.defenseBonus ?? 0;
  let takenMult = 1;
  if (has(target, 'crack')) takenMult *= st.crack.damageTakenMultiplier ?? 1;
  if (target.kind === 'rider' && ctx.riderDefending) takenMult *= c.defend.damageTakenMultiplier;
  let dmg = damageFormula(c, {
    base, stat: spec.stat, element: mult, crit, roll: rng.float(c.damageRandMin, c.damageRandMax), defense,
  }) * takenMult;
  dmg = Math.max(c.minDamage, Math.round(dmg));

  const ward = target.statuses.find((s) => s.id === 'ward' && (s.shield ?? 0) > 0);
  let absorbed = 0;
  if (ward) {
    absorbed = Math.min(ward.shield!, dmg);
    ward.shield = ward.shield! - absorbed;
  }
  const taken = dmg - absorbed;
  target.hp = Math.max(0, target.hp - taken);

  const kind = matchup(data.elements, spec.element, target.element);
  const tags = [crit ? 'Critical!' : '', mult > 1 ? "It's strong!" : mult < 1 ? 'It resists.' : ''].filter(Boolean).join(' ');
  const shieldText = absorbed ? ` (${absorbed} blocked by Ward)` : '';
  events.push({
    t: 'hit', actor: attacker.id, target: target.id, amount: taken, crit, matchup: kind,
    text: `${attacker.name}'s ${spec.label} hits ${target.name} for ${taken}${shieldText}.${tags ? ' ' + tags : ''}`,
  });

  if (attacker.kind === 'dragon') ctx.breathGain += c.breath.onDealDamage;
  if (target.kind === 'dragon') ctx.breathGain += c.breath.onTakeDamage;
  if (target.hp === 0) events.push({ t: 'ko', target: target.id, text: koText(target) });
  return taken;
}

function koText(f: Fighter): string {
  if (f.kind === 'dragon') return `${f.name} is knocked out! The rider fights on alone.`;
  if (f.kind === 'rider') return `${f.name} falls!`;
  return `${f.name} is defeated!`;
}

function heal(ctx: RoundCtx, actor: Fighter, target: Fighter, amount: number): void {
  if (actor.kind !== 'enemy') amount *= 1 + bonusOf(ctx.state.riderMods, 'healPct') + bonusOf(ctx.state.dragonMods, 'healPct');
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
  const healed = target.hp - before;
  ctx.events.push({ t: 'heal', actor: actor.id, target: target.id, amount: healed, text: `${target.name} recovers ${healed} HP.` });
}

/** Healing that talents and gear don't boost (items). */
function healRaw(ctx: RoundCtx, target: Fighter, amount: number): void {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
  const healed = target.hp - before;
  ctx.events.push({ t: 'heal', actor: 'rider', target: target.id, amount: healed, text: `${target.name} recovers ${healed} HP.` });
}

/** First living enemy matching `id`, or the first living enemy. */
function enemyTarget(state: BattleState, id: string): Fighter | null {
  const living = livingEnemies(state);
  return living.find((e) => e.id === id) ?? living[0] ?? null;
}

function riderDamageMultiplier(data: GameData, state: BattleState): number {
  const pct = 1 + bonusOf(state.riderMods, 'riderDamagePct');
  if (state.mode === 'ride') return pct;
  return (state.dragon && state.dragon.hp > 0 ? 1 : data.combat.rider.aloneDamageMultiplier) * pct;
}

// ---------- Actions ----------

function riderAct(ctx: RoundCtx, order: RiderOrder): void {
  const { data, state, events } = ctx;
  const rider = state.rider;
  const c = data.combat;
  const alone = riderDamageMultiplier(data, state);

  const basicAttack = (targetId: string) => {
    const t = enemyTarget(state, targetId);
    if (t) strike(ctx, rider, t, { base: state.weapon.damage, stat: rider.power, element: state.weapon.element, label: state.weapon.name, damageMultiplier: alone });
  };

  switch (order.type) {
    case 'attack':
      basicAttack(order.target);
      return;
    case 'spell': {
      const spell = c.riderMoves.spells.find((s) => s.id === order.spell);
      if (!spell || rider.mp < spell.mp) {
        events.push({ t: 'act', actor: 'rider', text: `${rider.name} is out of MP and attacks instead.` });
        basicAttack(order.target);
        return;
      }
      rider.mp -= spell.mp;
      if (spell.kind === 'damage') {
        const t = enemyTarget(state, order.target);
        if (t) strike(ctx, rider, t, { base: spell.base, stat: rider.magic, element: null, label: spell.name, damageMultiplier: alone });
      } else {
        const target = order.target === 'dragon' && alive(state.dragon) ? state.dragon : rider;
        events.push({ t: 'act', actor: 'rider', text: `${rider.name} casts ${spell.name}.` });
        heal(ctx, rider, target, spell.base * (1 + c.levelDamageScale * (rider.level - 1)) * (1 + rider.magic / c.statDivisor));
      }
      return;
    }
    case 'item': {
      const item = data.items.find((i) => i.id === order.item);
      if (!item || (state.inventory[item.id] ?? 0) <= 0) {
        events.push({ t: 'act', actor: 'rider', text: `${rider.name} digs through the bag and finds nothing.` });
        return;
      }
      if (item.effect === 'healDragon' && !alive(state.dragon) && state.mode !== 'ride') {
        events.push({ t: 'act', actor: 'rider', text: `The ${item.name} can't wake a knocked-out dragon.` });
        return;
      }
      state.inventory[item.id] = (state.inventory[item.id] ?? 0) - 1;
      events.push({ t: 'act', actor: 'rider', text: `${rider.name} uses a ${item.name}.` });
      if (state.ride && item.effect !== 'restoreMp') {
        // Mounted: potions heal the rider's share, treats the dragon's share.
        const share = item.effect === 'healRider' ? state.ride.riderMaxHp : state.ride.dragonMaxHp;
        healRaw(ctx, rider, share * item.fraction);
      } else if (item.effect === 'healRider') healRaw(ctx, rider, rider.maxHp * item.fraction);
      else if (item.effect === 'healDragon') healRaw(ctx, state.dragon!, state.dragon!.maxHp * item.fraction);
      else {
        const before = rider.mp;
        rider.mp = Math.min(rider.maxMp, rider.mp + Math.round(rider.maxMp * item.fraction));
        events.push({ t: 'mp', target: 'rider', amount: rider.mp - before, text: `${rider.name} regains ${rider.mp - before} MP.` });
      }
      return;
    }
    case 'defend':
      events.push({ t: 'act', actor: 'rider', text: `${rider.name} raises a guard.` });
      return;
    case 'ride':
      rideAct(ctx, order);
      return;
    case 'flee': {
      if (!state.canFlee) {
        events.push({ t: 'flee', success: false, text: 'There is no running from this fight!' });
        return;
      }
      const living = livingEnemies(state);
      const avgSwift = living.reduce((s, e) => s + e.swift, 0) / Math.max(1, living.length);
      const chance = clamp(c.flee.base + (rider.swift - avgSwift) * c.flee.perPoint, c.flee.min, c.flee.max);
      if (ctx.rng.chance(chance)) {
        events.push({ t: 'flee', success: true, text: `${rider.name} gets away!` });
        state.outcome = 'fled';
      } else {
        events.push({ t: 'flee', success: false, text: `${rider.name} tries to run but trips over a root.` });
      }
      return;
    }
  }
}

function dragonAct(ctx: RoundCtx, order: DragonOrder): void {
  const { data, state, events } = ctx;
  const dragon = state.dragon!;
  const c = data.combat;

  const claw = (targetId: string) => {
    const t = enemyTarget(state, targetId);
    if (t) strike(ctx, dragon, t, { base: c.dragonMoves.claw.base, stat: dragon.power, element: null, label: c.dragonMoves.claw.name, damageMultiplier: 1 + bonusOf(state.dragonMods, 'clawPct') });
  };

  switch (order.type) {
    case 'claw':
      claw(order.target);
      return;
    case 'breath': {
      if (state.breath < c.breath.max) {
        claw(order.target);
        return;
      }
      state.breath = 0;
      const t = enemyTarget(state, order.target);
      if (!t) return;
      const dealt = strike(ctx, dragon, t, breathSpec(ctx, dragon, c.dragonMoves.breath.base, c.dragonMoves.breath.name));
      if (dealt > 0) breathStatus(ctx, dragon, t);
      return;
    }
    case 'skill':
      skillAct(ctx, order);
      return;
    case 'guard':
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} spreads its wings over ${state.rider.name}.` });
      return;
    case 'combo':
      return; // Combos are resolved separately; they use both actions.
  }
}

function breathSpec(ctx: RoundCtx, source: Fighter, base: number, label: string): AttackSpec {
  const { state } = ctx;
  return {
    base: base * state.breathMultiplier, stat: source.power, element: source.element, label,
    damageMultiplier: 1 + bonusOf(state.dragonMods, 'breathPct'), strongBonus: bonusOf(state.dragonMods, 'strongBonus'),
  };
}

function breathStatus(ctx: RoundCtx, source: Fighter, target: Fighter): void {
  const { data, state, rng, events } = ctx;
  if (!source.element) return;
  const c = data.combat;
  const statusId = data.elements.info[source.element].status;
  const chance = c.breath.statusChanceBase + state.spirit * c.breath.statusChancePerSpirit + bonusOf(state.dragonMods, 'breathStatusChance');
  if (!rng.chance(chance)) return;
  // Buff statuses (Ward) protect the rider instead of hurting the enemy.
  if (data.statuses[statusId].kind === 'buff') addStatus(data, state.rider, statusId, events);
  else if (target.hp > 0) addStatus(data, target, statusId, events);
}

function skillAct(ctx: RoundCtx, order: Extract<DragonOrder, { type: 'skill' }>): void {
  const { data, state, events, rng } = ctx;
  const dragon = state.dragon!;
  const talent = talentById(data, order.skill);
  const skill = talent?.skill;
  if (!talent || !skill || !skillReady(state, talent.id)) {
    events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} isn't ready to do that yet.` });
    return;
  }
  state.cooldowns[talent.id] = skill.cooldown + 1; // +1 because cooldowns tick at the end of this round
  const statusOn = (target: Fighter) => {
    if (skill.status && target.hp > 0 && rng.chance(skill.statusChance ?? 1)) addStatus(data, target, skill.status, events);
  };
  switch (skill.kind) {
    case 'damage': {
      const t = enemyTarget(state, order.target);
      if (!t) return;
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} uses ${talent.name}!` });
      let dealt = 0;
      for (let i = 0; i < (skill.hits ?? 1) && t.hp > 0; i++) {
        dealt += strike(ctx, dragon, t, {
          base: skill.base ?? 10, stat: dragon.power, element: skill.element === 'dragon' ? dragon.element : null, label: talent.name,
          damageMultiplier: 1 + bonusOf(state.dragonMods, 'clawPct'), strongBonus: bonusOf(state.dragonMods, 'strongBonus'),
        });
      }
      if (dealt > 0) statusOn(t);
      return;
    }
    case 'debuff': {
      const t = enemyTarget(state, order.target);
      if (!t) return;
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} uses ${talent.name} on ${t.name}.` });
      statusOn(t);
      return;
    }
    case 'heal':
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} uses ${talent.name}.` });
      heal(ctx, dragon, skill.target === 'dragon' ? dragon : state.rider, (skill.base ?? 10) * (1 + dragon.magic / data.combat.statDivisor) * (1 + data.combat.levelDamageScale * (dragon.level - 1)));
      return;
    case 'healAll':
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} uses ${talent.name}.` });
      heal(ctx, dragon, state.rider, state.rider.maxHp * (skill.fraction ?? 0.1));
      heal(ctx, dragon, dragon, dragon.maxHp * (skill.fraction ?? 0.1));
      return;
    case 'buff':
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} uses ${talent.name}.` });
      if (skill.status) addStatus(data, skill.target === 'dragon' ? dragon : state.rider, skill.status, events);
      return;
    case 'taunt':
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} lets out a ${talent.name}! Every enemy glares at it.` });
      addStatus(data, dragon, skill.status ?? 'taunt', events);
      return;
    case 'cleanse':
      for (const f of [state.rider, dragon]) f.statuses = f.statuses.filter((x) => data.statuses[x.id].kind === 'buff');
      events.push({ t: 'act', actor: 'dragon', text: `${dragon.name} uses ${talent.name}. Bad statuses burn away.` });
      return;
  }
}

function rideAct(ctx: RoundCtx, order: Extract<RiderOrder, { type: 'ride' }>): void {
  const { data, state, events } = ctx;
  const unit = state.rider;
  const move = data.combat.ride.moves.find((m) => m.id === order.move);
  if (!move) return;
  const t = enemyTarget(state, order.target);
  switch (move.kind) {
    case 'damage':
      if (t) strike(ctx, unit, t, { base: move.base ?? 20, stat: unit.power, element: null, label: move.name, damageMultiplier: riderDamageMultiplier(data, state) });
      return;
    case 'breath': {
      if (state.breath < data.combat.breath.max) {
        events.push({ t: 'act', actor: 'rider', text: `The breath meter isn't full. ${unit.name} dive instead!` });
        if (t) strike(ctx, unit, t, { base: data.combat.ride.moves[0]?.base ?? 20, stat: unit.power, element: null, label: 'Diving Strike' });
        return;
      }
      state.breath = 0;
      if (!t) return;
      const dealt = strike(ctx, unit, t, breathSpec(ctx, unit, move.base ?? 40, move.name));
      if (dealt > 0) breathStatus(ctx, unit, t);
      return;
    }
    case 'defend':
      events.push({ t: 'act', actor: 'rider', text: `${unit.name} wrap up in a ${move.name}.` });
      healRaw(ctx, unit, unit.maxHp * (move.heal ?? 0));
      return;
    case 'buff':
      events.push({ t: 'act', actor: 'rider', text: `${unit.name} use ${move.name}.` });
      if (move.status) addStatus(data, unit, move.status, events);
      return;
  }
}

function comboAct(ctx: RoundCtx, order: Extract<DragonOrder, { type: 'combo' }>): void {
  const { data, state, events } = ctx;
  const combo = data.combat.combos.find((c) => c.id === order.combo);
  const t = enemyTarget(state, order.target);
  if (!combo || !t || !state.dragon) return;
  events.push({ t: 'act', actor: 'dragon', text: `${state.rider.name} and ${state.dragon.name}: ${combo.name}!` });
  const element = combo.id === 'kindred-roar' ? state.dragon.element : null;
  strike(ctx, state.dragon, t, {
    base: combo.base, stat: (state.rider.power + state.dragon.power) / 2, element, label: combo.name,
    damageMultiplier: 1 + bonusOf(state.dragonMods, 'comboPct'),
  });
}

function enemyAct(ctx: RoundCtx, enemy: Fighter): void {
  const { data, state, rng, events } = ctx;
  const move = enemyMove(data, state, enemy);
  if (!move) return;

  switch (move.intent) {
    case 'heal': {
      const allies = livingEnemies(state);
      const target = move.target === 'ally'
        ? allies.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), enemy)
        : enemy;
      events.push({ t: 'act', actor: enemy.id, text: `${enemy.name} uses ${move.name}.` });
      heal(ctx, enemy, target, target.maxHp * (move.heal ?? 0));
      return;
    }
    case 'buff':
      events.push({ t: 'act', actor: enemy.id, text: `${enemy.name} uses ${move.name}.` });
      if (move.buff) addStatus(data, enemy, move.buff, events);
      return;
    case 'shift':
      if (move.shiftTo) {
        enemy.element = move.shiftTo;
        enemy.shifted = true;
        events.push({ t: 'shift', actor: enemy.id, element: move.shiftTo, text: `${enemy.name} uses ${move.name} and turns ${data.elements.info[move.shiftTo].name}!` });
      }
      return;
    case 'attack':
    case 'big': {
      let target: Fighter = state.rider;
      const taunting = alive(state.dragon) && has(state.dragon, 'taunt');
      if (alive(state.dragon) && (taunting || rng.chance(0.5))) target = state.dragon;
      let guardMult = 1;
      if (target.kind === 'rider' && ctx.dragonGuarding && alive(state.dragon)) {
        target = state.dragon;
        guardMult = Math.max(0.2, data.combat.guard.damageTakenMultiplier - bonusOf(state.dragonMods, 'guardReduction'));
        events.push({ t: 'act', actor: 'dragon', text: `${state.dragon.name} takes the hit for ${state.rider.name}!` });
      }
      const big = move.intent === 'big' ? data.combat.bigAttackMultiplier : 1;
      const dealt = strike(ctx, enemy, target, {
        base: (enemy.attack ?? 1) * (move.power ?? 1) * big, stat: enemy.power, element: move.physical ? null : enemy.element,
        label: move.name, damageMultiplier: guardMult,
      });
      if (dealt > 0 && move.status && target.hp > 0 && rng.chance(move.statusChance ?? 1)) {
        addStatus(data, target, move.status, events);
      }
      return;
    }
  }
}

// ---------- Round ----------

function checkOutcome(state: BattleState): Outcome {
  if (state.outcome !== 'ongoing') return state.outcome;
  if (state.rider.hp <= 0) return 'lost';
  if (livingEnemies(state).length === 0) return 'won';
  return 'ongoing';
}

function cloneState(s: BattleState): BattleState {
  const cf = (f: Fighter): Fighter => ({ ...f, statuses: f.statuses.map((x) => ({ ...x })) });
  return {
    ...s, rider: cf(s.rider), dragon: s.dragon ? cf(s.dragon) : null, enemies: s.enemies.map(cf),
    intents: { ...s.intents }, inventory: { ...s.inventory }, cooldowns: { ...s.cooldowns },
  };
}

export interface RoundResult { state: BattleState; events: BattleEvent[] }

export function resolveRound(data: GameData, prev: BattleState, orders: Orders): RoundResult {
  if (prev.outcome !== 'ongoing') return { state: prev, events: [] };
  const state = cloneState(prev);
  const rng = createRng(state.rngState);
  const c = data.combat;
  const dragonUp = alive(state.dragon);
  let dragonOrder = dragonUp ? orders.dragon : undefined;
  const combo = dragonOrder?.type === 'combo' && comboAvailable(data, state, dragonOrder.combo) ? dragonOrder : null;
  if (dragonOrder?.type === 'combo' && !combo) dragonOrder = { type: 'claw', target: dragonOrder.target };

  const ctx: RoundCtx = {
    data, state, rng, events: [],
    riderDefending: !combo && (orders.rider.type === 'defend' || (orders.rider.type === 'ride' && orders.rider.move === 'wing-shield')),
    dragonGuarding: !combo && dragonOrder?.type === 'guard',
    breathGain: 0,
  };

  const initiative = (f: Fighter) =>
    f.swift * (has(f, 'chill') ? data.statuses.chill.initiativeMultiplier ?? 1 : 1) + rng.float(0, c.initiativeRandom);

  type Turn = { who: Fighter; init: number; run: () => void };
  const turns: Turn[] = [];
  if (combo) {
    turns.push({ who: state.dragon!, init: Math.max(initiative(state.rider), initiative(state.dragon!)), run: () => comboAct(ctx, combo) });
  } else {
    turns.push({ who: state.rider, init: initiative(state.rider), run: () => riderAct(ctx, orders.rider) });
    if (dragonUp && dragonOrder) {
      const o = dragonOrder;
      turns.push({ who: state.dragon!, init: initiative(state.dragon!), run: () => dragonAct(ctx, o) });
    }
  }
  for (const e of livingEnemies(state)) turns.push({ who: e, init: initiative(e), run: () => enemyAct(ctx, e) });
  turns.sort((a, b) => b.init - a.init);

  for (const turn of turns) {
    if (turn.who.hp <= 0) continue;
    if (turn.who.kind === 'dragon' && !alive(state.dragon)) continue;
    if (has(turn.who, 'shock') && rng.chance(data.statuses.shock.skipChance ?? 0)) {
      ctx.events.push({ t: 'skip', actor: turn.who.id, text: `${turn.who.name} is shocked and can't move!` });
      continue;
    }
    turn.run();
    state.outcome = checkOutcome(state);
    if (state.outcome !== 'ongoing') break;
  }

  if (state.outcome === 'ongoing') endOfRound(ctx, !!combo);
  state.outcome = checkOutcome(state);
  if (state.outcome !== 'ongoing') {
    const text = { won: 'Victory!', lost: 'Defeat...', fled: 'You escaped.', ongoing: '' }[state.outcome];
    ctx.events.push({ t: 'end', outcome: state.outcome, text });
  } else {
    chooseIntents(data, state, rng);
    state.round += 1;
  }
  state.rngState = rng.getState();
  return { state, events: ctx.events };
}

function endOfRound(ctx: RoundCtx, comboUsed: boolean): void {
  const { data, state, events } = ctx;
  const c = data.combat;
  const everyone = [state.rider, ...(state.dragon ? [state.dragon] : []), ...state.enemies].filter(alive);
  for (const f of everyone) {
    for (const s of f.statuses) {
      const sd = data.statuses[s.id];
      if (sd.dotFraction) {
        const amount = Math.max(1, Math.round(f.maxHp * sd.dotFraction));
        f.hp = Math.max(0, f.hp - amount);
        events.push({ t: 'dot', target: f.id, status: s.id, amount, text: `${f.name} takes ${amount} from ${sd.name}.` });
        if (f.hp === 0) events.push({ t: 'ko', target: f.id, text: koText(f) });
      }
      s.turns -= 1;
    }
    f.statuses = f.statuses.filter((s) => s.turns > 0 && !(s.id === 'ward' && (s.shield ?? 0) <= 0));
  }
  if (alive(state.dragon) || (state.mode === 'ride' && alive(state.rider))) {
    let gain = c.breath.perRound + state.spirit * c.breath.perSpirit + ctx.breathGain + bonusOf(state.dragonMods, 'breathPerRound');
    if (state.mode === 'ride') gain += c.ride.breathPerRoundBonus;
    else if (ctx.riderDefending && !comboUsed) gain += c.defend.breathBonus;
    state.breath = Math.min(c.breath.max, state.breath + Math.round(gain));
  }
  for (const id of Object.keys(state.cooldowns)) state.cooldowns[id] = Math.max(0, (state.cooldowns[id] ?? 0) - 1);
}
