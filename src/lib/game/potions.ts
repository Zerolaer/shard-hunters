import { uid } from "./rng";
import type { Item, PotionBuffState, Rarity } from "./types";
import { isMaterialItem } from "./materials";

/** 30 minutes wall-clock for potion auras. */
export const POTION_DURATION_MS = 30 * 60 * 1000;

export type PotionKind = "attack" | "defense" | "accuracy" | "crit" | "haste";

export type PotionGrade = 1 | 2 | 3 | 4 | 5;

export interface PotionIngredientDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Farm this location for the reagent. */
  farmLocationId: string;
  farmHint: string;
  guildCoins: number;
}

export interface PotionRecipe {
  id: string;
  kind: PotionKind;
  grade: PotionGrade;
  name: string;
  blurb: string;
  gold: number;
  ingredients: Array<{ id: string; qty: number }>;
  /** Flat / percent bonuses applied while aura is active. */
  attack?: number;
  defense?: number;
  accuracy?: number;
  critChance?: number;
  skillHaste?: number;
}

export const POTION_KIND_LABEL: Record<PotionKind, string> = {
  attack: "Атака",
  defense: "Защита",
  accuracy: "Точность",
  crit: "Крит",
  haste: "Откат",
};

export const POTION_GRADE_LABEL: Record<PotionGrade, string> = {
  1: "Слабое",
  2: "Обычное",
  3: "Крепкое",
  4: "Отборное",
  5: "Эликсир",
};

export const POTION_INGREDIENTS: PotionIngredientDef[] = [
  {
    id: "herb-ash",
    name: "Пепельный корень",
    rarity: "common",
    farmLocationId: "woods",
    farmHint: "Шепчущий лес · обычные споты",
    guildCoins: 12,
  },
  {
    id: "herb-frost",
    name: "Инейник",
    rarity: "uncommon",
    farmLocationId: "caves",
    farmHint: "Кварцевые пещеры · богатые споты",
    guildCoins: 22,
  },
  {
    id: "herb-ember",
    name: "Угольная ягода",
    rarity: "rare",
    farmLocationId: "wastes",
    farmHint: "Пепельные пустоши · топ-споты",
    guildCoins: 36,
  },
  {
    id: "herb-void",
    name: "Пустоцвет",
    rarity: "epic",
    farmLocationId: "peak",
    farmHint: "Грозовой пик · апекс",
    guildCoins: 54,
  },
  {
    id: "herb-myth",
    name: "Миф-пыльца",
    rarity: "legendary",
    farmLocationId: "aftervoid",
    farmHint: "Послепустота · элитные зоны",
    guildCoins: 78,
  },
];

export const POTION_INGREDIENT_BY_ID: Record<string, PotionIngredientDef> = Object.fromEntries(
  POTION_INGREDIENTS.map((d) => [d.id, d]),
);

const GRADE_SCALE = [1, 1.55, 2.3, 3.4, 5] as const;
const GRADE_GOLD = [800, 2400, 7000, 18_000, 42_000] as const;
const GRADE_RARITY: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function recipeFor(kind: PotionKind, grade: PotionGrade): PotionRecipe {
  const s = GRADE_SCALE[grade - 1]!;
  const herb =
    grade <= 1
      ? "herb-ash"
      : grade === 2
        ? "herb-frost"
        : grade === 3
          ? "herb-ember"
          : grade === 4
            ? "herb-void"
            : "herb-myth";
  const ashQty = Math.max(1, 6 - grade);
  const base: PotionRecipe = {
    id: `potion-${kind}-${grade}`,
    kind,
    grade,
    name: `${POTION_GRADE_LABEL[grade]} зелье · ${POTION_KIND_LABEL[kind]}`,
    blurb: `+30 мин к ${POTION_KIND_LABEL[kind].toLowerCase()}.`,
    gold: GRADE_GOLD[grade - 1]!,
    ingredients: [
      { id: "herb-ash", qty: ashQty },
      { id: herb, qty: grade >= 3 ? 2 : 1 },
    ],
  };
  if (kind === "attack") base.attack = Math.round(18 * s);
  if (kind === "defense") base.defense = Math.round(14 * s);
  if (kind === "accuracy") base.accuracy = Math.round(4 * s * 10) / 10;
  if (kind === "crit") base.critChance = Math.round(2.2 * s * 10) / 10;
  if (kind === "haste") base.skillHaste = Math.round(0.035 * s * 1000) / 1000;
  return base;
}

