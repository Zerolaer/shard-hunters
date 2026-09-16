export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
] as const;

export type Rarity = (typeof RARITIES)[number];

export const EQUIP_SLOTS = [
  "helmet",
  "armor",
  "gloves",
  "boots",
  "weapon",
  "offhand",
  "ring",
  "amulet",
] as const;

export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const HUNTER_CLASS_IDS = ["warrior", "archer", "assassin", "mage"] as const;
export type HunterClass = (typeof HUNTER_CLASS_IDS)[number];

export const AFFIX_STATS = [
  "strength",
  "agility",
  "intelligence",
  "endurance",
  "critChance",
  "critDamage",
  "defense",
  "health",
  "attack",
  "accuracy",
] as const;

export type AffixStat = (typeof AFFIX_STATS)[number];

export const CORE_STATS = ["strength", "agility", "endurance", "intelligence"] as const;
export type CoreStat = (typeof CORE_STATS)[number];

export type ClassicSkillId =
  | "power-strike"
  | "cleave"
  | "mend"
  | "flurry"
  | "arcane-bolt"
  | "shield-bash"
  | "bloodlust"
  | "meteor"
  | "execute"
  | "backstab"
  | "venom"
  | "essence-ward"
  | "shatter";

export const SIN_SKILL_IDS = [
  "sin-flurry",
  "sin-backstab",
  "sin-venom",
  "sin-garrote",
  "sin-mark",
  "sin-vanish",
  "sin-ambush",
  "sin-eviscerate",
  "sin-fan",
  "sin-shadowstep",
  "sin-rupture",
  "sin-veil",
  "sin-clone",
  "sin-execute",
  "sin-nightblade",
] as const;

export type SinSkillId = (typeof SIN_SKILL_IDS)[number];

export type SkillId = ClassicSkillId | SinSkillId;

export const SIN_PATH_IDS = ["blade", "venom", "phantom"] as const;
export type SinPathId = (typeof SIN_PATH_IDS)[number];

export const SIN_ART_IDS = [
  "art-haste",
  "art-crit",
  "art-multistrike",
  "art-poison",
  "art-duration",
  "art-execute",
  "art-economy",
  "art-fortify",
  "art-bloodlust",
  "art-mark",
  "art-combo",
  "art-echo",
] as const;
export type SinArtId = (typeof SIN_ART_IDS)[number];

export type SinKeystoneId = "silent-heart" | "bottomless-cup" | "echo-body";

export interface SinBuildState {
  path: SinPathId | null;
  ranks: Record<string, number>;
  arts: Partial<Record<SinSkillId, SinArtId>>;
  /** Power ranks for unlocked skills. 0 = locked, 1 = just unlocked, cap 20. */
  skillRanks: Partial<Record<SinSkillId, number>>;
  /** Power ranks for unlocked support arts. 0 = locked, 1 = just unlocked, cap 20. */
  artRanks: Partial<Record<SinArtId, number>>;
  /** Overflow sink when every unlocked skill and art is at 20. */
  mastery: number;
}

export interface SinCombatState {
  combo: number;
  poison: number;
  poisonAcc: number;
  /** Fractional poison-tick budget for decay; duration arts raise the cost per −1 stack. */
  poisonTtl: number;
  bleed: number;
  bleedPower: number;
  /** Fractional bleed damage carried between frames, so ticks stay frame-rate independent. */
  bleedAcc: number;
  shade: number;
  marked: number;
  stealth: number;
  nightblade: number;
  veilHits: number;
  clone: number;
  gcd: number;
  lastSkillId: SkillId | null;
  empowerHits: number;
  cloneAbsorb: number;
  slow: number;
  ruptureAmp: number;
  backstabAmp: number;
  cloneAcc: number;
}

export type TalentTreeId = "fury" | "shadow" | "essence";

export type SkillKind = "physical" | "magic" | "agility" | "heal" | "buff";

export interface SkillDef {
  id: SkillId;
  name: string;
  description: string;
  cooldown: number;
  unlockLevel: number;
  kind: SkillKind;
  multiplier: number;
}

export interface Affix {
  stat: AffixStat;
  value: number;
}

/** Gems reuse the item rarity ladder, so fusion, colours and drop rolls stay shared. */
export type GemRank = Rarity;

export interface Gem {
  id: string;
  rank: GemRank;
  affixes: Affix[];
}

