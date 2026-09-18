import { uid } from "./rng";
import type { Item } from "./types";

/** Inventory reagents (not currency). */
export const BLESSING_SPARK_ID = "blessing-spark";
export const BLESSING_SPARK_NAME = "Искра благословения";
export const BLESSING_SPARK_PLURAL = "Искры благословения";

export const SOCKET_HAMMER_ID = "socket-hammer";
export const SOCKET_HAMMER_NAME = "Молоток пробоя";
export const SOCKET_HAMMER_PLURAL = "Молотки пробоя";

export function materialQty(item: Item): number {
  return Math.max(1, Math.floor(item.qty ?? 1));
}

export function isMaterialItem(item: Item | null | undefined): item is Item & { kind: "material" } {
  return !!item && item.kind === "material";
}

export function isMaterialId(item: Item | null | undefined, id: string): boolean {
  return isMaterialItem(item) && item.materialId === id;
}

export function isBlessingSpark(item: Item | null | undefined): boolean {
  return isMaterialId(item, BLESSING_SPARK_ID);
}

export function isSocketHammer(item: Item | null | undefined): boolean {
  return isMaterialId(item, SOCKET_HAMMER_ID);
}

export function countMaterial(inventory: Array<Item | null>, materialId: string): number {
  let n = 0;
  for (const it of inventory) {
    if (it && isMaterialId(it, materialId)) n += materialQty(it);
  }
  return n;
}

export function countBlessingSparks(inventory: Array<Item | null>): number {
  return countMaterial(inventory, BLESSING_SPARK_ID);
}

export function countSocketHammers(inventory: Array<Item | null>): number {
  return countMaterial(inventory, SOCKET_HAMMER_ID);
}

function createStack(opts: {
  materialId: string;
  name: string;
  rarity: Item["rarity"];
  qty: number;
  slot?: Item["slot"];
}): Item {
  return {
    id: uid(),
    name: opts.name,
    slot: opts.slot ?? "amulet",
    rarity: opts.rarity,
    itemLevel: 1,
    enhanceLevel: 0,
    affixes: [],
    implicitAttack: 0,
    implicitDefense: 0,
    implicitHealth: 0,
    kind: "material",
    materialId: opts.materialId,
    qty: Math.max(1, Math.floor(opts.qty)),
  };
}

export function createBlessingSparkStack(qty: number): Item {
  return createStack({
    materialId: BLESSING_SPARK_ID,
    name: BLESSING_SPARK_NAME,
    rarity: "legendary",
    qty,
  });
}

export function createSocketHammerStack(qty: number): Item {
  return createStack({
    materialId: SOCKET_HAMMER_ID,
    name: SOCKET_HAMMER_NAME,
    rarity: "epic",
    qty,
    slot: "weapon",
  });
}

/** Merge same materialId stacks on drag. */
export function mergeMaterialOnto(target: Item, incoming: Item): boolean {
  if (!isMaterialItem(target) || !isMaterialItem(incoming)) return false;
  if (!target.materialId || target.materialId !== incoming.materialId) return false;
  target.qty = materialQty(target) + materialQty(incoming);
  return true;
}

export function consumeMaterial(
  inventory: Array<Item | null>,
  materialId: string,
  amount: number,
): boolean {
  if (amount <= 0) return true;
  if (countMaterial(inventory, materialId) < amount) return false;
  let left = amount;
  for (let i = 0; i < inventory.length && left > 0; i++) {
    const it = inventory[i];
    if (!it || !isMaterialId(it, materialId)) continue;
    const q = materialQty(it);
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

export function consumeBlessingSparks(inventory: Array<Item | null>, amount: number): boolean {
  return consumeMaterial(inventory, BLESSING_SPARK_ID, amount);
}

export function consumeSocketHammers(inventory: Array<Item | null>, amount: number): boolean {
  return consumeMaterial(inventory, SOCKET_HAMMER_ID, amount);
}

/**
 * Move leftover `resources.blessing` currency into bag stacks (one-time migration).
 */
export function migrateBlessingCurrencyToItems(
  inventory: Array<Item | null>,
  blessingCurrency: number,
): { converted: number; leftoverCurrency: number } {
  const n = Math.max(0, Math.floor(blessingCurrency));
  if (n <= 0) return { converted: 0, leftoverCurrency: 0 };

  for (const it of inventory) {
    if (it && isBlessingSpark(it)) {
      it.qty = materialQty(it) + n;
      return { converted: n, leftoverCurrency: 0 };
    }
  }
  const empty = inventory.findIndex((c) => c == null);
  if (empty >= 0) {
    inventory[empty] = createBlessingSparkStack(n);
    return { converted: n, leftoverCurrency: 0 };
  }
  return { converted: 0, leftoverCurrency: n };
}

/** Rare hammer drop from trash/boss. */
export function rollSocketHammerDrop(kind: "trash" | "boss" | "pvp"): number {
  if (kind === "pvp") return 0;
  const chance = kind === "boss" ? 0.12 : 0.018;
  if (Math.random() >= chance) return 0;
  return kind === "boss" ? 1 + (Math.random() < 0.25 ? 1 : 0) : 1;
}
