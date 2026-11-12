/**
 * Zone runs: 3 to 5 fights from the zone's encounter table, then the boss
 * (once the rider is strong enough) or a mini-boss.
 */
import type { Rng } from './rng';
import { enemyGold, enemyXp } from './progression';
import type { BattleState, EnemySpawn } from './battle';
import type { Bonus, DialogueLine, ElementId, GameData, Materials, QuestData, ZoneData } from './types';

export type FightKind = 'normal' | 'mini' | 'boss' | 'quest' | 'story';

export interface PlannedFight { kind: FightKind; enemies: EnemySpawn[]; intro?: DialogueLine[] }

export interface RunState {
  zoneId: string;
  fights: PlannedFight[];
  /** Index of the current fight. */
  index: number;
  battle: BattleState | null;
  /** Set for a growth quest run. */
  questId?: string;
  /** Set for a story quest run. */
  storyId?: string;
  totals: { xp: number; gold: number; drops: Record<string, number> };
}

export interface Rewards { xp: number; gold: number; drops: Record<string, number>; egg?: ElementId; gear?: string[]; materials?: Materials }

/**
 * Gear from a won fight. A boss or mini-boss drops its trophy on the first
 * kill, then by chance; a regular fight may drop one of the zone's gear.
 * Nothing drops that the rider already owns.
 */
export function rollGear(
  zone: ZoneData, kind: FightKind, owned: ReadonlySet<string>, firstKill: boolean, rng: Rng, dropPct = 0,
): string[] {
  const out: string[] = [];
  const trophy = kind === 'boss' ? zone.boss.trophy : kind === 'mini' ? zone.miniBoss.trophy : undefined;
  if (trophy && !owned.has(trophy.gear) && (firstKill || rng.chance(trophy.chance))) out.push(trophy.gear);
  if (kind === 'normal' && zone.gearDrops) {
    const left = zone.gearDrops.gear.filter((id) => !owned.has(id));
    if (left.length && rng.chance(zone.gearDrops.chance * (1 + dropPct))) out.push(rng.pick(left));
  }
  return out;
}

export function getZone(data: GameData, zoneId: string): ZoneData {
  const z = data.zones.find((x) => x.id === zoneId);
  if (!z) throw new Error(`Unknown zone ${zoneId}`);
  return z;
}

export function bossUnlocked(zone: ZoneData, riderLevel: number): boolean {
  return riderLevel >= zone.boss.unlockRiderLevel;
}

const clampLevel = (zone: ZoneData, level: number) => Math.max(zone.minLevel, Math.min(zone.maxLevel, level));

export function planRun(data: GameData, zoneId: string, riderLevel: number, rng: Rng): PlannedFight[] {
  const zone = getZone(data, zoneId);
  const count = rng.int(zone.fights.min, zone.fights.max);
  const table = zone.encounters.filter((e) => (e.minLevel ?? 0) <= riderLevel);
  const total = table.reduce((s, e) => s + e.weight, 0);
  const fights: PlannedFight[] = [];
  for (let i = 0; i < count; i++) {
    let roll = rng.float(0, total);
    let enc = table[table.length - 1]!;
    for (const e of table) {
      roll -= e.weight;
      if (roll < 0) { enc = e; break; }
    }
    const offset = enc.enemies.length > 1 ? zone.multiEnemyLevelOffset : 0;
    fights.push({
      kind: 'normal',
      enemies: enc.enemies.map((id) => ({
        enemyId: id,
        level: clampLevel(zone, riderLevel + offset + rng.int(-zone.levelSpread, zone.levelSpread)),
      })),
    });
  }
  if (bossUnlocked(zone, riderLevel)) {
    fights.push({ kind: 'boss', enemies: [{ enemyId: zone.boss.enemy, level: zone.boss.level }] });
  } else {
    fights.push({ kind: 'mini', enemies: [{ enemyId: zone.miniBoss.enemy, level: clampLevel(zone, riderLevel + zone.miniBoss.levelOffset) }] });
  }
  return fights;
}

/** The fights of a growth quest, levelled to the dragon. */
export function planQuest(quest: QuestData, dragonLevel: number): PlannedFight[] {
  return quest.steps.map((step) => ({
    kind: 'quest',
    intro: step.intro,
    enemies: step.enemies.map((id) => ({ enemyId: id, level: Math.max(1, dragonLevel + step.levelOffset) })),
  }));
}

/** XP, gold, and item drops for winning a battle. */
export function rollRewards(data: GameData, zoneId: string, battle: BattleState, rng: Rng, xpBonus = 0, mods: Bonus = {}): Rewards {
  const zone = getZone(data, zoneId);
  let xp = 0;
  let gold = 0;
  for (const f of battle.enemies) {
    const e = data.enemies[f.enemyId!]!;
    xp += enemyXp(data.progression, f.level, e.xpMultiplier ?? 1);
    gold += enemyGold(data.progression, f.level, e.goldMultiplier ?? 1);
  }
  xp = Math.round(xp * (1 + xpBonus));
  gold = Math.round(gold * rng.float(0.8, 1.2) * (1 + (mods.goldPct ?? 0)));
  const drops: Record<string, number> = {};
  for (const [item, chance] of Object.entries(zone.dropChances)) {
    if (rng.chance(chance * (1 + (mods.dropPct ?? 0)))) drops[item] = (drops[item] ?? 0) + 1;
  }
  return { xp, gold, drops };
}
