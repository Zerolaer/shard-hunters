import { monsterLevelOf, spotRequiredBm } from "./balance";
import { LOCATION_BY_ID, type LocationDef } from "./locations";
import { FARM_SPOT_BY_ID, type FarmSpotDef } from "./spots";
import type {
  BossKind,
  BossSession,
  BossesState,
  GemRank,
  Monster,
  Rarity,
} from "./types";

export const BOSS_LOCATION_ID = "boss-arena";
export const BOSS_SPOT_ID = "boss-arena-0-0";
export const BOSS_MIN_LEVEL = 6;
export const BOSS_ACCENT = "#f59e0b";
export const BOSS_BASE_LEVEL = 4;

/** Field bosses live for the first N minutes of each hour. */
export const FIELD_ALIVE_MINUTES = 50;
/** World boss window length. */
export const WORLD_WINDOW_MIN = 45;

export type BossTab = BossKind;

export interface BossClearBonus {
  gold: number;
  ore: number;
  shards: number;
  sparks: number;
  itemRarity: Rarity | null;
  gemRank: GemRank | null;
}

export interface BossDef {
  id: string;
  kind: BossKind;
  name: string;
  blurb: string;
  /** Story order for personal bosses (1-based). */
  chapter?: number;
  minLevel: number;
  /** Soft combat profile base (fed into generateMonster). */
  baseLevel: number;
  accent: string;
  /** Extra BM climb on top of hot-boss baseline. */
  threat: number;
  /** Multiplies recommended BM for late/overboost bands. */
  bmScale?: number;
}

export interface WorldWindowDef {
  id: string;
  label: string;
  /** Local hour when the window opens (0–23). */
  hour: number;
  durationMin: number;
  /** Which world boss def appears in this slot. */
  bossId: string;
}

/** Phase multipliers so arena bosses are not one-shottable at equal BM.
 *  Open-world boss TTK ≈ 28–42s; these stretch that into a real phase. */
const KIND_PHASE = {
  field: { hp: 1.35, atk: 1.12, def: 1.08, interval: [1.4, 1.65] as const },
  personal: { hp: 1.55, atk: 1.16, def: 1.12, interval: [1.35, 1.6] as const },
  world: { hp: 2.45, atk: 1.32, def: 1.2, interval: [1.55, 1.9] as const },
} as const;

export const WORLD_WINDOWS: WorldWindowDef[] = [
  { id: "dawn", label: "Утро", hour: 8, durationMin: WORLD_WINDOW_MIN, bossId: "world-ash-titan" },
  { id: "noon", label: "День", hour: 14, durationMin: WORLD_WINDOW_MIN, bossId: "world-rift-wyrm" },
  { id: "dusk", label: "Вечер", hour: 20, durationMin: WORLD_WINDOW_MIN, bossId: "world-void-herald" },
];

export const WORLD_BOSSES: BossDef[] = [
  {
    id: "world-ash-titan",
    kind: "world",
    name: "Пепельный Титан",
    blurb: "Просыпается на рассвете. Долгий бой — без баффов не выжить.",
    minLevel: 25,
    baseLevel: 32,
    accent: "#fb923c",
    threat: 1.18,
    bmScale: 1.15,
  },
  {
    id: "world-rift-wyrm",
    kind: "world",
    name: "Змей Разлома",
    blurb: "Дневной мировой босс. Фаза на износ — нужна живучесть и урон.",
    minLevel: 40,
    baseLevel: 52,
    accent: "#38bdf8",
    threat: 1.22,
    bmScale: 1.25,
  },
  {
    id: "world-void-herald",
    kind: "world",
    name: "Глашатай Пустоты",
    blurb: "Вечерний рейд. Самый жирный из мировых — и самый злой.",
    minLevel: 55,
    baseLevel: 72,
    accent: "#c084fc",
    threat: 1.28,
    bmScale: 1.4,
  },
];

