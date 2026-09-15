import { MAX_ENHANCE } from "./constants";

/**
 * Enhancement is a long chase, not a lottery.
 *
 * The old curve bottomed out at 10% with a 12% chance to reset the item to +0,
 * which put +15 around four thousand attempts and seven million gold — nobody
 * was ever getting there, so the whole top half of the ladder was decoration.
 *
 * Two changes keep the tension without the cliff:
 *   - failures never drop you below the last safe level you reached;
 *   - the tail bottoms out at 30% instead of 10%, and nothing resets to zero.
 *
 * That lands +15 near 120 attempts. Check with `npx tsx scripts/enhance.ts`.
 */
export const ENHANCE_CHANCE = [
  1, 0.95, 0.92, 0.88, 0.84, 0.78, 0.72, 0.64, 0.54, 0.44, 0.34, 0.26, 0.2, 0.15, 0.11,
];

/** Once reached, a failure can never knock the item below these. */
export const ENHANCE_SAFE_LEVELS = [0, 5, 10, 13] as const;

export function enhanceSuccessChance(currentLevel: number) {
  if (currentLevel >= MAX_ENHANCE) return 0;
  return ENHANCE_CHANCE[currentLevel] ?? 0.3;
}

export function enhanceSafeFloor(currentLevel: number) {
  let floor = 0;
  for (const safe of ENHANCE_SAFE_LEVELS) {
    if (currentLevel >= safe) floor = safe;
  }
  return floor;
}

/** True when a failure at this level cannot cost you anything but the materials. */
export function isEnhanceSafe(currentLevel: number) {
  return currentLevel < 8 || enhanceSafeFloor(currentLevel) === currentLevel;
}

export function enhanceCost(currentLevel: number, itemLevel = 1) {
  // ~29% gold bump vs the old ×14 base — keeps enhance a meaningful sink after
  // the ~3.5× kill-gold faucet buff without returning to the old cliff.
  const gold = Math.round(18 * Math.pow(1.44, currentLevel) * (1 + Math.max(1, itemLevel) * 0.012));
  const ore = Math.max(1, Math.floor(1 + currentLevel * 0.75 + (currentLevel >= 10 ? 3 : 0)));
  const shards = currentLevel >= 10 ? Math.floor((currentLevel - 9) * 2) : 0;
  return { gold, ore, shards };
}

export type EnhanceFailKind = "stay" | "down";

export function enhanceFailKind(currentLevel: number): EnhanceFailKind {
  if (currentLevel < 8) return "stay";
  if (currentLevel <= enhanceSafeFloor(currentLevel)) return "stay";
  return Math.random() < 0.7 ? "down" : "stay";
}

/** Where an item lands after a failed attempt. */
export function enhanceLevelAfterFail(currentLevel: number) {
  if (enhanceFailKind(currentLevel) === "stay") return currentLevel;
  return Math.max(enhanceSafeFloor(currentLevel), currentLevel - 1);
}
