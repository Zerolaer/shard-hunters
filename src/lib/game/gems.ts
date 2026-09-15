import { irand, rand, uid } from "./rng";
import { RARITIES, type Affix, type AffixStat, type Gem, type GemRank, type Item } from "./types";

/**
 * Gems reuse the item rarity ladder so drop rolls, colours and the fusion chain
 * all share one ordering. Only the player-facing names differ: a gem is read by
 * its colour, not by "необычный".
 */
export const GEM_RANKS: readonly GemRank[] = RARITIES;

export const GEM_RANK_LABEL: Record<GemRank, string> = {
  common: "Серый",
  uncommon: "Зелёный",
  rare: "Синий",
  epic: "Фиолетовый",
  legendary: "Золотой",
  mythic: "Мифический",
};

export const GEM_NAME: Record<GemRank, string> = {
  common: "Тусклый осколок",
  uncommon: "Зелёный кристалл",
  rare: "Синяя слеза",
  epic: "Фиолетовое око",
  legendary: "Золотое ядро",
  mythic: "Мифическая искра",
};

/** Three of a rank fuse into one of the next; mythic is the end of the chain. */
export const GEMS_PER_FUSION = 3;

export function nextGemRank(rank: GemRank): GemRank | null {
  const i = GEM_RANKS.indexOf(rank);
  if (i < 0 || i >= GEM_RANKS.length - 1) return null;
  return GEM_RANKS[i + 1]!;
}

/**
 * Stat budget of a gem, in abstract units, and how many stats it is split over.
 *
 * The ladder grows by ~2.6× per rank while fusion costs 3 gems, so fusing is a
 * small loss of raw power bought with socket space — sockets, not gems, are the
 * scarce resource once the material faucet is running.
 *
 * Anchor: a golden gem (44 units, 3 stats) is worth about one mythic affix on a
 * level-100 item. A full 24-socket golden loadout therefore adds roughly half a
 * mythic kit's affix budget, which is the intended endgame ceiling.
 */
export const GEM_BUDGET: Record<GemRank, { units: number; stats: number }> = {
  common: { units: 1, stats: 1 },
  uncommon: { units: 2.6, stats: 1 },
  rare: { units: 6.8, stats: 2 },
  epic: { units: 17, stats: 2 },
  legendary: { units: 44, stats: 3 },
  mythic: { units: 115, stats: 3 },
};

/** Value of one budget unit, per stat. Mirrors the relative worth of affixes. */
export const GEM_UNIT_VALUE: Record<AffixStat, number> = {
  strength: 1.7,
  agility: 1.7,
  intelligence: 1.7,
  endurance: 1.7,
  attack: 2.2,
  defense: 2.3,
  health: 14,
  critChance: 0.14,
  critDamage: 0.7,
  accuracy: 0.18,
};

export const GEM_STAT_POOL: AffixStat[] = [
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
];

/** Per-stat roll spread. Wide enough that two gems of a rank are worth comparing. */
const GEM_ROLL_MIN = 0.72;
const GEM_ROLL_MAX = 1.28;

function isPercentStat(stat: AffixStat) {
  return stat === "critChance" || stat === "critDamage" || stat === "accuracy";
}

function rollGemAffixes(rank: GemRank): Affix[] {
  const { units, stats } = GEM_BUDGET[rank];
  const pool = [...GEM_STAT_POOL];
  const share = units / stats;
  const result: Affix[] = [];
  for (let i = 0; i < stats && pool.length; i++) {
    const stat = pool.splice(irand(0, pool.length - 1), 1)[0] as AffixStat;
    const raw = share * rand(GEM_ROLL_MIN, GEM_ROLL_MAX) * GEM_UNIT_VALUE[stat];
    const value = isPercentStat(stat) ? Math.round(raw * 10) / 10 : Math.round(raw);
    result.push({ stat, value: Math.max(isPercentStat(stat) ? 0.1 : 1, value) });
  }
  return result;
}

export function createGem(rank: GemRank): Gem {
  return { id: uid(), rank, affixes: rollGemAffixes(rank) };
}

/**
 * Fusion rerolls rather than inheriting: carrying stats forward would make the
 * chain deterministic and turn every mythic gem into the same gem, while a
 * reroll keeps the last step of the ladder a real roll worth repeating.
 */
export function fuseGems(rank: GemRank): Gem | null {
  const next = nextGemRank(rank);
  if (!next) return null;
  return createGem(next);
}

/** Rough comparison value, used for sorting and for picking fusion fodder. */
export function gemScore(gem: Gem) {
  return gem.affixes.reduce((s, a) => s + a.value / (GEM_UNIT_VALUE[a.stat] || 1), 0);
}

export function gemStatValue(gem: Gem, stat: AffixStat) {
  return gem.affixes.reduce((s, a) => (a.stat === stat ? s + a.value : s), 0);
}

export function socketedGems(item: Item | null | undefined): Gem[] {
  if (!item?.sockets) return [];
  return item.sockets.filter((g): g is Gem => g !== null);
}

/** Gem contribution to one stat for a whole item. Not scaled by enhance or blessing. */
export function itemGemStat(item: Item | null | undefined, stat: AffixStat) {
  let total = 0;
  for (const gem of socketedGems(item)) total += gemStatValue(gem, stat);
  return total;
}

export function emptySocketCount(item: Item | null | undefined) {
  if (!item?.sockets) return 0;
  return item.sockets.reduce((n, g) => n + (g === null ? 1 : 0), 0);
}

/**
 * Score a gem for a recommended loadout: preferred stats weigh more by list order.
 * Used by build presets to fill empty sockets without unsocketing existing gems.
 */
export function gemPresetScore(gem: Gem, preferredStats: AffixStat[]) {
  let score = 0;
  preferredStats.forEach((stat, i) => {
    const weight = preferredStats.length - i;
    score += gemStatValue(gem, stat) * weight;
  });
  // Tiny tie-break so higher-rank / denser gems win when prefs are equal.
  return score * 1000 + gemScore(gem);
}

/**
 * Fill empty sockets on equipped gear from the gem bag, preferring `preferredStats`.
 * Does not remove already-socketed gems. Returns how many gems were inserted.
 */
export function applyPresetGemsToEquipment(
  equipment: Record<string, Item | null | undefined>,
  bag: Gem[],
  preferredStats: AffixStat[],
): number {
  if (!bag.length || !preferredStats.length) return 0;

  const slots: Array<{ item: Item; index: number }> = [];
  for (const item of Object.values(equipment)) {
    if (!item?.sockets?.length) continue;
    item.sockets.forEach((g, index) => {
      if (g === null) slots.push({ item, index });
    });
  }
  if (!slots.length) return 0;

  const ranked = bag
    .map((gem, bagIndex) => ({ gem, bagIndex, score: gemPresetScore(gem, preferredStats) }))
    .sort((a, b) => b.score - a.score);

  let socketed = 0;
  const usedBag = new Set<number>();
  for (const slot of slots) {
    const pick = ranked.find((row) => !usedBag.has(row.bagIndex));
    if (!pick) break;
    usedBag.add(pick.bagIndex);
    slot.item.sockets![slot.index] = pick.gem;
    socketed += 1;
  }

  // Remove socketed gems from the bag (highest score first → splice by descending index).
  const remove = [...usedBag].sort((a, b) => b - a);
  for (const idx of remove) bag.splice(idx, 1);

  return socketed;
}
