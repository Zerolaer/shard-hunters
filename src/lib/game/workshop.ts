import { MAX_ENHANCE } from "./constants";
import { isMaterialItem } from "./echoCraft";
import { emptySocketCount } from "./gems";
import type { GemRank, Item } from "./types";

/**
 * Мастерская — the post-+15 sink.
 *
 * Enhancement stops at +15, which used to be the end of gear progression. The
 * workshop adds two further steps on top of it:
 *   1. Благословение — a 15% roll that permanently lifts every stat on the item.
 *   2. Пробой — punches 1–3 sockets into a blessed item, once and for good.
 *
 * Both consume «искры благословения», which only drop in the endgame locations,
 * so the whole feature is gated behind combat power rather than behind time.
 */

export const BLESSING_MATERIAL_LABEL = "Искра благословения";
export const BLESSING_MATERIAL_SHORT = "искры";

export const BLESSING = {
  chance: 0.15,
  /** Mild gold bump (~28%) so workshop keeps pace with the kill-gold faucet. */
  cost: { gold: 32_000, shards: 40, sparks: 12 },
  /**
   * Applied to implicits and affixes on top of the +15 enhance multiplier, so a
   * blessed piece is ~22% stronger than the same piece at +15. It deliberately
   * does not touch socketed gems: gems are their own progression axis and
   * multiplying them here would compound two endgame systems into one.
   */
  statMult: 1.22,
} as const;

/**
 * Failure burns the materials and leaves the item untouched. Destroying or
 * de-levelling a +15 piece would make the 15% roll unplayable — the item behind
 * it already cost ~120 enhance attempts.
 */
export const BLESSING_FAIL_DESTROYS_ITEM = false;

export const SOCKET = {
  cost: { gold: 19_000, shards: 25, sparks: 8 },
  /** Punch outcome: index 0 → one socket, index 2 → three. Sums to 1. */
  weights: [0.5, 0.34, 0.16] as const,
  max: 3,
} as const;

/** Punching is one-shot: the socket count an item rolls is the count it keeps. */
export function rollSocketCount(roll = Math.random()) {
  let acc = 0;
  for (let i = 0; i < SOCKET.weights.length; i++) {
    acc += SOCKET.weights[i]!;
    if (roll < acc) return i + 1;
  }
  return SOCKET.weights.length;
}

export const GEM_BAG_SIZE = 120;

export function canBlessItem(item: Item | null | undefined) {
  if (!item) return { ok: false, reason: "Выберите предмет" };
  if (isMaterialItem(item)) return { ok: false, reason: "Материал нельзя благословить" };
  if (item.enhanceLevel < MAX_ENHANCE) return { ok: false, reason: `Нужна заточка +${MAX_ENHANCE}` };
  if (item.blessed) return { ok: false, reason: "Уже блеснут" };
  return { ok: true, reason: "" };
}

export function canPunchItem(item: Item | null | undefined) {
  if (!item) return { ok: false, reason: "Выберите предмет" };
  if (isMaterialItem(item)) return { ok: false, reason: "Материал нельзя пробить" };
  if (!item.blessed) return { ok: false, reason: "Сначала благословение" };
  if (item.sockets?.length) return { ok: false, reason: "Предмет уже пробит" };
  return { ok: true, reason: "" };
}

export function hasFreeSocket(item: Item | null | undefined) {
  return emptySocketCount(item) > 0;
}

export interface EndgameDropRates {
  /** Per-kill chance to drop blessing sparks. */
  sparkChance: number;
  sparkMin: number;
  sparkMax: number;
  /** Per-kill chance to drop a gem, before the boss multiplier. */
  gemChance: number;
  /** Added to the gem rank roll, in the same units as rollRarity's dropBonus. */
  gemRankBias: number;
}

/**
 * Where workshop materials come from. The two endgame locations are the faucet;
 * «Сердце Пустоты» keeps a trickle so the old final zone still leads somewhere.
 */
export const ENDGAME_DROPS: Record<string, EndgameDropRates> = {
  "void-heart": { sparkChance: 0.06, sparkMin: 1, sparkMax: 1, gemChance: 0.05, gemRankBias: 0.2 },
  "abyss-rift": { sparkChance: 0.16, sparkMin: 1, sparkMax: 2, gemChance: 0.14, gemRankBias: 0.55 },
  "throne-eclipse": { sparkChance: 0.26, sparkMin: 1, sparkMax: 3, gemChance: 0.2, gemRankBias: 0.95 },
  "crown-scar": { sparkChance: 0.3, sparkMin: 1, sparkMax: 3, gemChance: 0.24, gemRankBias: 1.05 },
  "null-cathedral": { sparkChance: 0.34, sparkMin: 1, sparkMax: 3, gemChance: 0.28, gemRankBias: 1.2 },
  "eternal-wound": { sparkChance: 0.4, sparkMin: 2, sparkMax: 4, gemChance: 0.34, gemRankBias: 1.4 },
  "ash-of-thrones": { sparkChance: 0.48, sparkMin: 2, sparkMax: 5, gemChance: 0.42, gemRankBias: 1.65 },
};

/**
 * Gems also fall outside the endgame, thinly and almost always grey, so the
 * socket system is discoverable long before a player can use it.
 */
export const GEM_WORLD_DROP = {
  minMonsterLevel: 20,
  chance: 0.02,
  rankBias: 0,
} as const;

/** Bosses pay a blessing/gem bundle rather than a slightly better roll. */
export const WORKSHOP_BOSS_MULT = 8;
/** Extra spark/gem roll chance on boss kills (multiplies zone base chance). */
export const WORKSHOP_BOSS_ROLL_MULT = 3.5;

export function endgameDropsFor(locationId: string): EndgameDropRates | null {
  return ENDGAME_DROPS[locationId] ?? null;
}

export function gemDropChanceFor(locationId: string, monsterLevel: number) {
  const endgame = endgameDropsFor(locationId);
  if (endgame) return { chance: endgame.gemChance, bias: endgame.gemRankBias };
  if (monsterLevel < GEM_WORLD_DROP.minMonsterLevel) return { chance: 0, bias: 0 };
  return { chance: GEM_WORLD_DROP.chance, bias: GEM_WORLD_DROP.rankBias };
}

export const GEM_RANK_ACCENT: Record<GemRank, string> = {
  common: "#9ca3af",
  uncommon: "#34d399",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#fb7185",
};