/** ~10 field bosses across early→late BM bands; respawn each hour. */
export const FIELD_BOSSES: BossDef[] = [
  {
    id: "field-grove-horror",
    kind: "field",
    name: "Ужас Рощи",
    blurb: "Ранний полевой босс. Часовой спавн у окраины леса.",
    minLevel: 6,
    baseLevel: 8,
    accent: "#86efac",
    threat: 1.12,
  },
  {
    id: "field-mire-hydra",
    kind: "field",
    name: "Гидра Топи",
    blurb: "Три головы — один долгий бой. Нужна регенерация.",
    minLevel: 12,
    baseLevel: 14,
    accent: "#4ade80",
    threat: 1.14,
  },
  {
    id: "field-cliff-behemoth",
    kind: "field",
    name: "Утёсный Бегемот",
    blurb: "Каждый час на скалах. Бьёт тяжело, ходит медленно.",
    minLevel: 18,
    baseLevel: 20,
    accent: "#a3e635",
    threat: 1.16,
  },
  {
    id: "field-ash-stalker",
    kind: "field",
    name: "Пепельный Ловец",
    blurb: "Средний пояс. Без защиты съедает ХП за минуту.",
    minLevel: 26,
    baseLevel: 28,
    accent: "#fbbf24",
    threat: 1.18,
  },
  {
    id: "field-iron-colossus",
    kind: "field",
    name: "Железный Колосс",
    blurb: "Плотный мид. Рекомендуется бафф на защиту.",
    minLevel: 34,
    baseLevel: 36,
    accent: "#94a3b8",
    threat: 1.2,
  },
  {
    id: "field-storm-matriarch",
    kind: "field",
    name: "Матриарх Бури",
    blurb: "Быстрые удары. Лёгкий билд без хила рискует.",
    minLevel: 42,
    baseLevel: 45,
    accent: "#67e8f9",
    threat: 1.22,
  },
  {
    id: "field-bone-sovereign",
    kind: "field",
    name: "Костяной Владыка",
    blurb: "Поздний мид. Фаза на 40–60 секунд при равном БМ.",
    minLevel: 52,
    baseLevel: 55,
    accent: "#e7e5e4",
    threat: 1.24,
  },
  {
    id: "field-ember-djinn",
    kind: "field",
    name: "Джинн Углей",
    blurb: "Горячий спавн. Без осколочных баффов ТТК раздувается.",
    minLevel: 62,
    baseLevel: 65,
    accent: "#f97316",
    threat: 1.26,
  },
  {
    id: "field-night-archon",
    kind: "field",
    name: "Архион Ночи",
    blurb: "Почти эндгейм. Часовой босс для сильных охотников.",
    minLevel: 74,
    baseLevel: 78,
    accent: "#818cf8",
    threat: 1.28,
    bmScale: 1.15,
  },
  {
    id: "field-crown-wraith",
    kind: "field",
    name: "Призрак Короны",
    blurb: "Верхняя полка полевых. Жирный лут раз в час.",
    minLevel: 88,
    baseLevel: 92,
    accent: "#f472b6",
    threat: 1.3,
    bmScale: 1.3,
  },
];

