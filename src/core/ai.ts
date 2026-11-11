/**
 * A simple auto-battle player, used by the balance simulator and tests.
 * It plays the way a sensible player would, not optimally.
 */
import { breathReady, comboAvailable, enemyMove, livingEnemies, skillReady, type BattleState, type Orders } from './battle';
import { talentById } from './loadout';
import type { GameData } from './types';

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
  const spells = data.combat.riderMoves.spells;
  const bolt = spells.find((s) => s.kind === 'damage');
  const mend = spells.find((s) => s.kind === 'heal');

  let riderOrder: Orders['rider'];
  if (riderPct < 0.35 && has('potion')) riderOrder = { type: 'item', item: 'potion' };
  else if (riderPct < 0.55 && mend && rider.mp >= mend.mp) riderOrder = { type: 'spell', spell: mend.id, target: 'rider' };
  else if (dragon && dragon.hp / dragon.maxHp < 0.3 && has('dragon-treat')) riderOrder = { type: 'item', item: 'dragon-treat' };
  else if (bolt && mend && rider.mp >= bolt.mp + mend.mp && state.weapon.type !== 'magic') riderOrder = { type: 'spell', spell: bolt.id, target: target.id };
  else riderOrder = { type: 'attack', target: target.id };

  if (!dragon) return { rider: riderOrder };

  const ready = state.skills.filter((id) => skillReady(state, id)).map((id) => talentById(data, id)!);
  const skill = (kind: string) => ready.find((t) => t.skill?.kind === kind);
  const order = (d: Orders['dragon']): Orders => ({ rider: riderOrder, dragon: d });

  const heal = skill('heal') ?? skill('healAll');
  if (heal && riderPct < 0.5) return order({ type: 'skill', skill: heal.id, target: 'rider' });
  const riderAttacking = riderOrder.type === 'attack' || (riderOrder.type === 'spell' && riderOrder.spell === bolt?.id);
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
