/** Shared data and state types for the game core. */

export type ElementId = 'fire' | 'frost' | 'verdant' | 'stone' | 'storm' | 'tide' | 'light' | 'shadow';

export type RiderStat = 'strength' | 'agility' | 'arcana' | 'vigor';
export type DragonStat = 'might' | 'scale' | 'swift' | 'spirit';
export type RiderStats = Record<RiderStat, number>;
export type DragonStats = Record<DragonStat, number>;

export const RIDER_STATS: readonly RiderStat[] = ['strength', 'agility', 'arcana', 'vigor'];
export const DRAGON_STATS: readonly DragonStat[] = ['might', 'scale', 'swift', 'spirit'];

export type StatusId =
  | 'burn' | 'chill' | 'root' | 'crack' | 'shock' | 'soak' | 'blind' | 'ward' | 'fury' | 'harden' | 'fade';

export interface ElementInfo { name: string; color: string; status: StatusId; symbol: string }

export interface ElementsData {
  ids: ElementId[];
  ring: ElementId[];
  pairs: [ElementId, ElementId][];
  starters: ElementId[];
  multipliers: { strong: number; neutral: number; weak: number; same: number };
  info: Record<ElementId, ElementInfo>;
}

export interface SpellData { id: string; name: string; kind: 'damage' | 'heal'; base: number; mp: number }
export interface ComboData { id: string; name: string; bond: number; base: number; description: string }

export interface CombatData {
  statDivisor: number;
  critMultiplier: number;
  damageRandMin: number;
  damageRandMax: number;
  minDamage: number;
  hit: { base: number; perPoint: number; min: number; max: number };
  crit: { base: number; perAgility: number; perSwift: number; max: number };
  initiativeRandom: number;
  rider: {
    baseHp: number; hpPerVigor: number; hpPerLevel: number; baseMp: number; mpPerArcana: number;
    defensePerVigor: number; dodgePerAgility: number; aloneDamageMultiplier: number;
  };
  dragon: { baseHp: number; hpPerScale: number; hpPerLevel: number; defensePerScale: number; accuracyPerSwift: number; dodgePerSwift: number };
  defend: { damageTakenMultiplier: number; breathBonus: number };
  guard: { damageTakenMultiplier: number };
  breath: {
    max: number; perRound: number; perSpirit: number; onDealDamage: number; onTakeDamage: number;
    statusChanceBase: number; statusChancePerSpirit: number;
  };
  flee: { base: number; perPoint: number; min: number; max: number };
  riderMoves: { attack: { name: string; base: number }; spells: SpellData[] };
  dragonMoves: { claw: { name: string; base: number }; breath: { name: string; base: number } };
  combos: ComboData[];
  bigAttackMultiplier: number;
  /** Player move base damage grows by this fraction per level above 1 (stands in for gear). */
  levelDamageScale: number;
}

export interface StatusData {
  name: string; icon: string; short: string; duration: number; kind: 'buff' | 'debuff'; description: string;
  dotFraction?: number; initiativeMultiplier?: number; noDodge?: boolean; defenseMultiplier?: number;
  damageTakenMultiplier?: number; skipChance?: number; stormDamageMultiplier?: number; accuracyPenalty?: number;
  shieldFraction?: number; damageMultiplier?: number; defenseBonus?: number; dodgeBonus?: number;
}

export interface ProgressionData {
  levelCap: number;
  xpBase: number;
  xpExponent: number;
  statPointsPerLevel: number;
  secondPartnerRiderLevel: number;
  levelUpRestoresHp: boolean;
  enemyXpBase: number;
  enemyXpExponent: number;
  enemyGoldBase: number;
  enemyGoldPerLevel: number;
  riderBaseStats: RiderStats;
  bond: { max: number; perWin: number; perBossWin: number };
  startingInventory: Record<string, number>;
  startingGold: number;
}

export interface StageData { id: string; name: string; minLevel: number; maxLevel: number; bond: number }

export interface DragonsData {
  stages: StageData[];
  baseStats: DragonStats;
  elementBonus: Partial<Record<ElementId, Partial<DragonStats>>>;
  eggs: Partial<Record<ElementId, { name: string; blurb: string }>>;
  hatchTaps: number;
  nameMaxLength: number;
  nameSuggestions: string[];
  palette: string[];
}

export interface CareData {
  mealsPerDay: number;
  bondPerMeal: number;
  favoriteBondMultiplier: number;
  groom: { durationSeconds: number; bondBase: number; tapsPerBond: number; maxBond: number; targets: number };
  wellKept: { xpBonus: number; fights: number };
}

export interface FoodData { id: string; name: string; icon: string; statPoints: number; price: number }

export interface ItemData {
  id: string; name: string; icon: string; effect: 'healRider' | 'healDragon' | 'restoreMp'; fraction: number; description: string;
}

export type IntentKind = 'attack' | 'big' | 'buff' | 'heal' | 'shift';

export interface EnemyMove {
  id: string;
  name: string;
  intent: IntentKind;
  weight: number;
  power?: number;
  status?: StatusId;
  statusChance?: number;
  heal?: number;
  buff?: StatusId;
  shiftTo?: ElementId;
  /** Physical moves ignore the enemy's element. */
  physical?: boolean;
  target?: 'player' | 'self' | 'ally';
  condition?: 'allyHurt' | 'selfHurt' | 'notShifted';
}

export interface EnemyStats { hp: number; attack: number; power: number; defense: number; swift: number; dodge: number }

export interface EnemyData {
  id: string;
  name: string;
  element: ElementId;
  flavor: string;
  boss?: boolean;
  miniBoss?: boolean;
  xpMultiplier?: number;
  goldMultiplier?: number;
  base: EnemyStats;
  perLevel: EnemyStats;
  resist?: Partial<Record<ElementId, number>>;
  moves: EnemyMove[];
}

export interface EncounterData { enemies: string[]; weight: number; minLevel?: number }

export interface ZoneData {
  id: string;
  name: string;
  element: ElementId;
  minLevel: number;
  maxLevel: number;
  gate: string | null;
  blurb: string;
  fights: { min: number; max: number };
  encounters: EncounterData[];
  levelSpread: number;
  multiEnemyLevelOffset: number;
  boss: { enemy: string; level: number; unlockRiderLevel: number };
  miniBoss: { enemy: string; levelOffset: number };
  dropChances: Record<string, number>;
}

export interface GameData {
  elements: ElementsData;
  combat: CombatData;
  statuses: Record<StatusId, StatusData>;
  progression: ProgressionData;
  dragons: DragonsData;
  care: CareData;
  foods: FoodData[];
  items: ItemData[];
  enemies: Record<string, EnemyData>;
  zones: ZoneData[];
}

// ---- Persistent character state (lives in the save) ----

export interface RiderState {
  name: string;
  level: number;
  xp: number;
  statPoints: number;
  stats: RiderStats;
  hp: number;
  mp: number;
  gold: number;
  inventory: Record<string, number>;
}

export interface DragonState {
  id: string;
  name: string;
  element: ElementId;
  stage: string;
  level: number;
  xp: number;
  statPoints: number;
  stats: DragonStats;
  hp: number;
  bond: number;
  colors: { primary: string; secondary: string };
  favoriteFood: string;
  foodsTried: string[];
  hatchedAt: number;
}
