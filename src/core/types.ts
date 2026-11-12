/** Shared data and state types for the game core. */

export type ElementId = 'fire' | 'frost' | 'verdant' | 'stone' | 'storm' | 'tide' | 'light' | 'shadow';

export type RiderStat = 'strength' | 'agility' | 'arcana' | 'vigor';
export type DragonStat = 'might' | 'scale' | 'swift' | 'spirit';
export type RiderStats = Record<RiderStat, number>;
export type DragonStats = Record<DragonStat, number>;

export const RIDER_STATS: readonly RiderStat[] = ['strength', 'agility', 'arcana', 'vigor'];
export const DRAGON_STATS: readonly DragonStat[] = ['might', 'scale', 'swift', 'spirit'];

export type StatusId =
  | 'burn' | 'chill' | 'root' | 'crack' | 'shock' | 'soak' | 'blind' | 'ward' | 'fury' | 'harden' | 'fade' | 'taunt';

/** Stat and effect bonuses from gear and talents. Every key is optional and adds up. */
export type BonusKey =
  | RiderStat | DragonStat
  | 'riderHp' | 'riderMp' | 'riderDefense' | 'riderCrit' | 'riderDamagePct'
  | 'dragonHp' | 'dragonDefense' | 'dragonCrit' | 'dragonDodge'
  | 'clawPct' | 'breathPct' | 'breathPerRound' | 'breathStatusChance' | 'strongBonus'
  | 'guardReduction' | 'healPct' | 'comboPct' | 'goldPct' | 'dropPct';
export type Bonus = Partial<Record<BonusKey, number>>;

export type WeaponType = 'melee' | 'ranged' | 'magic';
export type RiderSlot = 'weapon' | 'armor' | 'trinket';
export type DragonSlot = 'saddle' | 'horn' | 'charm';
export type GearSlot = RiderSlot | DragonSlot;
export const RIDER_SLOTS: readonly RiderSlot[] = ['weapon', 'armor', 'trinket'];
export const DRAGON_SLOTS: readonly DragonSlot[] = ['saddle', 'horn', 'charm'];

export interface GearData {
  id: string;
  name: string;
  slot: GearSlot;
  level: number;
  price: number;
  bonus: Bonus;
  description: string;
  weaponType?: WeaponType;
  element?: ElementId | null;
  damage?: number;
  /** Only sold during this seasonal event. */
  event?: string;
}

export type TalentTree = 'protection' | 'elemental' | 'fighting' | 'assistance' | 'mischief';

export interface TalentSkill {
  kind: 'damage' | 'heal' | 'healAll' | 'buff' | 'debuff' | 'taunt' | 'cleanse';
  cooldown: number;
  base?: number;
  hits?: number;
  element?: 'dragon' | null;
  status?: StatusId;
  statusChance?: number;
  target?: 'rider' | 'dragon';
  fraction?: number;
}

export interface TalentData {
  id: string;
  tree: TalentTree;
  name: string;
  /** Points already spent in this tree before this talent can be learned. */
  tier: number;
  ranks: number;
  description: string;
  bonusPerRank?: Bonus;
  skill?: TalentSkill;
  /** Capstones need this life stage. */
  requiresStage?: string;
}

export interface TalentsData {
  trees: { id: TalentTree; name: string; focus: string }[];
  respec: { freePerStage: number; goldPerDragonLevel: number };
  talents: TalentData[];
}

export interface DialogueLine { speaker: 'rider' | 'dragon' | 'narrator'; text: string }

export interface QuestStep { intro: DialogueLine[]; enemies: string[]; levelOffset: number }

export interface QuestData {
  id: string;
  name: string;
  stage: string;
  zone: string;
  description: string;
  steps: QuestStep[];
  outro: DialogueLine[];
}

export type BuildingId = 'nest' | 'pantry' | 'hatchery' | 'training' | 'expeditions';
export type TemperamentId = 'bold' | 'gentle' | 'clever' | 'proud';
export interface Cost { gold: number; embers: number }

export interface RoostData {
  buildings: {
    nest: { name: string; description: string; levels: { slots: number; cost: Cost | null }[] };
    pantry: { name: string; description: string; levels: { minutesPerFood: number; store: number; premiumChance: number; cost: Cost | null }[] };
    hatchery: { name: string; description: string; levels: { slots: number; hours: number; cost: Cost | null }[]; incubateEmbers: number };
    training: { name: string; description: string; levels: { fightsPerHour: number; maxHours: number; cost: Cost | null }[] };
    expeditions: { name: string; description: string; levels: { maxHours: number; lootMultiplier: number; cost: Cost | null }[] };
  };
  trips: { id: string; name: string; hours: number; minLevel: number; gold: [number, number]; food: number; emberChance: number; blurb: string }[];
  premiumFood: string;
  embers: { bossFirstKill: number; bossRepeat: number; wellKeptDay: number; streakBonusEvery: number; streakBonus: number };
  temperament: {
    settleAt: number;
    points: Record<'fightWon' | 'bossWon' | 'care' | 'groom' | 'skill' | 'expedition' | 'training', number>;
    types: Record<TemperamentId, { name: string; from: string; bonus: Bonus; passive: string; lines: string[] }>;
  };
  duoCombos: { id: string; name: string; bond: number; base: number; description: string }[];
}

