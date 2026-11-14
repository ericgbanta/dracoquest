/**
 * Zone runs: 3 to 5 fights from the zone's encounter table, then the boss
 * (once the rider is strong enough) or a mini-boss.
 */
import type { Rng } from './rng';
import { enemyGold, enemyXp } from './progression';
import type { BattleState, EnemySpawn } from './battle';
import type { Bonus, DialogueLine, EggSpec, GameData, Materials, QuestData, RareData, SpawnRewards, ZoneData } from './types';

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

export interface Rewards {
  xp: number; gold: number; drops: Record<string, number>; egg?: EggSpec; gear?: string[]; materials?: Materials;
  /** Embers from a rare. */
  embers?: number;
}

/** The reward rules for a defeated enemy: a rare's, a champion's, or none for a plain enemy. */
export function spawnRewards(data: GameData, f: { rare?: string; traits?: string[] }): SpawnRewards | null {
  if (f.rare) return data.champions.rare.rewards;
  if (f.traits?.length) return data.champions.champion.rewards;
  return null;
}

/** How a champion or rare looks and what its traits are, for the battle screen. Null for a plain enemy. */
export function specialOf(data: GameData, f: { rare?: string; traits?: string[] }): { kind: 'champion' | 'rare'; tint: string; scale: number; traits: { id: string; name: string; icon: string; description: string }[] } | null {
  const traits = (f.traits ?? []).flatMap((id) => {
    const t = data.champions.traits[id];
    return t ? [{ id, name: t.name, icon: t.icon, description: t.description }] : [];
  });
  if (f.rare) {
    const r = data.champions.rares.find((x) => x.id === f.rare);
    return { kind: 'rare', tint: r?.tint ?? 'none', scale: data.champions.rare.scale, traits };
  }
  if (!traits.length) return null;
  return { kind: 'champion', tint: data.champions.traits[traits[0]!.id]!.tint, scale: 1, traits };
}

/** How much the zone gear chance grows for this fight's champions and rares (the best one counts). */
export function gearChanceFor(data: GameData, battle: BattleState): number {
  return Math.max(1, ...battle.enemies.map((f) => spawnRewards(data, f)?.gearChance ?? 1));
}

/**
 * Gear from a won fight. A boss or mini-boss drops its trophy on the first
 * kill, then by chance; a regular fight may drop one of the zone's gear.
 * Nothing drops that the rider already owns.
 */
export function rollGear(
  zone: ZoneData, kind: FightKind, owned: ReadonlySet<string>, firstKill: boolean, rng: Rng, dropPct = 0, gearChance = 1,
): string[] {
  const out: string[] = [];
  const trophy = kind === 'boss' ? zone.boss.trophy : kind === 'mini' ? zone.miniBoss.trophy : undefined;
  if (trophy && !owned.has(trophy.gear) && (firstKill || rng.chance(trophy.chance))) out.push(trophy.gear);
  if (kind === 'normal' && zone.gearDrops) {
    const left = zone.gearDrops.gear.filter((id) => !owned.has(id));
    if (left.length && rng.chance(zone.gearDrops.chance * gearChance * (1 + dropPct))) out.push(rng.pick(left));
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

/** One or two different champion traits, picked at random. */
export function rollTraits(data: GameData, rng: Rng): string[] {
  const ids = Object.keys(data.champions.traits);
  const first = rng.pick(ids);
  if (!rng.chance(data.champions.champion.twoTraitChance)) return [first];
  return [first, rng.pick(ids.filter((id) => id !== first))];
}

/** The zone's named rare, if it has one. */
export function zoneRare(data: GameData, zoneId: string): RareData | undefined {
  return data.champions.rares.find((r) => r.zone === zoneId);
}

/**
 * A regular hunt fight may be replaced by the zone's rare, alone; otherwise
 * each enemy in it may be a champion. Story, quest and boss fights never change.
 */
export function rollSpecials(data: GameData, zone: ZoneData, riderLevel: number, enemies: EnemySpawn[], rng: Rng): EnemySpawn[] {
  const { champion, rare: rareRule } = data.champions;
  const rare = zoneRare(data, zone.id);
  if (rare && riderLevel >= rareRule.minRiderLevel && rng.chance(rareRule.chance)) {
    return [{ enemyId: rare.enemy, level: clampLevel(zone, riderLevel + rareRule.levelOffset), rare: rare.id }];
  }
  if (riderLevel < champion.minRiderLevel) return enemies;
  return enemies.map((e) => (rng.chance(champion.chance) ? { ...e, traits: rollTraits(data, rng) } : e));
}

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
    const enemies = enc.enemies.map((id) => ({
      enemyId: id,
      level: clampLevel(zone, riderLevel + offset + rng.int(-zone.levelSpread, zone.levelSpread)),
    }));
    fights.push({ kind: 'normal', enemies: rollSpecials(data, zone, riderLevel, enemies, rng) });
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
  let extraDrop = 0;
  let embers = 0;
  const drops: Record<string, number> = {};
  for (const f of battle.enemies) {
    const e = data.enemies[f.enemyId!]!;
    // Champions and rares pay more; a rare also brings embers and items.
    const special = spawnRewards(data, f);
    xp += enemyXp(data.progression, f.level, e.xpMultiplier ?? 1) * (special?.xp ?? 1);
    gold += enemyGold(data.progression, f.level, e.goldMultiplier ?? 1) * (special?.gold ?? 1);
    extraDrop = Math.max(extraDrop, special?.dropPct ?? 0);
    embers += special?.embers ?? 0;
    for (const [item, n] of Object.entries(special?.items ?? {})) drops[item] = (drops[item] ?? 0) + n;
  }
  xp = Math.round(xp * (1 + xpBonus));
  gold = Math.round(gold * rng.float(0.8, 1.2) * (1 + (mods.goldPct ?? 0)));
  for (const [item, chance] of Object.entries(zone.dropChances)) {
    if (rng.chance(chance * (1 + (mods.dropPct ?? 0) + extraDrop))) drops[item] = (drops[item] ?? 0) + 1;
  }
  return embers ? { xp, gold, drops, embers } : { xp, gold, drops };
}