/** Story bosses — fewer than Tower floors, fatter payday. */
export const PERSONAL_BOSSES: BossDef[] = [
  {
    id: "story-01",
    kind: "personal",
    name: "Тень Новичка",
    blurb: "Первое испытание. Учись держать фазу, а не ваншотить.",
    chapter: 1,
    minLevel: 6,
    baseLevel: 7,
    accent: "#fda4af",
    threat: 1.12,
  },
  {
    id: "story-02",
    kind: "personal",
    name: "Страж Просёлка",
    blurb: "Второй сюжетный босс. Уже требует бафф на урон.",
    chapter: 2,
    minLevel: 10,
    baseLevel: 11,
    accent: "#fb7185",
    threat: 1.14,
  },
  {
    id: "story-03",
    kind: "personal",
    name: "Хозяин Камня",
    blurb: "Каменный щит — долгий бой без просадки защиты.",
    chapter: 3,
    minLevel: 16,
    baseLevel: 17,
    accent: "#f43f5e",
    threat: 1.16,
  },
  {
    id: "story-04",
    kind: "personal",
    name: "Ведьма Тумана",
    blurb: "Сюжетный мид. Лут жирнее башенного этажа.",
    chapter: 4,
    minLevel: 22,
    baseLevel: 24,
    accent: "#e11d48",
    threat: 1.18,
  },
  {
    id: "story-05",
    kind: "personal",
    name: "Капитан Разлома",
    blurb: "Половина кампании. Без буста — долгая смерть.",
    chapter: 5,
    minLevel: 30,
    baseLevel: 32,
    accent: "#be123c",
    threat: 1.2,
  },
  {
    id: "story-06",
    kind: "personal",
    name: "Зверь Ущелья",
    blurb: "Тяжёлый удар. Рекомендуется защитный слот.",
    chapter: 6,
    minLevel: 38,
    baseLevel: 40,
    accent: "#9f1239",
    threat: 1.22,
  },
  {
    id: "story-07",
    kind: "personal",
    name: "Жрица Осколков",
    blurb: "Фаза на выносливость. Награда — камень + предмет.",
    chapter: 7,
    minLevel: 48,
    baseLevel: 50,
    accent: "#881337",
    threat: 1.24,
  },
  {
    id: "story-08",
    kind: "personal",
    name: "Герцог Пепла",
    blurb: "Поздний сюжет. БМ и баффы обязательны.",
    chapter: 8,
    minLevel: 58,
    baseLevel: 60,
    accent: "#7f1d1d",
    threat: 1.26,
    bmScale: 1.1,
  },
  {
    id: "story-09",
    kind: "personal",
    name: "Страж Небес",
    blurb: "Предфинал. Долгая фаза, жирный лут.",
    chapter: 9,
    minLevel: 68,
    baseLevel: 72,
    accent: "#b91c1c",
    threat: 1.28,
    bmScale: 1.2,
  },
  {
    id: "story-10",
    kind: "personal",
    name: "Король Бездны",
    blurb: "Финал сюжетной линии. Редко и жирно.",
    chapter: 10,
    minLevel: 80,
    baseLevel: 85,
    accent: "#dc2626",
    threat: 1.32,
    bmScale: 1.35,
  },
];

export const ALL_BOSS_DEFS: BossDef[] = [...WORLD_BOSSES, ...FIELD_BOSSES, ...PERSONAL_BOSSES];

export const BOSS_DEF_BY_ID: Record<string, BossDef> = Object.fromEntries(
  ALL_BOSS_DEFS.map((b) => [b.id, b]),
);

export function emptyBossesState(): BossesState {
  return {
    active: null,
    personalIndex: 1,
    personalCleared: 0,
    worldKills: {},
    fieldKills: {},
  };
}

export function normalizeBossesState(raw: BossesState | null | undefined): BossesState {
  const personalIndex = Math.max(1, Math.min(PERSONAL_BOSSES.length, Math.floor(raw?.personalIndex ?? 1)));
  const personalCleared = Math.max(0, Math.min(PERSONAL_BOSSES.length, Math.floor(raw?.personalCleared ?? 0)));
  const worldKills =
    raw?.worldKills && typeof raw.worldKills === "object" ? { ...raw.worldKills } : {};
  const fieldKills =
    raw?.fieldKills && typeof raw.fieldKills === "object" ? { ...raw.fieldKills } : {};
  let active: BossSession | null = null;
  if (raw?.active?.defId && raw.active.kind && raw.active.spawnKey) {
    const def = BOSS_DEF_BY_ID[raw.active.defId];
    if (def && def.kind === raw.active.kind) {
      active = {
        kind: raw.active.kind,
        defId: raw.active.defId,
        spawnKey: String(raw.active.spawnKey),
      };
    }
  }
  return {
    active,
    personalIndex,
    personalCleared: Math.max(personalCleared, personalIndex - 1),
    worldKills,
    fieldKills,
  };
}

