import { spotRequiredBm } from "./balance";
import { LOCATION_BY_ID, recommendedLocationId, type LocationDef } from "./locations";
import { FARM_SPOT_BY_ID, type FarmSpotDef } from "./spots";
import type { DungeonSession, DungeonState, DungeonType } from "./types";

export type { DungeonSession, DungeonState, DungeonType };

export const DUNGEON_TYPES: DungeonType[] = ["xp", "gold", "ore", "loot"];

export const DUNGEON_TYPE_LABEL: Record<DungeonType, string> = {
  xp: "Опыт",
  gold: "Золото",
  ore: "Руда",
  loot: "Дроп",
};

export const DUNGEON_TYPE_BLURB: Record<DungeonType, string> = {
  xp: "Часовой зал опыта: заменяет дневной фарм уровней.",
  gold: "Часовой зал золота: дневная казна за один заход.",
  ore: "Руда с каждого убийства — как смена в шахте.",
  loot: "Шанс и качество дропа как за целый день охоты.",
};

export interface DungeonRates {
  xpMult: number;
  goldMult: number;
  orePerKill: number;
  dropChanceMult: number;
  rarityBias: number;
}

export interface DungeonHall {
  id: string;
  type: DungeonType;
  name: string;
  blurb: string;
  /** Player level required to enter. */
  minLevel: number;
  /** Monster base level (also drives BM). */
  baseLevel: number;
  /**
   * Multiplies recommended BM. Post-100 halls sit on the overboost ladder —
   * level alone cannot reach 500k–1M powerScore on the invested curve.
   */
  bmScale?: number;
  accent: string;
  mobNames: string[];
  bossName: string;
  threat: number;
  rates: DungeonRates;
}

export const DUNGEON_DURATION_MS = 60 * 60 * 1000;

const TYPE_RATES: Record<DungeonType, DungeonRates> = {
  /** Hourly hall should replace a full day of open-world XP farm. */
  xp: { xpMult: 9.5, goldMult: 1.35, orePerKill: 0, dropChanceMult: 1.35, rarityBias: 0.04 },
  gold: { xpMult: 1.35, goldMult: 10, orePerKill: 0, dropChanceMult: 1.25, rarityBias: 0.03 },
  ore: { xpMult: 1.2, goldMult: 1.25, orePerKill: 7, dropChanceMult: 1.15, rarityBias: 0.02 },
  loot: { xpMult: 1.4, goldMult: 1.6, orePerKill: 0, dropChanceMult: 8.2, rarityBias: 0.34 },
};

const TYPE_ACCENT: Record<DungeonType, string> = {
  xp: "#a78bfa",
  gold: "#fbbf24",
  ore: "#94a3b8",
  loot: "#34d399",
};

const TYPE_HALL_PREFIX: Record<DungeonType, string> = {
  xp: "Зал Эха",
  gold: "Зал Монет",
  ore: "Зал Жилы",
  loot: "Зал Трофеев",
};

const TYPE_MOBS: Record<DungeonType, { mobs: string[]; boss: string }> = {
  xp: {
    mobs: ["Эхо-страж", "Ученик пустоты", "Тень опыта", "Скриб памяти"],
    boss: "Хранитель Эха",
  },
  gold: {
    mobs: ["Алчный страж", "Монетный голем", "Сборщик подати", "Золотой страж"],
    boss: "Казначей Зала",
  },
  ore: {
    mobs: ["Жильный краб", "Шахтный дух", "Рудный скорпион", "Каменный дозор"],
    boss: "Сердце Жилы",
  },
  loot: {
    mobs: ["Охотник за трофеями", "Реликварий", "Воришка кургана", "Страж ларца"],
    boss: "Хранитель Добычи",
  },
};

