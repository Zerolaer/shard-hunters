import { AVATAR_IDS } from "./avatars";
import { expectedBm, investedGearProfile, xpToNext } from "./balance";
import { MAX_ENHANCE } from "./constants";
import { DUNGEON_HALLS, DUNGEON_TYPE_LABEL } from "./dungeons";
import { enhanceSafeFloor, enhanceSuccessChance } from "./enhance";
import { WORLD_GUILDS } from "./guild";
import { LOCATIONS, recommendedLocationId } from "./locations";
import { hash32, mulberry32 } from "./rng";
import { HUNTER_CLASS_IDS, type GameData, type HunterActivity, type HunterArchetype, type HunterClass, type WorldHunter } from "./types";

export const WORLD_HUNTER_COUNT = 100;
export const HUNTER_LEVEL_CAP = 100;
/** Bump to rebuild the living roster (fresh starters, not pre-leveled veterans). */
export const HUNTER_ROSTER_GEN = 2;

/** Simulate hunters in ~1s slices so a 50ms combat frame does not walk 100 rows. */
const HUNTER_STEP = 1;
const LEADERBOARD_SLICE = 12;

const GIVEN = [
  "Кира",
  "Ина",
  "Ваэль",
  "Мира",
  "Юна",
  "Элра",
  "Сера",
  "Несса",
  "Лиса",
  "Ринн",
  "Торн",
  "Оррен",
  "Дрейк",
  "Касс",
  "Грим",
  "Рук",
  "Бор",
  "Илко",
  "Мрак",
  "Ашен",
  "Вейн",
  "Сил",
  "Нокт",
  "Раф",
  "Тейн",
  "Онис",
  "Векс",
  "Дара",
  "Ирис",
  "Лорн",
  "Нил",
  "Ора",
  "Фен",
  "Гейл",
  "Рок",
  "Зен",
  "Тара",
  "Скол",
  "Ива",
  "Рекс",
] as const;

const EPITHET = [
  "Вейл",
  "Нокс",
  "Клык",
  "Осколок",
  "Сумрак",
  "Неборез",
  "Каменный",
  "Праха",
  "Железный",
  "из Пепла",
  "Пустошей",
  "Звезда",
  "Шахтёр",
  "Ветер",
  "Тень",
  "Искра",
  "Рунный",
  "Пепельный",
  "Тихий",
  "Багровый",
  "Соляной",
  "Кварцевый",
  "Мороз",
  "Шторм",
  "Коготь",
  "Страж",
  "Пилигрим",
  "Эха",
  "Рифта",
  "Шлака",
  "Зеркал",
  "Копья",
  "Пыли",
  "Гавани",
  "Корня",
  "Угля",
] as const;

const ARCHETYPES: HunterArchetype[] = [
  ...Array.from({ length: 12 }, () => "hardcore" as const),
  ...Array.from({ length: 40 }, () => "regular" as const),
  ...Array.from({ length: 22 }, () => "casual" as const),
  ...Array.from({ length: 14 }, () => "crafter" as const),
  ...Array.from({ length: 12 }, () => "dungeoneer" as const),
];

const ACTIVITY_XP: Record<HunterActivity, number> = {
  farm: 1,
  dungeon: 1.42,
  enhance: 0.12,
  gems: 0.08,
  market: 0.05,
  mine: 0.22,
  idle: 0.03,
};

const ARCH_ACTIVITY: Record<HunterArchetype, Record<HunterActivity, number>> = {
  hardcore: { farm: 40, dungeon: 24, enhance: 16, gems: 10, market: 4, mine: 4, idle: 2 },
  regular: { farm: 34, dungeon: 16, enhance: 12, gems: 8, market: 10, mine: 8, idle: 12 },
  casual: { farm: 18, dungeon: 6, enhance: 6, gems: 4, market: 8, mine: 5, idle: 53 },
  crafter: { farm: 18, dungeon: 8, enhance: 32, gems: 22, market: 12, mine: 3, idle: 5 },
  dungeoneer: { farm: 18, dungeon: 46, enhance: 10, gems: 8, market: 6, mine: 6, idle: 6 },
};

export const HUNTER_ACTIVITY_VERB: Record<HunterActivity, string> = {
  farm: "Фарм",
  dungeon: "Данж",
  enhance: "Заточка",
  gems: "Камни",
  market: "Торговля",
  mine: "Шахта",
  idle: "Город",
};

