/**
 * Turn-based battle engine. Pure and deterministic: the same state, orders,
 * and RNG state always produce the same round.
 *
 * Each round the player gives one rider order and one order per dragon
 * partner (a combo uses two of them). Then everyone acts in initiative order,
 * statuses tick, breath meters fill, and enemies choose their next intents.
 */
import { createRng, type Rng } from './rng';
import { attackElement, defenseMultiplier, matchupVs, type Matchup } from './elements';
import { elementLabel } from './eggs';
import { dragonMaxHp, riderMaxHp, riderMaxMp } from './characters';
import { battleSpell, riderLoadout } from './spells';
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
  /** The second element of a hybrid dragon. */
  element2?: ElementId | null;
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
  /** The second dragon partner (rider level 25+), with its own meter and skills. */
  second: SecondDragon | null;
  /** The third dragon partner (rider level 60+), shaped like the second. */
  third: SecondDragon | null;
  /** Talent skills used this fight, for temperament. */
  skillUses: number;
  /** The rider's spell loadout for this fight. */
  spells: string[];
  /** Power-ups on the loadout's spells (spell id → plus). Missing in fights saved before v12. */
  spellPlus?: Record<string, number>;
}

export interface SecondDragon {
  fighter: Fighter;
  breath: number;
  bond: number;
  mods: Bonus;
  spirit: number;
  breathMultiplier: number;
  skills: string[];
  cooldowns: Record<string, number>;
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
  | { type: 'skill'; skill: string; target: string }
  /** Lead dragon only: a dragon-and-dragon combo that also uses the second dragon's action. */
  | { type: 'duo'; combo: string; target: string };

export interface Orders { rider: RiderOrder; dragon?: DragonOrder; second?: DragonOrder; third?: DragonOrder }

export type BattleEvent =
  | { t: 'act'; actor: string; text: string }
  | { t: 'hit'; actor: string; target: string; amount: number; crit: boolean; matchup: Matchup; text: string; element?: ElementId | null }
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
  /** Second dragon partner, if any. */
  second?: DragonState | null;
  /** Third dragon partner (rider level 60+), if any. */
  third?: DragonState | null;
}

// ---------- Setup ----------

const WEAPON_STAT: Record<WeaponType, 'strength' | 'agility' | 'arcana'> = { melee: 'strength', ranged: 'agility', magic: 'arcana' };

function riderFighter(data: GameData, r: RiderState, mods: Bonus): Fighter {
  const c = data.combat;
  const st = effectiveRiderStats(data, r);
  const weapon = riderWeapon(data, r);
  return {
    id: 'rider', kind: 'rider', name: r.name, element: null, level: r.level,
    maxHp: riderMaxHp(data, r), hp: Math.min(r.hp, riderMaxHp(data, r)), maxMp: riderMaxMp(data, r), mp: Math.min(r.mp, riderMaxMp(data, r)),
    power: st[WEAPON_STAT[weapon.weaponType ?? 'melee']], magic: st.arcana,
    accuracy: st.agility, dodge: st.agility * c.rider.dodgePerAgility, swift: st.agility,
    defense: st.vigor * c.rider.defensePerVigor + bonusOf(mods, 'riderDefense'),
    critChance: Math.min(c.crit.max, c.crit.base + st.agility * c.crit.perAgility + bonusOf(mods, 'riderCrit')),
    statuses: [],
  };
}

function dragonFighter(data: GameData, d: DragonState, mods: Bonus, id = 'dragon'): Fighter {
  const c = data.combat;
  const st = effectiveDragonStats(data, d);
  return {
    id, kind: 'dragon', name: d.name, element: d.element, element2: d.element2 ?? null, level: d.level,
    maxHp: dragonMaxHp(data, d), hp: Math.min(d.hp, dragonMaxHp(data, d)), maxMp: 0, mp: 0,
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
    id: 'rider', kind: 'rider', name: `${rider.name} & ${dragon.name}`, element: dragon.element, element2: dragon.element2 ?? null,
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
    id: `e${index}`, kind: 'enemy', name: e.name, element: e.element, element2: e.element2 ?? null, level,
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
    second: null,
    third: null,
    skillUses: 0,
    spells: riderLoadout(data, setup.rider),
    spellPlus: Object.fromEntries(riderLoadout(data, setup.rider).filter((id) => setup.rider.spellPlus?.[id]).map((id) => [id, setup.rider.spellPlus[id]!])),
  };
  const partner = (d: DragonState, id: string): SecondDragon => {
    const mods = dragonBonus(data, d);
    return {
      fighter: dragonFighter(data, d, mods, id), breath: 0, bond: d.bond, mods,
      spirit: effectiveDragonStats(data, d).spirit,
      breathMultiplier: data.dragons.stages.find((st) => st.id === d.stage)?.breathMultiplier ?? 1,
      skills: learnedSkills(data, d).map((t) => t.id), cooldowns: {},
    };
  };
  const two = setup.second && setup.second.hp > 0 ? setup.second : null;
  if (two) state.second = partner(two, 'dragon2');
  const three = setup.third && setup.third.hp > 0 ? setup.third : null;
  if (three) state.third = partner(three, 'dragon3');
  chooseIntents(data, state, rng);
  state.rngState = rng.getState();
  return state;
}