/** Hall brackets: enter by level; BM follows invested curve (soft death risk if under). */
const HALL_BRACKETS = [
  { minLevel: 1, baseLevel: 3 },
  { minLevel: 10, baseLevel: 12 },
  { minLevel: 20, baseLevel: 22 },
  { minLevel: 30, baseLevel: 32 },
  { minLevel: 40, baseLevel: 42 },
  { minLevel: 50, baseLevel: 52 },
  { minLevel: 60, baseLevel: 62 },
  { minLevel: 70, baseLevel: 72 },
  { minLevel: 80, baseLevel: 82 },
  { minLevel: 90, baseLevel: 92 },
  { minLevel: 100, baseLevel: 100 },
  /** Overboost ladder — bmScale opens 200k→1M halls past open-world L100. */
  { minLevel: 120, baseLevel: 125, bmScale: 3.6 },
  { minLevel: 150, baseLevel: 140, bmScale: 5.4 },
  { minLevel: 180, baseLevel: 155, bmScale: 8 },
  { minLevel: 210, baseLevel: 175, bmScale: 11.5 },
] as const;

function buildHalls(): DungeonHall[] {
  const halls: DungeonHall[] = [];
  for (const type of DUNGEON_TYPES) {
    const flavor = TYPE_MOBS[type];
    HALL_BRACKETS.forEach((b, i) => {
      const tier = i + 1;
      const scale = "bmScale" in b && b.bmScale ? b.bmScale : 1;
      halls.push({
        id: `dung-${type}-${b.minLevel}`,
        type,
        name: `${TYPE_HALL_PREFIX[type]} ${roman(tier)}`,
        blurb: `Ур. ${b.minLevel}+ · ${DUNGEON_TYPE_BLURB[type]}`,
        minLevel: b.minLevel,
        baseLevel: b.baseLevel,
        bmScale: scale > 1 ? scale : undefined,
        accent: TYPE_ACCENT[type],
        mobNames: flavor.mobs,
        bossName: flavor.boss,
        threat: i <= 10 ? 1.12 + i * 0.055 : 1.67 + (i - 10) * 0.025,
        rates: { ...TYPE_RATES[type] },
      });
    });
  }
  return halls;
}

function roman(n: number) {
  const map = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
  ];
  return map[n - 1] ?? String(n);
}

export const DUNGEON_HALLS: DungeonHall[] = buildHalls();

export const DUNGEON_HALL_BY_ID: Record<string, DungeonHall> = Object.fromEntries(
  DUNGEON_HALLS.map((h) => [h.id, h]),
);

export function hallsForType(type: DungeonType) {
  return DUNGEON_HALLS.filter((h) => h.type === type);
}

/**
 * Recommended BM for a hall — sits above open-world commons of the same level.
 * Uses rich-tier need × threat ramp so invested same-level kits are "ok", not free farm.
 * Post-100 halls also apply bmScale (overboost ladder).
 */
export function dungeonRecommendedBm(hall: DungeonHall) {
  const threatMult = 1 + (hall.threat - 1) * 0.9;
  return Math.round(
    spotRequiredBm(hall.baseLevel, "rich", "normal") * threatMult * (hall.bmScale ?? 1),
  );
}

/** Soft comfort line — below this, expect deaths (bm offense/defense punish harder). */
export function dungeonComfortBm(hall: DungeonHall) {
  return Math.round(dungeonRecommendedBm(hall) * 0.88);
}

export function hallAsLocation(hall: DungeonHall): LocationDef {
  return {
    id: hall.id,
    name: hall.name,
    blurb: hall.blurb,
    minLevel: hall.minLevel,
    accent: hall.accent,
    mobNames: hall.mobNames,
    bossName: hall.bossName,
    baseLevel: hall.baseLevel,
    regionId: "dungeons",
    kind: "normal",
    threat: hall.threat,
    rarityBias: hall.rates.rarityBias,
    /** Must match recommended BM — otherwise scaled halls stay level-curve sponges. */
    bmScale: hall.bmScale,
  };
}

export const DUNGEON_LOCATION_BY_ID: Record<string, LocationDef> = Object.fromEntries(
  DUNGEON_HALLS.map((h) => [h.id, hallAsLocation(h)]),
);

export function dungeonSpotId(hallId: string) {
  return `${hallId}-0-0`;
}