export const HUNTER_ARCHETYPE_LABEL: Record<HunterArchetype, string> = {
  hardcore: "Хардкор",
  regular: "Охотник",
  casual: "Случайный",
  crafter: "Мастер",
  dungeoneer: "Данжер",
};

function hunterName(index: number) {
  const given = GIVEN[index % GIVEN.length]!;
  const epithet = EPITHET[(index * 11 + Math.floor(index / GIVEN.length) * 3) % EPITHET.length]!;
  return `${given} ${epithet}`;
}

function playRateFor(arch: HunterArchetype, rng: () => number) {
  if (arch === "hardcore") return 1.12 + rng() * 0.26;
  if (arch === "casual") return 0.28 + rng() * 0.28;
  if (arch === "crafter") return 0.68 + rng() * 0.22;
  if (arch === "dungeoneer") return 0.94 + rng() * 0.24;
  return 0.82 + rng() * 0.26;
}

function gearBiasFor(arch: HunterArchetype, rng: () => number) {
  if (arch === "hardcore") return 1.06 + rng() * 0.18;
  if (arch === "casual") return 0.76 + rng() * 0.18;
  if (arch === "crafter") return 1.08 + rng() * 0.16;
  if (arch === "dungeoneer") return 0.96 + rng() * 0.14;
  return 0.92 + rng() * 0.16;
}

function pickWeighted<T extends string>(weights: Record<T, number>, rng: () => number): T {
  let total = 0;
  for (const w of Object.values(weights) as number[]) total += w;
  let roll = rng() * total;
  for (const [key, w] of Object.entries(weights) as [T, number][]) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0] as T;
}

function secondsPerLevel(level: number) {
  if (level >= HUNTER_LEVEL_CAP) return Number.POSITIVE_INFINITY;
  if (level < 10) return 4 * 60;
  if (level < 30) return 8 * 60;
  if (level < 60) return 13 * 60;
  return 19 * 60;
}

function hunterXpPerSec(bot: WorldHunter) {
  if (bot.level >= HUNTER_LEVEL_CAP) return 0;
  const base = xpToNext(bot.level) / secondsPerLevel(bot.level);
  return base * bot.playRate * ACTIVITY_XP[bot.activity];
}

function farmLocationFor(level: number, power: number) {
  const id = recommendedLocationId(level, power);
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]!;
}

function dungeonHallFor(level: number) {
  const eligible = DUNGEON_HALLS.filter((h) => h.minLevel <= level);
  return eligible[eligible.length - 1] ?? DUNGEON_HALLS[0]!;
}

function activityDuration(activity: HunterActivity, arch: HunterArchetype, rng: () => number) {
  const idleBoost = arch === "casual" ? 1.8 : 1;
  if (activity === "idle") return (8 + rng() * 22) * 60 * idleBoost;
  if (activity === "farm") return (12 + rng() * 28) * 60;
  if (activity === "dungeon") return (22 + rng() * 38) * 60;
  if (activity === "enhance") return (4 + rng() * 10) * 60;
  if (activity === "gems") return (3 + rng() * 7) * 60;
  if (activity === "market") return (2 + rng() * 5) * 60;
  return (10 + rng() * 16) * 60;
}

function activityLabel(bot: Pick<WorldHunter, "activity" | "level" | "power" | "enhance">) {
  if (bot.activity === "farm") {
    return `Фарм: ${farmLocationFor(bot.level, bot.power).name}`;
  }
  if (bot.activity === "dungeon") {
    const hall = dungeonHallFor(bot.level);
    return `Данж: ${hall.name} · ${DUNGEON_TYPE_LABEL[hall.type]}`;
  }
  if (bot.activity === "enhance") return `Точит снаряжение +${bot.enhance}`;
  if (bot.activity === "gems") return "Вставляет камни";
  if (bot.activity === "market") return "Продаёт трофеи";
  if (bot.activity === "mine") return "Добывает руду";
  return "В городе";
}

function assignGuild(power: number, arch: HunterArchetype, rng: () => number) {
  const eligible = WORLD_GUILDS.filter((g) => power >= g.minBm * 0.85);
  const pool = eligible.length ? eligible : WORLD_GUILDS;
  if (arch === "casual") {
    const soft = pool.filter((g) => g.minBm < 2000);
    const use = soft.length ? soft : pool;
    return use[Math.floor(rng() * use.length)]!.name;
  }
  if (arch === "hardcore") {
    const top = pool.reduce((a, b) => (a.minBm >= b.minBm ? a : b));
    return rng() < 0.7 ? top.name : pool[Math.floor(rng() * pool.length)]!.name;
  }
  return pool[Math.floor(rng() * pool.length)]!.name;
}

