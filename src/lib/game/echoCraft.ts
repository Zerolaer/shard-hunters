import { uid } from "./rng";
import type { Item, Rarity } from "./types";

/** Inventory reagent dropped by every kill. Separate from currency `resources.shards`. */
export const ECHO_SHARD_ID = "echo-shard";
export const ECHO_SHARD_NAME = "Осколок эха";
export const ECHO_SHARD_PLURAL = "Осколки эха";

export type EchoChestRarity = Extract<Rarity, "rare" | "epic" | "legendary" | "mythic">;

export interface EchoChestRecipe {
  rarity: EchoChestRarity;
  cost: number;
  title: string;
  hint: string;
}

export const ECHO_CHESTS: readonly EchoChestRecipe[] = [
  {
    rarity: "rare",
    cost: 20,
    title: "Тусклый сундук эха",
    hint: "Случайный редкий предмет вашего уровня",
  },
  {
    rarity: "epic",
    cost: 45,
    title: "Звонкий сундук эха",
    hint: "Случайный эпический предмет вашего уровня",
  },
  {
    rarity: "legendary",
    cost: 70,
    title: "Гулкий сундук эха",
    hint: "Случайный легендарный предмет вашего уровня",
  },
  {
    rarity: "mythic",
    cost: 100,
    title: "Резонирующий сундук эха",
    hint: "Случайный мифический предмет вашего уровня",
  },
];

export function isMaterialItem(item: Item | null | undefined): item is Item & { kind: "material" } {
  return !!item && item.kind === "material";
}

export function isEchoShard(item: Item | null | undefined): item is Item & { kind: "material"; materialId: typeof ECHO_SHARD_ID } {
  return isMaterialItem(item) && item.materialId === ECHO_SHARD_ID;
}

export function echoQty(item: Item): number {
  return Math.max(1, Math.floor(item.qty ?? 1));
}

export function countEchoShards(inventory: Array<Item | null>): number {
  let n = 0;
  for (const it of inventory) {
    if (isEchoShard(it)) n += echoQty(it);
  }
  return n;
}

export function createEchoShardStack(qty: number): Item {
  return {
    id: uid(),
    name: ECHO_SHARD_NAME,
    slot: "amulet",
    rarity: "epic",
    itemLevel: 1,
    enhanceLevel: 0,
    affixes: [],
    implicitAttack: 0,
    implicitDefense: 0,
    implicitHealth: 0,
    kind: "material",
    materialId: ECHO_SHARD_ID,
    qty: Math.max(1, Math.floor(qty)),
  };
}

export function echoDropQty(kind: "trash" | "boss" | "pvp"): number {
  if (kind === "boss") return 3 + Math.floor(Math.random() * 4);
  return 1 + Math.floor(Math.random() * 2);
}

export function echoChestRecipe(rarity: Rarity): EchoChestRecipe | undefined {
  return ECHO_CHESTS.find((row) => row.rarity === rarity);
}

/** True if spending `amount` would wipe at least one stack (freeing a bag slot). */
export function echoSpendFreesSlot(inventory: Array<Item | null>, amount: number): boolean {
  let left = amount;
  for (const it of inventory) {
    if (!isEchoShard(it) || left <= 0) continue;
    const q = echoQty(it);
    if (q <= left) return true;
    left -= q;
  }
  return false;
}

export function consumeEchoShards(inventory: Array<Item | null>, amount: number): boolean {
  if (amount <= 0) return true;
  if (countEchoShards(inventory) < amount) return false;
  let left = amount;
  for (let i = 0; i < inventory.length && left > 0; i++) {
    const it = inventory[i];
    if (!isEchoShard(it)) continue;
    const q = echoQty(it);
    if (q <= left) {
      left -= q;
      inventory[i] = null;
    } else {
      it.qty = q - left;
      left = 0;
    }
  }
  return left === 0;
}

export function mergeEchoOnto(target: Item, incoming: Item): boolean {
  if (!isEchoShard(target) || !isEchoShard(incoming)) return false;
  target.qty = echoQty(target) + echoQty(incoming);
  return true;
}
