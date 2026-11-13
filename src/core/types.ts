/** Shared data and state types for the game core. */

export type ElementId = 'fire' | 'frost' | 'verdant' | 'stone' | 'storm' | 'tide' | 'light' | 'shadow' | 'aether' | 'void';

export type RiderStat = 'strength' | 'agility' | 'arcana' | 'vigor';
export type DragonStat = 'might' | 'scale' | 'swift' | 'spirit';
export type RiderStats = Record<RiderStat, number>;
export type DragonStats = Record<DragonStat, number>;

export const RIDER_STATS: readonly RiderStat[] = ['strength', 'agility', 'arcana', 'vigor'];
export const DRAGON_STATS: readonly DragonStat[] = ['might', 'scale', 'swift', 'spirit'];

export type StatusId =
  | 'burn' | 'chill' | 'root' | 'crack' | 'shock' | 'soak' | 'blind' | 'ward' | 'fury' | 'harden' | 'fade' | 'taunt' | 'silence' | 'hollow';

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

export interface DialogueLine {
  speaker: 'rider' | 'dragon' | 'narrator' | 'npc';
  text: string;
  /** Who is talking, for npc lines. */
  name?: string;
}

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

/** One-time rewards for a story quest or a story choice. */
export interface StoryReward { xp?: number; gold?: number; embers?: number; materials?: Materials; items?: Record<string, number> }

export interface StoryStep {
  intro: DialogueLine[];
  enemies: string[];
  /** Enemy level for this step (story quests have fixed levels). */
  level: number;
  /** This step is the zone's boss or mini-boss fight, with its drops. */
  boss?: boolean;
  mini?: boolean;
}

export interface StoryChoiceOption { id: string; label: string; lines: DialogueLine[]; reward: StoryReward; temper: TemperamentId }

/** A story quest: a short chain of fights with dialogue, played once, part of a zone's story. */
export interface StoryData {
  id: string;
  zone: string;
  name: string;
  minLevel: number;
  /** The story quest that must be done first. */
  requires?: string;
  description: string;
  steps: StoryStep[];
  outro: DialogueLine[];
  reward: StoryReward;
  choice?: { prompt: string; options: StoryChoiceOption[] };
}

export type BountyKind = 'defeat' | 'wins' | 'clear';
export interface BountyData { id: string; kind: BountyKind; count: number; text: string; reward: StoryReward; enemy?: string }
export interface BountiesData { perDay: number; pools: Record<string, BountyData[]> }

/** A painted region map: the art key (a backdrop in assets.json) and pin positions as fractions of width and height. */
export interface RegionMap {
  art: string;
  /** Zone id (or "town") to [x, y]. A new area on an existing map is one more pin. */
  pins: Record<string, [number, number]>;
}
export interface RegionData { id: string; name: string; levels: string; blurb: string; zones: string[]; map?: RegionMap }
export interface UpcomingArea { name: string; region: string; minLevel: number; maxLevel: number; gate: string; elements: ElementId[]; blurb: string; pin?: [number, number] }
export interface RegionsData { regions: RegionData[]; upcoming: UpcomingArea[] }

export type BuildingId = 'nest' | 'pantry' | 'hatchery' | 'nesting' | 'training' | 'expeditions' | 'forge';
export type TemperamentId = 'bold' | 'gentle' | 'clever' | 'proud';
export interface Cost { gold: number; embers: number }

export type MaterialId = 'ore' | 'crystal' | 'scale';
export const MATERIALS: readonly MaterialId[] = ['ore', 'crystal', 'scale'];
export type Materials = Partial<Record<MaterialId, number>>;

export interface ForgeData {
  materials: Record<MaterialId, { name: string; description: string }>;
  effect: { weaponDamagePct: number; bonusPct: number };
  /** Cost of reaching each plus. A material costs `base` plus one per `perLevels` of the gear's level. */
  upgrades: { plus: number; goldPct: number; minGold: number; embers: number; materials: Partial<Record<MaterialId, { base: number; perLevels: number }>> }[];
  bossMaterials: Materials;
  miniBossMaterials: Materials;
  recipes: { gear: string; forgeLevel: number; gold: number; embers: number; materials: Materials }[];
}