function hunterPower(bot: Pick<WorldHunter, "level" | "enhance" | "gearBias">) {
  const invested = expectedBm(bot.level);
  const expectedEnhance = investedGearProfile(bot.level).enhance;
  const expectedMult = 1 + expectedEnhance * 0.028;
  const liveMult = 1 + bot.enhance * 0.028;
  const enhanceRatio = expectedMult > 0 ? liveMult / expectedMult : 1;
  return Math.max(1, Math.round(invested * bot.gearBias * enhanceRatio));
}

function grantXp(bot: WorldHunter, amount: number) {
  if (amount <= 0 || bot.level >= HUNTER_LEVEL_CAP) return;
  bot.xp += amount;
  while (bot.level < HUNTER_LEVEL_CAP && bot.xp >= xpToNext(bot.level)) {
    bot.xp -= xpToNext(bot.level);
    bot.level += 1;
  }
  if (bot.level >= HUNTER_LEVEL_CAP) bot.xp = 0;
}

function rollActivity(bot: WorldHunter, now: number, rng: () => number) {
  bot.activity = pickWeighted(ARCH_ACTIVITY[bot.archetype], rng);
  bot.activityUntil = now + activityDuration(bot.activity, bot.archetype, rng) * 1000;
  bot.activityLabel = activityLabel(bot);
}

function applyEnhanceWindow(bot: WorldHunter, seconds: number, rng: () => number) {
  if (seconds <= 0) return;
  const attempts = Math.min(48, Math.floor(seconds / 22 + (rng() < (seconds % 22) / 22 ? 1 : 0)));
  for (let i = 0; i < attempts; i++) {
    if (bot.enhance >= MAX_ENHANCE) break;
    if (rng() < enhanceSuccessChance(bot.enhance)) {
      bot.enhance += 1;
      continue;
    }
    const floor = enhanceSafeFloor(bot.enhance);
    if (bot.enhance >= 8 && floor < bot.enhance && rng() < 0.7) {
      bot.enhance = Math.max(floor, bot.enhance - 1);
    }
  }
}

function applyGemWindow(bot: WorldHunter, seconds: number, rng: () => number) {
  const bumps = Math.min(12, Math.floor(seconds / 40));
  const cap = bot.archetype === "crafter" || bot.archetype === "hardcore" ? 1.32 : 1.22;
  for (let i = 0; i < bumps; i++) {
    if (rng() < 0.55) bot.gearBias = Math.min(cap, bot.gearBias + 0.004);
  }
}

function simulateOne(bot: WorldHunter, seconds: number, now: number) {
  if (seconds <= 0) return;
  const rng = mulberry32(hash32(`${bot.id}:${Math.floor(now / 1000)}:${bot.activity}`));
  let left = seconds;
  const startLevel = bot.level;
  while (left > 0.05) {
    const until = Math.max(0, (bot.activityUntil - (now - left * 1000)) / 1000);
    const slice = Math.max(0.05, Math.min(left, until > 0.2 ? until : left));
    grantXp(bot, hunterXpPerSec(bot) * slice);
    if (bot.activity === "enhance") applyEnhanceWindow(bot, slice, rng);
    if (bot.activity === "gems") applyGemWindow(bot, slice, rng);
    if (bot.level >= HUNTER_LEVEL_CAP && (bot.activity === "farm" || bot.activity === "dungeon")) {
      if (rng() < 0.35) bot.gearBias = Math.min(1.34, bot.gearBias + 0.0008 * slice);
    }
    left -= slice;
    const sliceEnd = now - left * 1000;
    if (sliceEnd >= bot.activityUntil - 50) {
      bot.power = hunterPower(bot);
      rollActivity(bot, sliceEnd, rng);
    }
  }
  bot.power = hunterPower(bot);
  if (bot.level !== startLevel) bot.guild = assignGuild(bot.power, bot.archetype, rng);
  bot.activityLabel = activityLabel(bot);
}