export interface Item {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  itemLevel: number;
  enhanceLevel: number;
  affixes: Affix[];
  implicitAttack: number;
  implicitDefense: number;
  implicitHealth: number;
  classLock?: HunterClass;
  /** Мастерская blessing on a +15 item. Multiplies every implicit and affix. */
  blessed?: boolean;
  /** Present once punched. Fixed length 1–3; a null entry is an empty socket. */
  sockets?: Array<Gem | null>;
  /** Crafting reagent. Never equipped; stacks via `qty`. */
  kind?: "gear" | "material";
  materialId?: string;
  qty?: number;
}

export interface Character {
  name: string;
  /** Optional on old saves; resolved to a default portrait at read time. */
  avatarId?: string;
  classId: HunterClass | null;
  level: number;
  xp: number;
  unspentPoints: number;
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  hp: number;
}

export interface DerivedStats {
  maxHp: number;
  attack: number;
  defense: number;
  critChance: number;
  critDamage: number;
  attackInterval: number;
  dps: number;
  powerScore: number;
  accuracy: number;
  xpBonus: number;
  dropBonus: number;
  skillHaste: number;
  skillDamageBonus: number;
  lifesteal: number;
  strength: number;
  agility: number;
  intelligence: number;
  endurance: number;
}

export type SpotTier = "commons" | "rich" | "hot" | "apex";

export interface SpotOccupant {
  id: string;
  name: string;
  guild: string;
  power: number;
  isPlayer: boolean;
}

export interface FarmSpotState {
  occupant: SpotOccupant | null;
}

export interface TalentState {
  points: number;
  ranks: Record<string, number>;
}

export interface Monster {
  id: string;
  name: string;
  isBoss: boolean;
  isPvp: boolean;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackInterval: number;
  xp: number;
  gold: number;
  shards: number;
}

export type LogKind =
  | "hit"
  | "crit"
  | "skill"
  | "heal"
  | "loot"
  | "xp"
  | "gold"
  | "death"
  | "boss"
  | "system"
  | "enhance"
  | "pvp"
  | "miss";

export interface CombatLogEntry {
  id: string;
  kind: LogKind;
  text: string;
}

export interface FloatingText {
  id: string;
  value: number;
  isCrit: boolean;
  isHeal: boolean;
  isPlayerTarget: boolean;
  isMiss?: boolean;
  spawnedAt: number;
  offset: number;
}

export type CombatEffectKind = "buff" | "debuff";

/** Structured combat aura derived from tick simulation — timers match remaining hits / seconds. */
export interface CombatEffect {
  id: string;
  name: string;
  kind: CombatEffectKind;
  /** UI icon key, e.g. poison, ward, stealth. */
  icon: string;
  remainingSec?: number;
  remainingHits?: number;
  remainingStacks?: number;
}

export interface CombatState {
  locationId: string;
  spotId: string;
  mode: "pve" | "pvp";
  monster: Monster | null;
  playerAtkAcc: number;
  monsterAtkAcc: number;
  skillCd: Record<string, number>;
  hotbar: Array<SkillId | null>;
  log: CombatLogEntry[];
  floatingTexts: FloatingText[];
  bloodlustHits: number;
  wardHits: number;
  /** Shared cast lockout, so a hotbar cannot dump every ready skill in one frame. */
  gcd: number;
  hitFlash: number;
  playerHitFlash: number;
  sin: SinCombatState;
  /** Consecutive PvE trash kills with no item roll. Reset on loot or spot change. */
  lootlessKills: number;
  playerEffects: CombatEffect[];
  monsterEffects: CombatEffect[];
}

export interface LocationProgress {
  floor: number;
  killsOnFloor: number;
  bossReady: boolean;
  cleared: boolean;
}

export interface Progression {
  unlockedLocationIds: string[];
  locations: Record<string, LocationProgress>;
}

export interface Resources {
  gold: number;
  shards: number;
  ore: number;
  /** Искры благословения — Мастерская material. Optional on old saves. */
  blessing?: number;
}

export type GuildJoinMode = "open" | "request" | "invite";
export type GuildRole = "leader" | "officer" | "member";

export interface GuildMember {
  id: string;
  name: string;
  contribution: number;
  isPlayer: boolean;
  role?: GuildRole;
  power?: number;
}

export interface GuildQuestState {
  defId: string;
  progress: number;
  claimed: boolean;
}

export interface GuildBuffState {
  id: string;
  expiresAt: number;
}