export function hallSpot(hall: DungeonHall): FarmSpotDef {
  const rates = hall.rates;
  return {
    id: dungeonSpotId(hall.id),
    locationId: hall.id,
    row: 0,
    col: 0,
    name: "Центр зала",
    tier: "commons",
    dropChanceMult: rates.dropChanceMult,
    rarityBias: rates.rarityBias,
    xpMult: rates.xpMult,
    goldMult: rates.goldMult,
    danger: 1 + (hall.threat - 1) * 0.8,
    pityKills: 8,
    requiredBm: dungeonRecommendedBm(hall),
  };
}

export const DUNGEON_SPOTS: FarmSpotDef[] = DUNGEON_HALLS.map(hallSpot);

export const DUNGEON_SPOT_BY_ID: Record<string, FarmSpotDef> = Object.fromEntries(
  DUNGEON_SPOTS.map((s) => [s.id, s]),
);

export function isDungeonLocationId(id: string) {
  return id.startsWith("dung-");
}

export function emptyDungeonState(): DungeonState {
  return { active: null, dailyUsed: {}, paused: {} };
}

export function localDayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function normalizeDungeonState(
  raw: DungeonState | null | undefined,
  now = Date.now(),
): DungeonState {
  const state: DungeonState = {
    active: raw?.active ?? null,
    dailyUsed: { ...(raw?.dailyUsed ?? {}) },
    paused: { ...(raw?.paused ?? {}) },
  };
  const day = localDayKey(now);
  for (const type of DUNGEON_TYPES) {
    const used = state.dailyUsed[type];
    if (used && used !== day) delete state.dailyUsed[type];
    const paused = state.paused[type];
    if (!paused || paused.dayKey !== day) {
      delete state.paused[type];
      continue;
    }
    if (paused.remainingMs <= 0) {
      state.dailyUsed[type] = day;
      delete state.paused[type];
    }
  }
  return state;
}

/** Old saves marked dailyUsed on enter. Keep the lock only if the hour already ended. */
export function migrateDungeonPauseResume(raw: DungeonState | null | undefined, now = Date.now()) {
  const state = normalizeDungeonState(raw, now);
  const day = localDayKey(now);
  const activeRemain = dungeonRemainingMs(state.active, now);
  for (const type of DUNGEON_TYPES) {
    if (state.dailyUsed[type] !== day) continue;
    if (state.active?.type === type && activeRemain <= 0) continue;
    delete state.dailyUsed[type];
  }
  return state;
}

export function dungeonPausedRemainingMs(state: DungeonState, type: DungeonType, now = Date.now()) {
  const day = localDayKey(now);
  if (state.dailyUsed[type] === day) return 0;
  if (state.active?.type === type) return 0;
  const paused = state.paused?.[type];
  if (!paused || paused.dayKey !== day) return 0;
  return Math.max(0, paused.remainingMs);
}

/** Remaining budget for a type today: active timer, paused leftover, or a fresh hour. */
export function dungeonBudgetRemainingMs(state: DungeonState, type: DungeonType, now = Date.now()) {
  const day = localDayKey(now);
  if (state.dailyUsed[type] === day) return 0;
  if (state.active?.type === type) return dungeonRemainingMs(state.active, now);
  const paused = state.paused?.[type];
  if (paused && paused.dayKey === day) return Math.max(0, paused.remainingMs);
  return DUNGEON_DURATION_MS;
}

export function dungeonTypeAvailable(state: DungeonState, type: DungeonType, now = Date.now()) {
  return dungeonBudgetRemainingMs(state, type, now) > 0;
}

export function dungeonRemainingMs(session: DungeonSession | null | undefined, now = Date.now()) {
  if (!session) return 0;
  return Math.max(0, session.endsAt - now);
}

export function formatDungeonCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ore drip on kill for ore halls — scales with hall base level. */
export function dungeonOreOnKill(hall: DungeonHall) {
  if (hall.rates.orePerKill <= 0) return 0;
  return Math.max(1, Math.round(hall.rates.orePerKill * (1.2 + hall.baseLevel * 0.08)));
}

Object.assign(LOCATION_BY_ID, DUNGEON_LOCATION_BY_ID);
Object.assign(FARM_SPOT_BY_ID, DUNGEON_SPOT_BY_ID);

export function recommendedSafeLocationAfterDungeon(level: number, powerScore?: number) {
  return recommendedLocationId(level, powerScore);
}