// ---------- Helpers ----------

const alive = (f: Fighter | null | undefined): f is Fighter => !!f && f.hp > 0;
const has = (f: Fighter, id: StatusId) => f.statuses.some((s) => s.id === id);

type StatusNumber = 'initiativeMultiplier' | 'defenseMultiplier' | 'damageTakenMultiplier' | 'skipChance'
  | 'accuracyPenalty' | 'damageMultiplier' | 'defenseBonus' | 'dodgeBonus' | 'healMultiplier' | 'breathGainMultiplier' | 'physicalTakenMultiplier';
/** Statuses act through their effect fields in statuses.json, not their ids, so a new status can be data only. */
const statusData = (data: GameData, f: Fighter) => f.statuses.map((s) => data.statuses[s.id]);
/** The product of a multiplier field over a fighter's statuses (1 when none has it). */
function statusProduct(data: GameData, f: Fighter, key: StatusNumber): number {
  let m = 1;
  for (const sd of statusData(data, f)) if (sd[key] !== undefined) m *= sd[key];
  return m;
}
/** The sum of a bonus field over a fighter's statuses. */
function statusSum(data: GameData, f: Fighter, key: StatusNumber): number {
  let n = 0;
  for (const sd of statusData(data, f)) n += sd[key] ?? 0;
  return n;
}
function statusFlag(data: GameData, f: Fighter, key: 'noDodge' | 'taunts' | 'silenced'): boolean {
  return statusData(data, f).some((sd) => sd[key] === true);
}
/** The chance a status makes the fighter lose its turn, combining every status that can. */
function skipChanceOf(data: GameData, f: Fighter): number {
  const chances = statusData(data, f).flatMap((sd) => (sd.skipChance ? [sd.skipChance] : []));
  if (chances.length <= 1) return chances[0] ?? 0;
  return 1 - chances.reduce((keep, p) => keep * (1 - p), 1);
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function livingEnemies(state: BattleState): Fighter[] {
  return state.enemies.filter(alive);
}

export function findFighter(state: BattleState, id: string): Fighter | null {
  if (id === 'rider') return state.rider;
  if (id === 'dragon') return state.dragon;
  if (id === 'dragon2') return state.second?.fighter ?? null;
  if (id === 'dragon3') return state.third?.fighter ?? null;
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

export function skillReady(state: BattleState, skillId: string, which: 'lead' | 'second' | 'third' = 'lead'): boolean {
  if (which !== 'lead') {
    const s = which === 'second' ? state.second : state.third;
    return !!s && s.skills.includes(skillId) && (s.cooldowns[skillId] ?? 0) <= 0 && alive(s.fighter);
  }
  return state.skills.includes(skillId) && (state.cooldowns[skillId] ?? 0) <= 0 && alive(state.dragon);
}

export function secondBreathReady(data: GameData, state: BattleState): boolean {
  return !!state.second && state.second.breath >= data.combat.breath.max;
}

export function thirdBreathReady(data: GameData, state: BattleState): boolean {
  return !!state.third && state.third.breath >= data.combat.breath.max;
}

/** Dragon-and-dragon combos need both dragons awake with enough bond. */
export function duoAvailable(data: GameData, state: BattleState, comboId: string): boolean {
  const combo = data.roost.duoCombos.find((c) => c.id === comboId);
  return !!combo && state.mode === 'normal' && alive(state.dragon) && !!state.second && alive(state.second.fighter)
    && state.bond >= combo.bond && state.second.bond >= combo.bond;
}

/** One dragon partner seen through a common shape, so actions work for either. */
interface Slot {
  f: Fighter;
  mods: Bonus;
  spirit: number;
  breathMultiplier: number;
  skills: string[];
  cooldowns: Record<string, number>;
  which: 'lead' | 'second' | 'third';
  getBreath(): number;
  setBreath(n: number): void;
}

function leadSlot(state: BattleState): Slot | null {
  if (!state.dragon) return null;
  return {
    f: state.dragon, mods: state.dragonMods, spirit: state.spirit, breathMultiplier: state.breathMultiplier,
    skills: state.skills, cooldowns: state.cooldowns, which: 'lead',
    getBreath: () => state.breath, setBreath: (n) => { state.breath = n; },
  };
}

function partnerSlot(s: SecondDragon | null, which: 'second' | 'third'): Slot | null {
  if (!s) return null;
  return {
    f: s.fighter, mods: s.mods, spirit: s.spirit, breathMultiplier: s.breathMultiplier, skills: s.skills,
    cooldowns: s.cooldowns, which, getBreath: () => s.breath, setBreath: (n) => { s.breath = n; },
  };
}
const secondSlot = (state: BattleState) => partnerSlot(state.second, 'second');
const thirdSlot = (state: BattleState) => partnerSlot(state.third, 'third');

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
  /** The dragon guarding the rider this round, if any. */
  guardian: Slot | null;
  /** The dragon bracing this round (the Behemoth's Brace): it takes every hit meant for the rest of the party. */
  bracer: Slot | null;
  breathGain: number;
  breathGain2: number;
  breathGain3: number;
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

  let dodge = target.dodge;
  if (statusFlag(data, target, 'noDodge')) dodge = 0;
  dodge += statusSum(data, target, 'dodgeBonus');
  let hitChance = clamp(c.hit.base + (attacker.accuracy - dodge) * c.hit.perPoint, c.hit.min, c.hit.max);
  hitChance -= statusSum(data, attacker, 'accuracyPenalty');
  if (!rng.chance(hitChance)) {
    events.push({ t: 'miss', actor: attacker.id, target: target.id, text: `${attacker.name}'s ${spec.label} misses ${target.name}.` });
    return 0;
  }

  let mult = defenseMultiplier(data.elements, spec.element, target);
  for (const sd of statusData(data, target)) if (sd.amplify && sd.amplify.element === spec.element) mult *= sd.amplify.multiplier;
  if (spec.strongBonus && mult > data.elements.multipliers.neutral) mult *= 1 + spec.strongBonus;
  const crit = rng.chance(attacker.critChance);
  const levelScale = attacker.kind === 'enemy' ? 1 : 1 + c.levelDamageScale * (attacker.level - 1);
  let base = spec.base * levelScale * (spec.damageMultiplier ?? 1);
  base *= statusProduct(data, attacker, 'damageMultiplier');
  let defense = target.defense;
  defense *= statusProduct(data, target, 'defenseMultiplier');
  defense += statusSum(data, target, 'defenseBonus');
  let takenMult = statusProduct(data, target, 'damageTakenMultiplier');
  // Rend: plain attacks with no element hit harder.
  if (!spec.element) takenMult *= statusProduct(data, target, 'physicalTakenMultiplier');
  if (target.kind === 'rider' && ctx.riderDefending) takenMult *= c.defend.damageTakenMultiplier;
  let dmg = damageFormula(c, {
    base, stat: spec.stat, element: mult, crit, roll: rng.float(c.damageRandMin, c.damageRandMax), defense,
  }) * takenMult;
  dmg = Math.max(c.minDamage, Math.round(dmg));

  const ward = target.statuses.find((s) => data.statuses[s.id].shieldFraction && (s.shield ?? 0) > 0);
  let absorbed = 0;
  if (ward) {
    absorbed = Math.min(ward.shield!, dmg);
    ward.shield = ward.shield! - absorbed;
  }
  const taken = dmg - absorbed;
  target.hp = Math.max(0, target.hp - taken);

  const kind = matchupVs(data.elements, spec.element, target);
  const tags = [crit ? 'Critical!' : '', mult > 1 ? "It's strong!" : mult < 1 ? 'It resists.' : ''].filter(Boolean).join(' ');
  const shieldText = absorbed ? ` (${absorbed} blocked by Ward)` : '';
  events.push({
    t: 'hit', actor: attacker.id, target: target.id, amount: taken, crit, matchup: kind, element: spec.element,
    text: `${attacker.name}'s ${spec.label} hits ${target.name} for ${taken}${shieldText}.${tags ? ' ' + tags : ''}`,
  });

  if (attacker.kind === 'dragon') {
    if (attacker.id === 'dragon2') ctx.breathGain2 += c.breath.onDealDamage;
    else if (attacker.id === 'dragon3') ctx.breathGain3 += c.breath.onDealDamage;
    else ctx.breathGain += c.breath.onDealDamage;
  }
  if (target.kind === 'dragon') {
    if (target.id === 'dragon2') ctx.breathGain2 += c.breath.onTakeDamage;
    else if (target.id === 'dragon3') ctx.breathGain3 += c.breath.onTakeDamage;
    else ctx.breathGain += c.breath.onTakeDamage;
  }
  if (target.hp === 0) events.push({ t: 'ko', target: target.id, text: koText(target) });
  return taken;
}

function koText(f: Fighter): string {
  if (f.kind === 'dragon') return `${f.name} is knocked out!`;
  if (f.kind === 'rider') return `${f.name} falls!`;
  return `${f.name} is defeated!`;
}

function heal(ctx: RoundCtx, actor: Fighter, target: Fighter, amount: number): void {
  if (actor.kind !== 'enemy') amount *= 1 + bonusOf(ctx.state.riderMods, 'healPct') + bonusOf(ctx.state.dragonMods, 'healPct');
  amount *= statusProduct(ctx.data, target, 'healMultiplier');
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
  const healed = target.hp - before;
  ctx.events.push({ t: 'heal', actor: actor.id, target: target.id, amount: healed, text: `${target.name} recovers ${healed} HP.` });
}

/** Healing that talents and gear don't boost (items). */
function healRaw(ctx: RoundCtx, target: Fighter, amount: number): void {
  amount *= statusProduct(ctx.data, target, 'healMultiplier');
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
  const anyDragon = alive(state.dragon) || alive(state.second?.fighter) || alive(state.third?.fighter);
  return (anyDragon ? 1 : data.combat.rider.aloneDamageMultiplier) * pct;
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
      if (statusFlag(data, rider, 'silenced')) {
        events.push({ t: 'act', actor: 'rider', text: `${rider.name} is silenced and attacks instead.` });
        basicAttack(order.target);
        return;
      }
      const spell = state.spells.includes(order.spell) ? battleSpell(data, state, order.spell) : undefined;
      if (!spell) {
        events.push({ t: 'act', actor: 'rider', text: `${rider.name} doesn't know that spell and attacks instead.` });
        basicAttack(order.target);
        return;
      }
      if (rider.mp < spell.mp) {
        events.push({ t: 'act', actor: 'rider', text: `${rider.name} is out of MP and attacks instead.` });
        basicAttack(order.target);
        return;
      }
      rider.mp -= spell.mp;
      if (spell.kind === 'damage') {
        const t = enemyTarget(state, order.target);
        if (!t) return;
        const dealt = strike(ctx, rider, t, { base: spell.base, stat: rider.magic, element: spell.element ?? null, label: spell.name, damageMultiplier: alone });
        if (dealt > 0 && spell.status && t.hp > 0 && ctx.rng.chance(spell.statusChance ?? 1)) addStatus(data, t, spell.status, events);
        return;
      }
      const target = order.target === 'dragon' && alive(state.dragon) ? state.dragon : rider;
      events.push({ t: 'act', actor: 'rider', text: `${rider.name} casts ${spell.name}.` });
      if (spell.kind === 'buff') addStatus(data, target, spell.status!, events);
      else heal(ctx, rider, target, spell.base * (1 + c.levelDamageScale * (rider.level - 1)) * (1 + rider.magic / c.statDivisor));
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

function dragonAct(ctx: RoundCtx, order: DragonOrder, slot: Slot): void {
  const { data, state, events } = ctx;
  const dragon = slot.f;
  const c = data.combat;

  const claw = (targetId: string) => {
    const t = enemyTarget(state, targetId);
    if (t) strike(ctx, dragon, t, { base: c.dragonMoves.claw.base, stat: dragon.power, element: null, label: c.dragonMoves.claw.name, damageMultiplier: 1 + bonusOf(slot.mods, 'clawPct') });
  };

  switch (order.type) {
    case 'claw':
      claw(order.target);
      return;
    case 'breath': {
      if (slot.getBreath() < c.breath.max) {
        claw(order.target);
        return;
      }
      if (statusFlag(data, dragon, 'silenced')) {
        events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} is silenced and claws instead.` });
        claw(order.target);
        return;
      }
      slot.setBreath(0);
      const t = enemyTarget(state, order.target);
      if (!t) return;
      const spec = breathSpec(data, slot, dragon, t, c.dragonMoves.breath.base, c.dragonMoves.breath.name);
      const dealt = strike(ctx, dragon, t, spec);
      if (dealt > 0) breathStatus(ctx, slot, spec.element, t);
      return;
    }
    case 'skill':
      if (statusFlag(data, dragon, 'silenced')) {
        events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} is silenced and claws instead.` });
        claw(order.target);
        return;
      }
      skillAct(ctx, order, slot);
      return;
    case 'guard':
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} spreads its wings over ${state.rider.name}.` });
      return;
    case 'combo':
    case 'duo':
      return; // Combos are resolved separately; they use two actions.
  }
}

function breathSpec(
  data: GameData, slot: Pick<Slot, 'mods' | 'breathMultiplier'>, source: Fighter, target: Fighter, base: number, label: string,
): AttackSpec {
  const { element, factor } = attackElement(data.elements, data.combat.hybridBreathMultiplier, source, target);
  return {
    base: base * slot.breathMultiplier * factor, stat: source.power, element, label,
    damageMultiplier: 1 + bonusOf(slot.mods, 'breathPct'), strongBonus: bonusOf(slot.mods, 'strongBonus'),
  };
}

/** The breath's status, from the element the breath used (a hybrid's better one). */
function breathStatus(ctx: RoundCtx, slot: Pick<Slot, 'mods' | 'spirit'>, element: ElementId | null, target: Fighter): void {
  const { data, state, rng, events } = ctx;
  if (!element) return;
  const c = data.combat;
  const statusId = data.elements.info[element].status;
  const chance = c.breath.statusChanceBase + slot.spirit * c.breath.statusChancePerSpirit + bonusOf(slot.mods, 'breathStatusChance');
  if (!rng.chance(chance)) return;
  // Buff statuses (Ward) protect the rider instead of hurting the enemy.
  if (data.statuses[statusId].kind === 'buff') addStatus(data, state.rider, statusId, events);
  else if (target.hp > 0) addStatus(data, target, statusId, events);
}

function skillAct(ctx: RoundCtx, order: Extract<DragonOrder, { type: 'skill' }>, slot: Slot): void {
  const { data, state, events, rng } = ctx;
  const dragon = slot.f;
  const talent = talentById(data, order.skill);
  const skill = talent?.skill;
  if (!talent || !skill || !skillReady(state, talent.id, slot.which)) {
    events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} isn't ready to do that yet.` });
    return;
  }
  slot.cooldowns[talent.id] = skill.cooldown + 1; // +1 because cooldowns tick at the end of this round
  state.skillUses += 1;
  const statusOn = (target: Fighter) => {
    if (skill.status && target.hp > 0 && rng.chance(skill.statusChance ?? 1)) addStatus(data, target, skill.status, events);
  };
  switch (skill.kind) {
    case 'damage': {
      const t = enemyTarget(state, order.target);
      if (!t) return;
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name}!` });
      const own = attackElement(data.elements, data.combat.hybridBreathMultiplier, dragon, t);
      let dealt = 0;
      for (let i = 0; i < (skill.hits ?? 1) && t.hp > 0; i++) {
        dealt += strike(ctx, dragon, t, {
          base: (skill.base ?? 10) * (skill.element === 'dragon' ? own.factor : 1), stat: dragon.power,
          element: skill.element === 'dragon' ? own.element : null, label: talent.name,
          damageMultiplier: 1 + bonusOf(slot.mods, 'clawPct'), strongBonus: bonusOf(slot.mods, 'strongBonus'),
        });
      }
      if (dealt > 0) statusOn(t);
      return;
    }
    case 'debuff': {
      const t = enemyTarget(state, order.target);
      if (!t) return;
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name} on ${t.name}.` });
      statusOn(t);
      return;
    }
    case 'heal':
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name}.` });
      heal(ctx, dragon, skill.target === 'dragon' ? dragon : state.rider, (skill.base ?? 10) * (1 + dragon.magic / data.combat.statDivisor) * (1 + data.combat.levelDamageScale * (dragon.level - 1)));
      return;
    case 'healAll':
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name}.` });
      heal(ctx, dragon, state.rider, state.rider.maxHp * (skill.fraction ?? 0.1));
      heal(ctx, dragon, dragon, dragon.maxHp * (skill.fraction ?? 0.1));
      return;
    case 'buff':
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name}.` });
      if (skill.status) addStatus(data, skill.target === 'dragon' ? dragon : state.rider, skill.status, events);
      return;
    case 'taunt':
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} lets out a ${talent.name}! Every enemy glares at it.` });
      addStatus(data, dragon, skill.status ?? 'taunt', events);
      return;
    case 'brace':
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name} and plants its feet in front of everyone.` });
      return;
    case 'cleanse':
      for (const f of [state.rider, dragon]) f.statuses = f.statuses.filter((x) => data.statuses[x.id].kind === 'buff');
      events.push({ t: 'act', actor: dragon.id, text: `${dragon.name} uses ${talent.name}. Bad statuses burn away.` });
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
      if (state.breath < data.combat.breath.max || statusFlag(data, unit, 'silenced')) {
        events.push({ t: 'act', actor: 'rider', text: state.breath < data.combat.breath.max ? `The breath meter isn't full. ${unit.name} dive instead!` : `${unit.name} are silenced and dive instead!` });
        if (t) strike(ctx, unit, t, { base: data.combat.ride.moves[0]?.base ?? 20, stat: unit.power, element: null, label: 'Diving Strike' });
        return;
      }
      state.breath = 0;
      if (!t) return;
      const spec = breathSpec(data, { mods: state.dragonMods, breathMultiplier: state.breathMultiplier }, unit, t, move.base ?? 40, move.name);
      const dealt = strike(ctx, unit, t, spec);
      if (dealt > 0) breathStatus(ctx, { mods: state.dragonMods, spirit: state.spirit }, spec.element, t);
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

