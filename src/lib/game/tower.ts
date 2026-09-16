import {
  monsterLevelOf,
  spotRequiredBm,
} from "./balance";
import { LOCATION_BY_ID, type LocationDef } from "./locations";
import { FARM_SPOT_BY_ID, type FarmSpotDef } from "./spots";
import type { GemRank, Monster, Rarity, TowerState } from "./types";

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

/**
 * Compress infinite floors onto a soft level/floor curve for the *base*
 * monster profile (level, boss flag, floorPower). Real fight difficulty comes
 * from {@link applyTowerGuardianPower}, which scales HP/ATK up to the floor's
 * recommended BM — otherwise deep floors show 100k+ BM while spawning a
 * softcapped floor-20 sponge that a mid-game kit one-shots.
 */
export function towerCombatFloor(floor: number) {
  const n = Math.max(1, floor);
  return 1 + Math.pow(n - 1, 0.78) * 0.55;
}

/**
 * How far the floor's recommended BM sits above the softcapped combat profile.
 * Floor 1 ≈ 1; floor 100 ≈ 10×; floor 200 ≈ 30×.
 */
export function towerPowerGap(floor: number) {
  const n = Math.max(1, floor);
  const combatFloor = towerCombatFloor(n);
  const level = monsterLevelOf(TOWER_BASE_LEVEL, combatFloor, true);
  const baseline = spotRequiredBm(level, "hot", "boss");
  return towerRecommendedBm(n) / Math.max(1, baseline);
}

/**
 * Scale a softcapped tower guardian so its combat power matches the BM the UI
 * advertises. Attack tracks the gap at least 1:1 — Assassin lifesteal and short
 * tower TTKs otherwise leave the player at full HP while the tooltip screams
 * "103k BM". HP stays just under linear so deep floors are phases, not sponges.
 */
export function applyTowerGuardianPower(monster: Monster, floor: number) {
  const gap = Math.max(0.5, towerPowerGap(floor));
  // Equal-BM (~1.0): clear in ~8–18s with chip damage.
  // Half-BM (~0.5): death — the old softcap let 48k BM one-shot a "103k" floor.
  const hpMult = Math.pow(gap, 0.85);
  const atkMult = Math.pow(gap, 1.16);
  const defMult = Math.pow(gap, 0.55);
  monster.maxHp = Math.max(1, Math.round(monster.maxHp * hpMult));
  monster.hp = monster.maxHp;
  monster.attack = Math.max(1, Math.round(monster.attack * atkMult));
  monster.defense = Math.max(1, Math.round(monster.defense * defMult));
  monster.attackInterval = Math.max(1.25, Math.min(monster.attackInterval, 1.5));
  return monster;
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

/**
 * Infinite BM climb. Softcapped combat floor alone cannot carry deep floors —
 * see {@link applyTowerGuardianPower}. Rough recommended BM:
 *   F50≈25k · F100≈90k · F210≈490k · F250≈740k · F300≈1.3M.
 */
export function towerRecommendedBm(floor: number) {
  const n = Math.max(1, floor);
  const combatFloor = towerCombatFloor(n);
  const level = monsterLevelOf(TOWER_BASE_LEVEL, combatFloor, true);
  const base = spotRequiredBm(level, "hot", "normal");
  const climb = Math.pow(1 + (n - 1) * 0.028, 1.55);
  const threat = 1.1 + Math.min(0.9, (n - 1) * 0.004);
  return Math.max(1, Math.round(base * climb * threat));
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
  /** Deep floors pay more — overboost climb must stay a faucet, not a sponge. */
  const depth = 1 + Math.max(0, n - 100) * 0.006;
  const gold = Math.round((22 + n * 16) * depth * (milestone ? 4.2 : 1));
  const ore = Math.round(n * depth * (milestone ? 1.8 : 0.4));
  const shards = Math.round((8 + n * 3.2) * depth * (milestone ? 3.4 : 1));
  if (!milestone) {
    return { gold, ore, shards, sparks: 0, itemRarity: null, gemRank: null };
  }
  const rarity = towerMilestoneRarity(n);
  return {
    gold,
    ore: Math.max(6, ore),
    shards,
    sparks: 1 + Math.floor(n / TOWER_MILESTONE) + Math.floor(Math.max(0, n - 150) / 50),
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