export const POTION_RECIPES: PotionRecipe[] = (
  ["attack", "defense", "accuracy", "crit", "haste"] as PotionKind[]
).flatMap((kind) => ([1, 2, 3, 4, 5] as PotionGrade[]).map((g) => recipeFor(kind, g)));

export const POTION_RECIPE_BY_ID: Record<string, PotionRecipe> = Object.fromEntries(
  POTION_RECIPES.map((r) => [r.id, r]),
);

export function isPotionMaterial(item: Item | null | undefined): boolean {
  return isMaterialItem(item) && !!item.materialId?.startsWith("potion-");
}

export function isPotionIngredient(item: Item | null | undefined): boolean {
  return isMaterialItem(item) && !!item.materialId && !!POTION_INGREDIENT_BY_ID[item.materialId];
}

export function createPotionStack(recipeId: string, qty = 1): Item | null {
  const recipe = POTION_RECIPE_BY_ID[recipeId];
  if (!recipe) return null;
  return {
    id: uid(),
    name: recipe.name,
    slot: "amulet",
    rarity: GRADE_RARITY[recipe.grade - 1]!,
    itemLevel: recipe.grade,
    enhanceLevel: 0,
    affixes: [],
    implicitAttack: 0,
    implicitDefense: 0,
    implicitHealth: 0,
    kind: "material",
    materialId: recipe.id,
    qty: Math.max(1, Math.floor(qty)),
  };
}

export function createIngredientStack(ingredientId: string, qty = 1): Item | null {
  const def = POTION_INGREDIENT_BY_ID[ingredientId];
  if (!def) return null;
  return {
    id: uid(),
    name: def.name,
    slot: "amulet",
    rarity: def.rarity,
    itemLevel: 1,
    enhanceLevel: 0,
    affixes: [],
    implicitAttack: 0,
    implicitDefense: 0,
    implicitHealth: 0,
    kind: "material",
    materialId: def.id,
    qty: Math.max(1, Math.floor(qty)),
  };
}

export function potionBlurb(recipe: PotionRecipe): string {
  const parts: string[] = [];
  if (recipe.attack) parts.push(`атака +${recipe.attack}`);
  if (recipe.defense) parts.push(`защита +${recipe.defense}`);
  if (recipe.accuracy) parts.push(`точность +${recipe.accuracy}%`);
  if (recipe.critChance) parts.push(`крит +${recipe.critChance}%`);
  if (recipe.skillHaste) parts.push(`скорость навыков +${Math.round(recipe.skillHaste * 100)}%`);
  return `${parts.join(" · ")} · 30 мин`;
}

/** Trash kill chance to drop a matching ingredient for the spot's location. */
export function rollPotionIngredientDrop(locationId: string): Item | null {
  const pool = POTION_INGREDIENTS.filter((d) => d.farmLocationId === locationId);
  if (pool.length === 0) {
    // Soft fallback — ash herb everywhere at low rate.
    if (Math.random() > 0.08) return null;
    return createIngredientStack("herb-ash", 1);
  }
  const chance = locationId === "woods" ? 0.14 : locationId === "aftervoid" ? 0.05 : 0.09;
  if (Math.random() > chance) return null;
  const def = pool[Math.floor(Math.random() * pool.length)]!;
  return createIngredientStack(def.id, 1);
}

export function potionCombatBonuses(
  buffs: PotionBuffState[] | null | undefined,
  now = Date.now(),
): {
  attack: number;
  defense: number;
  accuracy: number;
  critChance: number;
  skillHaste: number;
} {
  const acc = { attack: 0, defense: 0, accuracy: 0, critChance: 0, skillHaste: 0 };
  for (const b of buffs ?? []) {
    if (b.expiresAt <= now) continue;
    const recipe = POTION_RECIPE_BY_ID[b.potionId];
    if (!recipe) continue;
    acc.attack += recipe.attack ?? 0;
    acc.defense += recipe.defense ?? 0;
    acc.accuracy += recipe.accuracy ?? 0;
    acc.critChance += recipe.critChance ?? 0;
    acc.skillHaste += recipe.skillHaste ?? 0;
  }
  return acc;
}

export function prunePotionBuffs(buffs: PotionBuffState[] | null | undefined, now = Date.now()) {
  return (buffs ?? []).filter((b) => b.expiresAt > now);
}