function duoAct(ctx: RoundCtx, order: Extract<DragonOrder, { type: 'duo' }>): void {
  const { data, state, events } = ctx;
  const combo = data.roost.duoCombos.find((c) => c.id === order.combo);
  const t = enemyTarget(state, order.target);
  const lead = state.dragon;
  const two = state.second?.fighter;
  if (!combo || !t || !lead || !two) return;
  events.push({ t: 'act', actor: 'dragon', text: `${lead.name} and ${two.name}: ${combo.name}!` });
  const own = attackElement(data.elements, data.combat.hybridBreathMultiplier, lead, t);
  strike(ctx, lead, t, {
    base: combo.base * own.factor, stat: (lead.power + two.power) / 2, element: own.element, label: combo.name,
    damageMultiplier: 1 + bonusOf(state.dragonMods, 'comboPct'),
  });
}

function enemyAct(ctx: RoundCtx, enemy: Fighter): void {
  const { data, state, rng, events } = ctx;
  let move = enemyMove(data, state, enemy);
  if (!move) return;
  // Silence: anything but a plain physical attack turns into the enemy's basic attack.
  if (statusFlag(data, enemy, 'silenced') && !(move.intent === 'attack' && move.physical)) {
    const basic = data.enemies[enemy.enemyId ?? '']?.moves.find((m) => m.intent === 'attack' && m.physical);
    events.push({ t: 'act', actor: enemy.id, text: `${enemy.name} is silenced and can't use ${move.name}!` });
    if (!basic) return;
    move = basic;
  }

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
        enemy.element2 = move.shiftTo2 ?? null;
        enemy.shifted = true;
        const turns = elementLabel(data.elements, { element: move.shiftTo, element2: move.shiftTo2 ?? null });
        events.push({ t: 'shift', actor: enemy.id, element: move.shiftTo, text: `${enemy.name} uses ${move.name} and turns ${turns}!` });
      }
      return;
    case 'attack':
    case 'big': {
      // Targets: the rider and every awake dragon, equally. A taunting dragon draws every attack.
      const dragons = [state.dragon, state.second?.fighter, state.third?.fighter].filter(alive);
      const taunting = dragons.find((d) => statusFlag(data, d, 'taunts'));
      let target: Fighter = taunting ?? rng.pick([state.rider, ...dragons]);
      let guardMult = 1;
      const guard = ctx.guardian;
      const brace = ctx.bracer;
      if (brace && alive(brace.f) && target !== brace.f) {
        target = brace.f;
        guardMult = Math.max(0.2, data.combat.guard.damageTakenMultiplier - bonusOf(brace.mods, 'guardReduction'));
        events.push({ t: 'act', actor: brace.f.id, text: `${brace.f.name} braces and takes the hit!` });
      } else if (target.kind === 'rider' && guard && alive(guard.f)) {
        target = guard.f;
        guardMult = Math.max(0.2, data.combat.guard.damageTakenMultiplier - bonusOf(guard.mods, 'guardReduction'));
        events.push({ t: 'act', actor: guard.f.id, text: `${guard.f.name} takes the hit for ${state.rider.name}!` });
      }
      const big = move.intent === 'big' ? data.combat.bigAttackMultiplier : 1;
      // A hybrid enemy's special moves use its better element against the target, like a hybrid dragon's breath.
      const own = move.physical ? { element: null, factor: 1 } : attackElement(data.elements, data.combat.hybridBreathMultiplier, enemy, target);
      const dealt = strike(ctx, enemy, target, {
        base: (enemy.attack ?? 1) * (move.power ?? 1) * big * own.factor, stat: enemy.power, element: own.element,
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
    second: s.second ? { ...s.second, fighter: cf(s.second.fighter), cooldowns: { ...s.second.cooldowns } } : null,
    third: s.third ? { ...s.third, fighter: cf(s.third.fighter), cooldowns: { ...s.third.cooldowns } } : null,
  };
}

export interface RoundResult { state: BattleState; events: BattleEvent[] }

export function resolveRound(data: GameData, prev: BattleState, orders: Orders): RoundResult {
  if (prev.outcome !== 'ongoing') return { state: prev, events: [] };
  const state = cloneState(prev);
  const rng = createRng(state.rngState);
  const c = data.combat;
  const dragonUp = alive(state.dragon);
  const secondUp = !!state.second && alive(state.second.fighter);
  let dragonOrder = dragonUp ? orders.dragon : undefined;
  let secondOrder = secondUp ? orders.second : undefined;
  const thirdUp = !!state.third && alive(state.third.fighter);
  let thirdOrder = thirdUp ? orders.third : undefined;
  if (thirdOrder?.type === 'combo' || thirdOrder?.type === 'duo') thirdOrder = { type: 'claw', target: thirdOrder.target };
  const combo = dragonOrder?.type === 'combo' && comboAvailable(data, state, dragonOrder.combo) ? dragonOrder : null;
  const duo = dragonOrder?.type === 'duo' && duoAvailable(data, state, dragonOrder.combo) ? dragonOrder : null;
  if ((dragonOrder?.type === 'combo' && !combo) || (dragonOrder?.type === 'duo' && !duo)) dragonOrder = { type: 'claw', target: dragonOrder.target };
  if (secondOrder?.type === 'combo' || secondOrder?.type === 'duo') secondOrder = { type: 'claw', target: secondOrder.target };
  if (duo) secondOrder = undefined;
  const lead = leadSlot(state);
  const two = secondSlot(state);
  const three = thirdSlot(state);
  const guardian = !combo && !duo && dragonOrder?.type === 'guard' ? lead : secondOrder?.type === 'guard' ? two : thirdOrder?.type === 'guard' ? three : null;
  // Brace counts from the start of the round, like a guard, so it covers hits that land before the dragon's turn.
  const braces = (slot: Slot | null, order: Orders['dragon'] | undefined): boolean =>
    !!slot && order?.type === 'skill' && talentById(data, order.skill)?.skill?.kind === 'brace'
    && skillReady(state, order.skill, slot.which) && !statusFlag(data, slot.f, 'silenced');
  const bracer = !combo && !duo && braces(lead, dragonOrder) ? lead : braces(two, secondOrder) ? two : braces(three, thirdOrder) ? three : null;

  const ctx: RoundCtx = {
    data, state, rng, events: [],
    riderDefending: !combo && (orders.rider.type === 'defend' || (orders.rider.type === 'ride' && orders.rider.move === 'wing-shield')),
    guardian,
    bracer,
    breathGain: 0,
    breathGain2: 0,
    breathGain3: 0,
  };

  const initiative = (f: Fighter) =>
    f.swift * statusProduct(data, f, 'initiativeMultiplier') + rng.float(0, c.initiativeRandom);

  type Turn = { who: Fighter; init: number; run: () => void };
  const turns: Turn[] = [];
  if (combo) {
    turns.push({ who: state.dragon!, init: Math.max(initiative(state.rider), initiative(state.dragon!)), run: () => comboAct(ctx, combo) });
  } else {
    turns.push({ who: state.rider, init: initiative(state.rider), run: () => riderAct(ctx, orders.rider) });
    if (duo) {
      turns.push({ who: state.dragon!, init: Math.max(initiative(state.dragon!), initiative(state.second!.fighter)), run: () => duoAct(ctx, duo) });
    } else if (dragonUp && dragonOrder && lead) {
      const o = dragonOrder;
      turns.push({ who: state.dragon!, init: initiative(state.dragon!), run: () => dragonAct(ctx, o, lead) });
    }
  }
  if (secondUp && secondOrder && two) {
    const o = secondOrder;
    turns.push({ who: two.f, init: initiative(two.f), run: () => dragonAct(ctx, o, two) });
  }
  if (thirdUp && thirdOrder && three) {
    const o = thirdOrder;
    turns.push({ who: three.f, init: initiative(three.f), run: () => dragonAct(ctx, o, three) });
  }
  for (const e of livingEnemies(state)) turns.push({ who: e, init: initiative(e), run: () => enemyAct(ctx, e) });
  turns.sort((a, b) => b.init - a.init);

  for (const turn of turns) {
    if (turn.who.hp <= 0) continue;
    if (turn.who.kind === 'dragon' && turn.who.hp <= 0) continue;
    const skip = skipChanceOf(data, turn.who);
    if (skip > 0 && rng.chance(skip)) {
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
  const everyone = [state.rider, ...(state.dragon ? [state.dragon] : []), ...(state.second ? [state.second.fighter] : []), ...(state.third ? [state.third.fighter] : []), ...state.enemies].filter(alive);
  for (const f of everyone) {
    for (const s of f.statuses) {
      const sd = data.statuses[s.id];
      if (sd.dotFraction) {
        // A growing damage-over-time (Rot) hurts more each round it has been on.
        const grow = 1 + (sd.dotGrowth ?? 0) * (sd.duration - s.turns);
        const amount = Math.max(1, Math.round(f.maxHp * sd.dotFraction * grow));
        f.hp = Math.max(0, f.hp - amount);
        events.push({ t: 'dot', target: f.id, status: s.id, amount, text: `${f.name} takes ${amount} from ${sd.name}.` });
        if (f.hp === 0) events.push({ t: 'ko', target: f.id, text: koText(f) });
      }
      s.turns -= 1;
    }
    f.statuses = f.statuses.filter((s) => s.turns > 0 && !(data.statuses[s.id].shieldFraction && (s.shield ?? 0) <= 0));
  }
  if (alive(state.dragon) || (state.mode === 'ride' && alive(state.rider))) {
    let gain = c.breath.perRound + state.spirit * c.breath.perSpirit + ctx.breathGain + bonusOf(state.dragonMods, 'breathPerRound');
    if (state.mode === 'ride') gain += c.ride.breathPerRoundBonus;
    else if (ctx.riderDefending && !comboUsed) gain += c.defend.breathBonus;
    const holder = state.mode === 'ride' ? state.rider : state.dragon;
    if (holder) gain *= statusProduct(data, holder, 'breathGainMultiplier');
    state.breath = Math.min(c.breath.max, state.breath + Math.round(gain));
  }
  for (const id of Object.keys(state.cooldowns)) state.cooldowns[id] = Math.max(0, (state.cooldowns[id] ?? 0) - 1);
  const two = state.second;
  if (two && alive(two.fighter)) {
    const gain = (c.breath.perRound + two.spirit * c.breath.perSpirit + ctx.breathGain2 + bonusOf(two.mods, 'breathPerRound'))
      * statusProduct(data, two.fighter, 'breathGainMultiplier');
    two.breath = Math.min(c.breath.max, two.breath + Math.round(gain));
  }
  if (two) for (const id of Object.keys(two.cooldowns)) two.cooldowns[id] = Math.max(0, (two.cooldowns[id] ?? 0) - 1);
  const three = state.third;
  if (three && alive(three.fighter)) {
    const gain = (c.breath.perRound + three.spirit * c.breath.perSpirit + ctx.breathGain3 + bonusOf(three.mods, 'breathPerRound'))
      * statusProduct(data, three.fighter, 'breathGainMultiplier');
    three.breath = Math.min(c.breath.max, three.breath + Math.round(gain));
  }
  if (three) for (const id of Object.keys(three.cooldowns)) three.cooldowns[id] = Math.max(0, (three.cooldowns[id] ?? 0) - 1);
}