export function isBossLocationId(id: string | null | undefined) {
  return id === BOSS_LOCATION_ID;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function localDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Hourly spawn key: YYYY-MM-DD-HH */
export function fieldSpawnKey(now = Date.now()) {
  const d = new Date(now);
  return `${localDayKey(now)}-${pad2(d.getHours())}`;
}

export function isFieldSpawnAlive(now = Date.now()) {
  return new Date(now).getMinutes() < FIELD_ALIVE_MINUTES;
}

export function fieldRemainingMs(now = Date.now()) {
  const d = new Date(now);
  if (d.getMinutes() >= FIELD_ALIVE_MINUTES) return 0;
  const end = new Date(d);
  end.setMinutes(FIELD_ALIVE_MINUTES, 0, 0);
  return Math.max(0, end.getTime() - now);
}

export function nextFieldSpawnAt(now = Date.now()) {
  const d = new Date(now);
  const next = new Date(d);
  next.setMinutes(0, 0, 0);
  next.setHours(d.getHours() + 1);
  return next.getTime();
}

export interface ActiveWorldWindow {
  window: WorldWindowDef;
  boss: BossDef;
  spawnKey: string;
  endsAt: number;
  remainingMs: number;
}

export function activeWorldWindow(now = Date.now()): ActiveWorldWindow | null {
  const d = new Date(now);
  const day = localDayKey(now);
  for (const w of WORLD_WINDOWS) {
    const start = new Date(d);
    start.setHours(w.hour, 0, 0, 0);
    const endsAt = start.getTime() + w.durationMin * 60_000;
    if (now >= start.getTime() && now < endsAt) {
      const boss = BOSS_DEF_BY_ID[w.bossId];
      if (!boss) continue;
      return {
        window: w,
        boss,
        spawnKey: `${day}:${w.id}`,
        endsAt,
        remainingMs: endsAt - now,
      };
    }
  }
  return null;
}

export function nextWorldWindow(now = Date.now()) {
  const d = new Date(now);
  const candidates: { at: number; window: WorldWindowDef }[] = [];
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const day = new Date(d);
    day.setDate(d.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);
    for (const w of WORLD_WINDOWS) {
      const at = new Date(day);
      at.setHours(w.hour, 0, 0, 0);
      if (at.getTime() > now) candidates.push({ at: at.getTime(), window: w });
    }
  }
  candidates.sort((a, b) => a.at - b.at);
  return candidates[0] ?? null;
}