function createHunter(index: number, now: number): WorldHunter {
  const id = `hunt-${String(index).padStart(2, "0")}`;
  const rng = mulberry32(hash32(`shard-hunter-v1:${id}`));
  const archetype = ARCHETYPES[index] ?? "regular";
  const classId = HUNTER_CLASS_IDS[index % HUNTER_CLASS_IDS.length]!;
  const avatarId = AVATAR_IDS[index % AVATAR_IDS.length]!;
  const bot: WorldHunter = {
    id,
    name: hunterName(index),
    guild: WORLD_GUILDS[index % WORLD_GUILDS.length]!.name,
    classId,
    avatarId,
    archetype,
    level: 1,
    xp: Math.floor(rng() * xpToNext(1) * 0.35),
    power: 1,
    enhance: 0,
    gearBias: gearBiasFor(archetype, rng),
    playRate: playRateFor(archetype, rng),
    activity: "farm",
    activityLabel: "",
    activityUntil: now + activityDuration("farm", archetype, rng) * 1000,
  };
  bot.power = hunterPower(bot);
  bot.guild = assignGuild(bot.power, bot.archetype, rng);
  bot.activityLabel = activityLabel(bot);
  return bot;
}

export function createWorldHunters(now = Date.now()): WorldHunter[] {
  const names = new Set<string>();
  const hunters = Array.from({ length: WORLD_HUNTER_COUNT }, (_, i) => {
    const bot = createHunter(i, now);
    if (names.has(bot.name)) bot.name = `${bot.name} ${i + 1}`;
    names.add(bot.name);
    return bot;
  });
  return hunters;
}

function syncLeaderboardFromHunters(state: { worldHunters: WorldHunter[]; leaderboard: GameData["leaderboard"] }) {
  state.leaderboard = [...state.worldHunters]
    .sort((a, b) => b.power - a.power || b.level - a.level)
    .slice(0, LEADERBOARD_SLICE)
    .map((h) => ({ id: h.id, name: h.name, guild: h.guild, power: h.power }));
}

export function ensureHunters(state: GameData, now = Date.now()) {
  if (
    !Array.isArray(state.worldHunters) ||
    state.worldHunters.length !== WORLD_HUNTER_COUNT ||
    state.meta.hunterRoster !== HUNTER_ROSTER_GEN
  ) {
    state.worldHunters = createWorldHunters(now);
    state.meta.hunterRoster = HUNTER_ROSTER_GEN;
  }
  if (!Array.isArray(state.leaderboard)) state.leaderboard = [];
  if (state.meta.hunterAcc == null) state.meta.hunterAcc = 0;
}

export function simulateHunters(state: GameData, dt: number, now = Date.now()) {
  ensureHunters(state, now);
  const acc = (state.meta.hunterAcc ?? 0) + Math.max(0, dt);
  if (acc < HUNTER_STEP && dt < 8) {
    state.meta.hunterAcc = acc;
    return;
  }
  state.meta.hunterAcc = acc % HUNTER_STEP;
  const seconds = acc - state.meta.hunterAcc;
  if (seconds <= 0) return;
  for (const bot of state.worldHunters) simulateOne(bot, seconds, now);
  syncLeaderboardFromHunters(state);
}

export interface RankingRow {
  id: string;
  name: string;
  guild: string;
  classId: HunterClass | null;
  avatarId: string;
  level: number;
  power: number;
  activityLabel: string;
  activity: HunterActivity | "you";
  archetype: HunterArchetype | "you";
  you: boolean;
}

export function rankingRows(
  hunters: WorldHunter[],
  player: {
    name: string;
    guild: string;
    classId: HunterClass | null;
    avatarId: string;
    level: number;
    power: number;
  },
): RankingRow[] {
  const rows: RankingRow[] = hunters.map((h) => ({
    id: h.id,
    name: h.name,
    guild: h.guild,
    classId: h.classId,
    avatarId: h.avatarId,
    level: h.level,
    power: h.power,
    activityLabel: h.activityLabel,
    activity: h.activity,
    archetype: h.archetype,
    you: false,
  }));
  rows.push({
    id: "player",
    name: player.name,
    guild: player.guild || "Без гильдии",
    classId: player.classId,
    avatarId: player.avatarId,
    level: player.level,
    power: player.power,
    activityLabel: "Вы",
    activity: "you",
    archetype: "you",
    you: true,
  });
  return rows;
}

export function sortRanking(rows: RankingRow[], by: "level" | "power") {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (by === "level") {
      if (b.level !== a.level) return b.level - a.level;
      if (b.power !== a.power) return b.power - a.power;
    } else {
      if (b.power !== a.power) return b.power - a.power;
      if (b.level !== a.level) return b.level - a.level;
    }
    return a.name.localeCompare(b.name, "ru");
  });
  return copy;
}

export function rankOf(rows: RankingRow[], by: "level" | "power") {
  const sorted = sortRanking(rows, by);
  const i = sorted.findIndex((r) => r.you);
  return i < 0 ? sorted.length : i + 1;
}
