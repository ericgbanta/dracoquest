/**
 * A simple auto-battle player, used by the balance simulator and tests.
 * It plays the way a sensible new player would, not optimally.
 */
import { breathReady, comboAvailable, enemyMove, livingEnemies, type BattleState, type Orders } from './battle';
import type { GameData } from './types';

export function autoOrders(data: GameData, state: BattleState): Orders {
  const enemies = livingEnemies(state);
  const target = enemies.reduce((a, b) => (b.hp < a.hp ? b : a), enemies[0]!);
  const rider = state.rider;
  const dragon = state.dragon && state.dragon.hp > 0 ? state.dragon : null;
  const spells = data.combat.riderMoves.spells;
  const bolt = spells.find((s) => s.kind === 'damage');
  const mend = spells.find((s) => s.kind === 'heal');
  const bigIncoming = enemies.some((e) => enemyMove(data, state, e)?.intent === 'big');
  const riderPct = rider.hp / rider.maxHp;

  let riderOrder: Orders['rider'];
  if (riderPct < 0.35 && (state.inventory['potion'] ?? 0) > 0) riderOrder = { type: 'item', item: 'potion' };
  else if (riderPct < 0.55 && mend && rider.mp >= mend.mp) riderOrder = { type: 'spell', spell: mend.id, target: 'rider' };
  else if (dragon && dragon.hp / dragon.maxHp < 0.3 && (state.inventory['dragon-treat'] ?? 0) > 0) riderOrder = { type: 'item', item: 'dragon-treat' };
  else if (bolt && mend && rider.mp >= bolt.mp + mend.mp) riderOrder = { type: 'spell', spell: bolt.id, target: target.id };
  else riderOrder = { type: 'attack', target: target.id };

  if (!dragon) return { rider: riderOrder };

  const riderAttacking = riderOrder.type === 'attack' || (riderOrder.type === 'spell' && riderOrder.spell === bolt?.id);
  const combo = [...data.combat.combos].reverse().find((c) => comboAvailable(data, state, c.id));
  if (combo && riderAttacking) return { rider: riderOrder, dragon: { type: 'combo', combo: combo.id, target: target.id } };
  if (breathReady(data, state)) return { rider: riderOrder, dragon: { type: 'breath', target: target.id } };
  if (bigIncoming && riderPct < 0.5) return { rider: riderOrder, dragon: { type: 'guard' } };
  return { rider: riderOrder, dragon: { type: 'claw', target: target.id } };
}