export interface ShopData {
  stock: string[];
  items: Record<string, number>;
  /** Eggs the town sells, by element, priced in gold. */
  eggs?: Partial<Record<ElementId, number>>;
  sellFraction: number;
}

export interface ElementInfo { name: string; color: string; status: StatusId; symbol: string }

export interface ElementsData {
  ids: ElementId[];
  ring: ElementId[];
  pairs: [ElementId, ElementId][];
  starters: ElementId[];
  multipliers: { strong: number; neutral: number; weak: number; same: number };
  info: Record<ElementId, ElementInfo>;
}

export interface SpellData {
  id: string;
  name: string;
  /** damage hits an enemy; heal and buff target the rider or the lead dragon. */
  kind: 'damage' | 'heal' | 'buff';
  /** Rider level that teaches the spell. */
  level: number;
  /** Damage spells only. No element means neutral against everything. */
  element?: ElementId;
  /** Damage spells: may inflict this on a hit. Buff spells: always grant it. */
  status?: StatusId;
  statusChance?: number;
  base: number;
  mp: number;
  description: string;
}
export interface RideMove {
  id: string; name: string; kind: 'damage' | 'breath' | 'defend' | 'buff'; description: string;
  base?: number; heal?: number; status?: StatusId;
}
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
  ride: { defenseShare: number; breathPerRoundBonus: number; moves: RideMove[] };
  /** Player move base damage grows by this fraction per level above 1. */
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
  /** How many spells the rider takes into battle. */
  spellLoadoutSize: number;
  levelUpRestoresHp: boolean;
  enemyXpBase: number;
  enemyXpExponent: number;
  enemyGoldBase: number;
  enemyGoldPerLevel: number;
  riderBaseStats: RiderStats;
  bond: { max: number; perWin: number; perBossWin: number };
  startingInventory: Record<string, number>;
  startingGold: number;
  startingGear: Partial<Record<RiderSlot, string>>;
}

export interface StageData {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  bond: number;
  breathMultiplier: number;
  growthStatPoints: number;
  quest?: string | null;
  unlocks: string[];
  /** False for stages a later phase adds. */
  available?: boolean;
}

export interface DragonsData {
  stages: StageData[];
  baseStats: DragonStats;
  elementBonus: Partial<Record<ElementId, Partial<DragonStats>>>;
  eggs: Partial<Record<ElementId, { name: string; blurb: string }>>;
  hatchTaps: number;
  nameMaxLength: number;
  nameSuggestions: string[];
  palette: string[];
  eggLaying: { stage: string; cost: Cost };
}

export interface EventData {
  id: string;
  name: string;
  /** MM-DD, inclusive. An event can wrap past New Year. */
  start: string;
  end: string;
  blurb: string;
  gift: { embers: number; items: Record<string, number> };
  shop: string[];
}

export interface CareData {
  mealsPerDay: number;
  bondPerMeal: number;
  favoriteBondMultiplier: number;
  groom: { durationSeconds: number; bondBase: number; tapsPerBond: number; maxBond: number; targets: number };
  wellKept: { xpBonus: number; fights: number };
}

export interface FoodData { id: string; name: string; icon: string; statPoints: number; price: number; premium?: boolean; event?: string }

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
  blurb: string;
  fights: { min: number; max: number };
  encounters: EncounterData[];
  levelSpread: number;
  multiEnemyLevelOffset: number;
  boss: { enemy: string; level: number; unlockRiderLevel: number };
  miniBoss: { enemy: string; levelOffset: number };
  dropChances: Record<string, number>;
  gate: { stage: string; text: string } | null;
  /** Bosses drop an egg: always the first time, then by chance. `elements` picks one at random. */
  eggDrop: { element: ElementId; chance: number; elements?: ElementId[] } | null;
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
  gear: Record<string, GearData>;
  talents: TalentsData;
  quests: Record<string, QuestData>;
  shop: ShopData;
  roost: RoostData;
  events: EventData[];
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
  /** Gear ids the rider owns, including equipped ones (dragon gear too). */
  gear: string[];
  equipment: Partial<Record<RiderSlot, string>>;
  /** Spell loadout: the spells the rider takes into battle, in order. */
  spells: string[];
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
  /** Talent id → rank. */
  talents: Record<string, number>;
  /** Free respecs used in the current life stage. */
  freeRespecsUsed: number;
  equipment: Partial<Record<DragonSlot, string>>;
  /** Today's care for this dragon. */
  care: DragonCare;
  /** What the dragon is doing while not a battle partner. */
  assignment: Assignment;
  /** Temperament points earned by how the dragon is raised. */
  temper: Record<TemperamentId, number>;
  /** Elder dragons can lay one egg each. */
  laidEgg: boolean;
}

export interface DragonCare { day: string; meals: number; groomed: boolean }

export type Assignment =
  | { kind: 'idle' }
  | { kind: 'training'; since: number }
  | { kind: 'expedition'; trip: string; startedAt: number; endsAt: number };
