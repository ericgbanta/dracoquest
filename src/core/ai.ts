/**
 * A simple auto-battle player, used by the balance simulator and tests.
 * It plays the way a sensible player would, not optimally.
 */
import { breathReady, comboAvailable, enemyMove, livingEnemies, skillReady, type BattleState, type Orders } from './battle';
import { talentById } from './loadout';
import { defenseMultiplier } from './elements';
import { knownSpells, spellById } from './spells';
import type { ElementId, GameData, SpellData } from './types';

/** How well a damage spell does against a defender (hybrids included): base power times the element multiplier. */
function spellScore(data: GameData, s: SpellData, defender: Parameters<typeof defenseMultiplier>[2]): number {
  return s.base * defenseMultiplier(data.elements, s.element ?? null, defender);
}

/**
 * A sensible loadout for a zone: the best heal, the two best damage spells
 * against the zone's element, and Ward when there is room.
 */
export function suggestedLoadout(data: GameData, level: number, zoneElement: ElementId | null): string[] {
  const known = knownSpells(data, level);
  const heal = known.filter((s) => s.kind === 'heal').sort((a, b) => b.base - a.base)[0];
  const damage = known.filter((s) => s.kind === 'damage').sort((a, b) => spellScore(data, b, { element: zoneElement }) - spellScore(data, a, { element: zoneElement }));
  const buff = known.find((s) => s.kind === 'buff');
  const picks = [heal, damage[0], buff, damage[1], damage[2]].filter((s): s is SpellData => !!s);
  return [...new Set(picks.map((s) => s.id))].slice(0, data.progression.spellLoadoutSize);
}

export function autoOrders(data: GameData, state: BattleState): Orders {
  const enemies = livingEnemies(state);
  const target = enemies.reduce((a, b) => (b.hp < a.hp ? b : a), enemies[0]!);
  const rider = state.rider;
  const riderPct = rider.hp / rider.maxHp;
  const bigIncoming = enemies.some((e) => enemyMove(data, state, e)?.intent === 'big');
  const has = (id: string) => (state.inventory[id] ?? 0) > 0;

  if (state.mode === 'ride') {
    if (riderPct < 0.35 && has('potion')) return { rider: { type: 'item', item: 'potion' } };
    if (riderPct < 0.35 && has('dragon-treat')) return { rider: { type: 'item', item: 'dragon-treat' } };
    if (breathReady(data, state)) return { rider: { type: 'ride', move: 'skyfire', target: target.id } };
    if (bigIncoming && riderPct < 0.6) return { rider: { type: 'ride', move: 'wing-shield', target: target.id } };
    return { rider: { type: 'ride', move: 'dive', target: target.id } };
  }

  const dragon = state.dragon && state.dragon.hp > 0 ? state.dragon : null;
  const loadout = state.spells.map((id) => spellById(data, id)).filter((x): x is SpellData => !!x);
  const heals = loadout.filter((x) => x.kind === 'heal').sort((a, b) => b.base - a.base);
  const healSpell = heals.find((x) => rider.mp >= x.mp);
  // Keep enough MP for the cheapest heal before spending on anything else.
  const reserve = heals.length ? Math.min(...heals.map((x) => x.mp)) : 0;
  const ward = loadout.find((x) => x.kind === 'buff' && x.status === 'ward');
  const neutral = data.elements.multipliers.neutral;
  const damage = loadout
    .filter((x) => x.kind === 'damage' && rider.mp >= x.mp + reserve)
    .map((x) => ({ x, score: spellScore(data, x, target) }))
    .sort((a, b) => b.score - a.score)[0];
  const warded = rider.statuses.some((x) => x.id === 'ward');

  let riderOrder: Orders['rider'];
  if (riderPct < 0.35 && has('potion')) riderOrder = { type: 'item', item: 'potion' };
  else if (riderPct < 0.55 && healSpell) riderOrder = { type: 'spell', spell: healSpell.id, target: 'rider' };
  else if (dragon && dragon.hp / dragon.maxHp < 0.3 && has('dragon-treat')) riderOrder = { type: 'item', item: 'dragon-treat' };
  else if (ward && bigIncoming && !warded && riderPct < 0.8 && rider.mp >= ward.mp + reserve) riderOrder = { type: 'spell', spell: ward.id, target: 'rider' };
  else if (damage && (state.weapon.type !== 'magic' || damage.score > damage.x.base * neutral)) riderOrder = { type: 'spell', spell: damage.x.id, target: target.id };
  else riderOrder = { type: 'attack', target: target.id };

  if (!dragon) return { rider: riderOrder };

  const ready = state.skills.filter((id) => skillReady(state, id)).map((id) => talentById(data, id)!);
  const skill = (kind: string) => ready.find((t) => t.skill?.kind === kind);
  const order = (d: Orders['dragon']): Orders => ({ rider: riderOrder, dragon: d });

  const heal = skill('heal') ?? skill('healAll');
  if (heal && riderPct < 0.5) return order({ type: 'skill', skill: heal.id, target: 'rider' });
  const riderAttacking = riderOrder.type === 'attack' || (riderOrder.type === 'spell' && spellById(data, riderOrder.spell)?.kind === 'damage');
  const combo = [...data.combat.combos].reverse().find((c) => comboAvailable(data, state, c.id));
  if (combo && riderAttacking) return order({ type: 'combo', combo: combo.id, target: target.id });
  if (breathReady(data, state)) return order({ type: 'breath', target: target.id });
  const taunt = skill('taunt');
  if (taunt && bigIncoming && riderPct < 0.6) return order({ type: 'skill', skill: taunt.id, target: target.id });
  if (bigIncoming && riderPct < 0.5) return order({ type: 'guard' });
  const attackSkill = skill('damage') ?? skill('debuff') ?? skill('buff');
  if (attackSkill) return order({ type: 'skill', skill: attackSkill.id, target: target.id });
  return order({ type: 'claw', target: target.id });
}