export interface GuildApplication {
  id: string;
  hunterId: string;
  name: string;
  power: number;
  incoming: boolean;
  guildId: string;
  guildName: string;
}

export interface GuildInvite {
  id: string;
  hunterId: string;
  name: string;
  power: number;
  guildId: string;
  guildName: string;
  outgoing: boolean;
}

export interface GuildBossState {
  defId: string;
  hp: number;
  maxHp: number;
  dayKey: string;
  lastStrikeAt: number;
}

export interface GuildState {
  id: string | null;
  name: string;
  tag: string;
  level: number;
  xp: number;
  treasuryGold: number;
  treasuryOre: number;
  coins: number;
  members: GuildMember[];
  joinMode: GuildJoinMode;
  motd: string;
  skillRanks: Record<string, number>;
  buffs: GuildBuffState[];
  quests: GuildQuestState[];
  questDay: string;
  applications: GuildApplication[];
  invites: GuildInvite[];
  boss: GuildBossState | null;
  createdByPlayer: boolean;
}

export interface MineOccupant {
  id: string;
  name: string;
  guild: string;
  power: number;
  isPlayer: boolean;
}

export interface MineState {
  occupants: MineOccupant[];
}

export interface LeaderboardNpc {
  id: string;
  name: string;
  guild: string;
  power: number;
}

export type HunterArchetype = "hardcore" | "regular" | "casual" | "crafter" | "dungeoneer";

export type HunterActivity = "farm" | "dungeon" | "enhance" | "gems" | "market" | "mine" | "idle";

/** Lightweight living rival — not a full GameData save. */
export interface WorldHunter {
  id: string;
  name: string;
  guild: string;
  classId: HunterClass;
  avatarId: string;
  archetype: HunterArchetype;
  level: number;
  xp: number;
  power: number;
  enhance: number;
  /** Multiplier vs invested expectedBm after enhance is applied. */
  gearBias: number;
  playRate: number;
  activity: HunterActivity;
  activityLabel: string;
  activityUntil: number;
}

export interface Settings {
  autoBattle: boolean;
  /** Master switch — when false, no rarity auto-sells. */
  autoSellEnabled: boolean;
  autoSell: Record<Rarity, boolean>;
}

export interface OfflineReport {
  seconds: number;
  ore: number;
  gold?: number;
  xp?: number;
  kills?: number;
  levels?: number;
  died?: boolean;
}

export interface GameMeta {
  lastTick: number;
  pendingOffline: OfflineReport | null;
  /** Leftover seconds for the hunter sim (batched, not every combat frame). */
  hunterAcc?: number;
  /** Living-roster generation; mismatch rebuilds starters. */
  hunterRoster?: number;
}

export type RightTab =
  | "character"
  | "build"
  | "inventory"
  | "workshop"
  | "world"
  | "mines"
  | "dungeons"
  | "guild"
  | "ranking";

export type DungeonType = "xp" | "gold" | "ore" | "loot";

export interface DungeonSession {
  type: DungeonType;
  hallId: string;
  endsAt: number;
}

export interface DungeonPausedBudget {
  dayKey: string;
  remainingMs: number;
}

export interface DungeonState {
  active: DungeonSession | null;
  /** Local day key YYYY-MM-DD when this type's hour fully elapsed. */
  dailyUsed: Partial<Record<DungeonType, string>>;
  /** Leftover time after an early leave, valid only for that local day. */
  paused: Partial<Record<DungeonType, DungeonPausedBudget>>;
}

export interface TowerState {
  /** Floor the hunter is attempting (1-based, never resets on leave). */
  floor: number;
  /** Highest floor cleared. */
  bestFloor: number;
  active: boolean;
}

export interface GameData {
  character: Character;
  inventory: Array<Item | null>;
  equipment: Record<EquipSlot, Item | null>;
  /** Loose gems. Socketed ones live on the item and are not duplicated here. */
  gems: Gem[];
  combat: CombatState;
  progression: Progression;
  resources: Resources;
  guild: GuildState;
  mines: Record<string, MineState>;
  farm: Record<string, FarmSpotState>;
  talents: TalentState;
  sinBuild: SinBuildState;
  /** Living rival hunters (~100). Cheap snapshots, not full character saves. */
  worldHunters: WorldHunter[];
  /** Derived top slice — kept so old UI/saves keep working. */
  leaderboard: LeaderboardNpc[];
  settings: Settings;
  meta: GameMeta;
  oreAcc: number;
  dungeon: DungeonState;
  tower: TowerState;
}