export interface RoostData {
  buildings: {
    nest: { name: string; description: string; levels: { slots: number; cost: Cost | null }[] };
    pantry: { name: string; description: string; levels: { minutesPerFood: number; store: number; premiumChance: number; cost: Cost | null }[] };
    hatchery: { name: string; description: string; levels: { slots: number; hours: number; cost: Cost | null }[]; incubateEmbers: number };
    nesting: { name: string; description: string; levels: { hours: number; cooldownDays: number; cost: Cost | null }[] };
    training: { name: string; description: string; levels: { fightsPerHour: number; maxHours: number; cost: Cost | null }[] };
    expeditions: { name: string; description: string; levels: { maxHours: number; lootMultiplier: number; cost: Cost | null }[] };
    forge: { name: string; description: string; levels: { maxPlus: number; cost: Cost | null }[] };
  };
  trips: {
    id: string; name: string; hours: number; minLevel: number; gold: [number, number]; food: number; emberChance: number; blurb: string;
    /** Forge materials brought back: a [min, max] roll per material. */
    materials?: Partial<Record<MaterialId, [number, number]>>;
  }[];
  premiumFood: string;
  embers: { bossFirstKill: number; bossRepeat: number; wellKeptDay: number; streakBonusEvery: number; streakBonus: number };
  temperament: {
    settleAt: number;
    points: Record<'fightWon' | 'bossWon' | 'care' | 'groom' | 'skill' | 'expedition' | 'training', number>;
    types: Record<TemperamentId, { name: string; from: string; bonus: Bonus; passive: string; lines: string[] }>;
  };
  duoCombos: { id: string; name: string; bond: number; base: number; description: string }[];
  /** Breeding at the Nesting Grounds: the youngest stage that can breed, the hybrid chance, and the cost per egg. */
  breeding: { stage: string; hybridChance: number; cost: Cost };
  /** Embers for returning an egg to the wild: a base amount plus extras for rarer eggs. */
  releaseEmbers: { base: number; hybrid: number; breed: number; variant: number };
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
  /** Hybrid names, keyed "a+b" with a before b in `ids`. */
  hybrids: Record<string, string>;
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
  /** A hybrid's breath uses its better element against the target, at this power. */
  hybridBreathMultiplier: number;
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
  damageTakenMultiplier?: number; skipChance?: number; accuracyPenalty?: number;
  /** Hits of this element deal more to the bearer (Soak: Storm). */
  amplify?: { element: ElementId; multiplier: number }; taunts?: boolean;
  /** Silence: no spells, breath, skills or special moves. */
  silenced?: boolean;
  /** Hollow: healing received and breath gained are multiplied by these. */
  healMultiplier?: number; breathGainMultiplier?: number;
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
  /** Temperament points a story choice gives the lead dragon. */
  storyChoiceTemper: number;
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
  /** Body shapes. `dragon` is the original; later phases add more. */
  breeds: Record<string, { name: string; blurb: string }>;
  /** Rare finishes drawn on top of the player's colors. `chance` per new egg; `inheritedChance` when a parent has one. */
  variants: { chance: number; inheritedChance: number; info: Record<VariantId, { name: string; blurb: string }> };
}

export type VariantId = 'shimmer' | 'starry' | 'ghost' | 'ember-eyed';
export const VARIANTS: readonly VariantId[] = ['shimmer', 'starry', 'ghost', 'ember-eyed'];

/** An egg, wherever it is: in the bag, in the Hatchery, at the Nesting Grounds, or being hatched. */
export interface EggSpec {
  element: ElementId;
  /** The second element of a hybrid, or null. */
  element2: ElementId | null;
  breed: string;
  variant: VariantId | null;
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

/** Gear a boss or mini-boss drops: always on the first kill, then by chance until owned. */
export interface TrophyData { gear: string; chance: number }

/** Matching gear that gives extra bonuses when several pieces are worn together. */
export interface GearSetData {
  id: string;
  name: string;
  zone: string;
  description: string;
  pieces: string[];
  /** Each tier applies once enough pieces are equipped. Tiers stack. */
  bonuses: { pieces: number; bonus: Bonus }[];
}

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
  boss: { enemy: string; level: number; unlockRiderLevel: number; trophy?: TrophyData };
  miniBoss: { enemy: string; levelOffset: number; trophy?: TrophyData };
  /** Gear that regular fights in this zone can drop: one roll per fight won. */
  gearDrops?: { chance: number; gear: string[] };
  dropChances: Record<string, number>;
  gate: { stage: string; text: string } | null;
  /** New areas open at a rider level once another zone's boss is beaten. */
  unlock?: { level: number; afterBoss: string };
  /** Areas with more than one main element list them all; `element` is the first. */
  elements?: ElementId[];
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
  sets: GearSetData[];
  forge: ForgeData;
  stories: StoryData[];
  bounties: BountiesData;
  regions: RegionsData;
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
  /** Forge materials in the bag. */
  materials: Materials;
  /** Gear id → Forge upgrade level (+1 to +3). */
  upgrades: Record<string, number>;
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
  /** Body shape (`dragons.json` breeds). */
  breed: string;
  /** The second element of a hybrid, or null. */
  element2: ElementId | null;
  /** A rare finish, or null. */
  variant: VariantId | null;
  /** When it last bred at the Nesting Grounds (ms), or 0 if never. */
  lastBredAt: number;
}

export interface DragonCare { day: string; meals: number; groomed: boolean }

export type Assignment =
  | { kind: 'idle' }
  | { kind: 'training'; since: number }
  | { kind: 'expedition'; trip: string; startedAt: number; endsAt: number };
