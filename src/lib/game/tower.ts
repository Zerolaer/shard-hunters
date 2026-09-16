import { monsterLevelOf, spotRequiredBm } from "./balance";
import { LOCATION_BY_ID, type LocationDef } from "./locations";
import { FARM_SPOT_BY_ID, type FarmSpotDef } from "./spots";
import type { GemRank, Rarity, TowerState } from "./types";

export const TOWER_LOCATION_ID = "dung-tower";
export const TOWER_SPOT_ID = "dung-tower-0-0";
export const TOWER_MIN_LEVEL = 8;
export const TOWER_MILESTONE = 10;
export const TOWER_ACCENT = "#fb7185";
export const TOWER_BASE_LEVEL = 2;

const GUARDIANS = [
  "Страж первой ступени",
  "Надзиратель пролёта",
  "Хранитель винтовой лестницы",
  "Часовой зеркального яруса",
  "Палач колокольни",
  "Вестник шпиля",
  "Страж бездны ступеней",
  "Смотритель венца",
  "Эхо верхнего зала",
  "Хозяин короны",
] as const;

export function emptyTowerState(): TowerState {
  return { floor: 1, bestFloor: 0, active: false };
}

export function normalizeTowerState(raw: TowerState | null | undefined): TowerState {
  const floor = Math.max(1, Math.floor(raw?.floor ?? 1));
  const bestFloor = Math.max(0, Math.floor(raw?.bestFloor ?? 0));
  return {
    floor,
    bestFloor: Math.max(bestFloor, floor - 1),
    active: !!raw?.active,
  };
}

export function isTowerLocationId(id: string | null | undefined) {
  return id === TOWER_LOCATION_ID;
}

export function isTowerMilestone(floor: number) {
  return floor > 0 && floor % TOWER_MILESTONE === 0;
}

/** Compress infinite floors onto the open-world floor curve so TTK stays a climb, not a brick wall. */
export function towerCombatFloor(floor: number) {
  return 1 + (Math.max(1, floor) - 1) * 0.55;
}

export function towerBossName(floor: number) {
  const band = Math.floor((Math.max(1, floor) - 1) / TOWER_MILESTONE) % GUARDIANS.length;
  return `${GUARDIANS[band]} · эт. ${floor}`;
}

export function towerMilestoneRarity(floor: number): Rarity {
  if (floor >= 100) return "mythic";
  if (floor >= 70) return "legendary";
  if (floor >= 40) return "epic";
  if (floor >= 20) return "rare";
  return "uncommon";
}

export function towerRecommendedBm(floor: number) {
  const combatFloor = towerCombatFloor(floor);
  const level = monsterLevelOf(TOWER_BASE_LEVEL, combatFloor, true);
  const threat = 1.08 + Math.min(0.55, (Math.max(1, floor) - 1) * 0.008);
  return Math.max(1, Math.round(spotRequiredBm(level, "hot", "normal") * threat));
}

export function towerComfortBm(floor: number) {
  return Math.round(towerRecommendedBm(floor) * 0.86);
}

export interface TowerClearBonus {
  gold: number;
  ore: number;
  shards: number;
  sparks: number;
  itemRarity: Rarity | null;
  gemRank: GemRank | null;
}

export function towerClearBonus(floor: number): TowerClearBonus {
  const n = Math.max(1, floor);
  const milestone = isTowerMilestone(n);
  const gold = Math.round((22 + n * 16) * (milestone ? 4.2 : 1));
  const ore = Math.round(n * (milestone ? 1.8 : 0.4));
  const shards = Math.round((8 + n * 3.2) * (milestone ? 3.4 : 1));
  if (!milestone) {
    return { gold, ore, shards, sparks: 0, itemRarity: null, gemRank: null };
  }
  const rarity = towerMilestoneRarity(n);
  return {
    gold,
    ore: Math.max(6, ore),
    shards,
    sparks: 1 + Math.floor(n / TOWER_MILESTONE),
    itemRarity: rarity,
    gemRank: rarity,
  };
}

export function towerLocation(): LocationDef {
  return {
    id: TOWER_LOCATION_ID,
    name: "Башня Испытаний",
    blurb: "Бесконечные этажи. Каждый — босс. Каждые 10 этажей — особая награда.",
    minLevel: TOWER_MIN_LEVEL,
    accent: TOWER_ACCENT,
    mobNames: ["Тень ступени", "Страж пролёта", "Эхо лестницы"],
    bossName: "Страж Башни",
    baseLevel: TOWER_BASE_LEVEL,
    regionId: "dungeons",
    kind: "boss",
    threat: 1.18,
    rarityBias: 0.08,
  };
}

export function towerSpot(): FarmSpotDef {
  return {
    id: TOWER_SPOT_ID,
    locationId: TOWER_LOCATION_ID,
    row: 0,
    col: 0,
    name: "Площадка этажа",
    tier: "hot",
    dropChanceMult: 1.45,
    rarityBias: 0.1,
    xpMult: 1.55,
    goldMult: 1.4,
    danger: 1.12,
    pityKills: 6,
    requiredBm: towerRecommendedBm(1),
  };
}

const TOWER_LOC = towerLocation();
const TOWER_SPOT = towerSpot();
Object.assign(LOCATION_BY_ID, { [TOWER_LOCATION_ID]: TOWER_LOC });
Object.assign(FARM_SPOT_BY_ID, { [TOWER_SPOT_ID]: TOWER_SPOT });