export function formatBossCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${pad2(mm)}:${pad2(r)}`;
  }
  return `${m}:${pad2(r)}`;
}

/**
 * Soft combat floor for story chapters — keep near 1.
 * Chapter power comes from rising `baseLevel` + {@link applyBossArenaPower}.
 */
export function personalCombatFloor(_chapter: number) {
  return 1;
}

export function bossRecommendedBm(def: BossDef) {
  const combatFloor =
    def.kind === "personal" && def.chapter
      ? personalCombatFloor(def.chapter)
      : 1;
  const level = monsterLevelOf(def.baseLevel, Math.max(1, combatFloor), true);
  const base = spotRequiredBm(level, "hot", "boss");
  /** Gentle chapter climb — difficulty mostly comes from baseLevel + phase HP. */
  const climb =
    def.kind === "personal" && def.chapter
      ? Math.pow(1 + (def.chapter - 1) * 0.035, 1.15)
      : 1;
  const scale = def.bmScale ?? 1;
  return Math.max(1, Math.round(base * def.threat * climb * scale));
}

export function bossComfortBm(def: BossDef) {
  const soft = def.kind === "world" ? 0.9 : 0.86;
  return Math.round(bossRecommendedBm(def) * soft);
}

function bossPowerGap(def: BossDef) {
  const combatFloor =
    def.kind === "personal" && def.chapter
      ? personalCombatFloor(def.chapter)
      : 1;
  const level = monsterLevelOf(def.baseLevel, Math.max(1, combatFloor), true);
  const baseline = spotRequiredBm(level, "hot", "boss");
  return bossRecommendedBm(def) / Math.max(1, baseline);
}

/**
 * Scale arena boss so advertised BM matches fight power.
 * Kind phase mults keep TTK well above trash and block equal-BM one-shots.
 */
export function applyBossArenaPower(monster: Monster, def: BossDef) {
  const gap = Math.max(0.5, bossPowerGap(def));
  const phase = KIND_PHASE[def.kind];
  const hpMult = Math.pow(gap, 0.85) * phase.hp;
  const atkMult = Math.pow(gap, 1.16) * phase.atk;
  const defMult = Math.pow(gap, 0.55) * phase.def;
  monster.maxHp = Math.max(1, Math.round(monster.maxHp * hpMult));
  monster.hp = monster.maxHp;
  monster.attack = Math.max(1, Math.round(monster.attack * atkMult));
  monster.defense = Math.max(1, Math.round(monster.defense * defMult));
  monster.attackInterval = Math.max(phase.interval[0], Math.min(monster.attackInterval, phase.interval[1]));
  return monster;
}

export function personalBossForIndex(index: number): BossDef | null {
  const i = Math.max(1, Math.floor(index));
  return PERSONAL_BOSSES.find((b) => b.chapter === i) ?? null;
}

export function bossCombatFloor(def: BossDef) {
  return 1;
}

function rarityForBand(score: number): Rarity {
  if (score >= 9) return "mythic";
  if (score >= 7) return "legendary";
  if (score >= 5) return "epic";
  if (score >= 3) return "rare";
  return "uncommon";
}

export function bossClearBonus(def: BossDef): BossClearBonus {
  if (def.kind === "world") {
    const tier = def.bmScale ?? 1.5;
    return {
      gold: Math.round(900 * tier + def.baseLevel * 28),
      ore: Math.round(28 * tier + def.baseLevel * 0.35),
      shards: Math.round(320 * tier + def.baseLevel * 6),
      sparks: 4 + Math.floor(tier),
      itemRarity: rarityForBand(6 + tier),
      gemRank: rarityForBand(6 + tier),
    };
  }
  if (def.kind === "field") {
    const band = Math.max(1, Math.round(def.baseLevel / 10));
    const scale = def.bmScale ?? 1;
    return {
      gold: Math.round((90 + def.baseLevel * 14) * scale),
      ore: Math.round((5 + band * 2.2) * scale),
      shards: Math.round((45 + def.baseLevel * 4.5) * scale),
      sparks: band >= 6 ? 1 + Math.floor((band - 5) / 2) : 0,
      itemRarity: band >= 4 ? rarityForBand(band - 1) : band >= 2 ? "uncommon" : null,
      gemRank: band >= 5 ? rarityForBand(band - 2) : null,
    };
  }
  const ch = def.chapter ?? 1;
  return {
    gold: Math.round(110 + ch * 120 + ch * ch * 8),
    ore: Math.round(6 + ch * 4.5),
    shards: Math.round(55 + ch * 32),
    sparks: 1 + Math.floor(ch / 2),
    itemRarity: rarityForBand(1 + Math.floor(ch * 0.85)),
    gemRank: rarityForBand(1 + Math.floor(ch * 0.75)),
  };
}

export function hasKilledWorld(state: BossesState, spawnKey: string) {
  return !!state.worldKills[spawnKey];
}

export function hasKilledField(state: BossesState, defId: string, spawnKey: string) {
  return state.fieldKills[defId] === spawnKey;
}

export function canEnterPersonal(state: BossesState, def: BossDef) {
  const ch = def.chapter ?? 1;
  return ch <= state.personalIndex;
}

export function bossLocation(): LocationDef {
  return {
    id: BOSS_LOCATION_ID,
    name: "Арена Боссов",
    blurb: "Мировые, полевые и сюжетные боссы. Долгие фазы — без буста не пройти.",
    minLevel: BOSS_MIN_LEVEL,
    accent: BOSS_ACCENT,
    mobNames: ["Тень арены", "Страж круга", "Эхо боя"],
    bossName: "Босс Арены",
    baseLevel: BOSS_BASE_LEVEL,
    regionId: "dungeons",
    kind: "boss",
    threat: 1.22,
    rarityBias: 0.12,
  };
}

export function bossSpot(): FarmSpotDef {
  return {
    id: BOSS_SPOT_ID,
    locationId: BOSS_LOCATION_ID,
    row: 0,
    col: 0,
    name: "Круг испытания",
    tier: "hot",
    dropChanceMult: 1.55,
    rarityBias: 0.14,
    xpMult: 1.65,
    goldMult: 1.5,
    danger: 1.18,
    pityKills: 4,
    requiredBm: bossRecommendedBm(PERSONAL_BOSSES[0]!),
  };
}

const BOSS_LOC = bossLocation();
const BOSS_SPOT = bossSpot();
Object.assign(LOCATION_BY_ID, { [BOSS_LOCATION_ID]: BOSS_LOC });
Object.assign(FARM_SPOT_BY_ID, { [BOSS_SPOT_ID]: BOSS_SPOT });
