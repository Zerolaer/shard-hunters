import { itemPower } from "./formulas";
import { isMaterialItem, isEchoShard, mergeEchoOnto } from "./echoCraft";
import { EQUIP_SLOTS, type EquipSlot, type Item, type Rarity } from "./types";

export const INVENTORY_SORT_MODES = ["rarity", "slot", "itemLevel", "power", "name"] as const;
export type InventorySortMode = (typeof INVENTORY_SORT_MODES)[number];

export const INVENTORY_SORT_LABEL: Record<InventorySortMode, string> = {
  rarity: "По редкости",
  slot: "По слоту",
  itemLevel: "По уровню",
  power: "По силе (БМ)",
  name: "По имени",
};

const RARITY_RANK: Record<Rarity, number> = {
  mythic: 0,
  legendary: 1,
  epic: 2,
  rare: 3,
  uncommon: 4,
  common: 5,
};

const SLOT_RANK = Object.fromEntries(EQUIP_SLOTS.map((slot, i) => [slot, i])) as Record<
  EquipSlot,
  number
>;

function inBounds(inventory: Array<Item | null>, index: number) {
  return index >= 0 && index < inventory.length;
}

/** Swap two slots. Moving onto empty leaves a hole at `fromIndex`. */
export function moveInventoryItem(
  inventory: Array<Item | null>,
  fromIndex: number,
  toIndex: number,
) {
  if (fromIndex === toIndex) return;
  if (!inBounds(inventory, fromIndex) || !inBounds(inventory, toIndex)) return;
  const from = inventory[fromIndex];
  if (!from) return;
  const to = inventory[toIndex];
  if (to && isEchoShard(from) && isEchoShard(to) && mergeEchoOnto(to, from)) {
    inventory[fromIndex] = null;
    return;
  }
  inventory[fromIndex] = inventory[toIndex] ?? null;
  inventory[toIndex] = from;
}

/** Pack items to the front, keep relative order, empty cells at the end. */
export function compactInventory(inventory: Array<Item | null>) {
  const packed = inventory.filter((item): item is Item => item !== null);
  for (let i = 0; i < inventory.length; i++) {
    inventory[i] = packed[i] ?? null;
  }
}

function compareItems(a: Item, b: Item, mode: InventorySortMode) {
  if (isMaterialItem(a) !== isMaterialItem(b)) return isMaterialItem(a) ? -1 : 1;
  switch (mode) {
    case "rarity": {
      const rarity = RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
      if (rarity !== 0) return rarity;
      const slot = SLOT_RANK[a.slot] - SLOT_RANK[b.slot];
      if (slot !== 0) return slot;
      return b.itemLevel - a.itemLevel || a.name.localeCompare(b.name, "ru");
    }
    case "slot": {
      const slot = SLOT_RANK[a.slot] - SLOT_RANK[b.slot];
      if (slot !== 0) return slot;
      return RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
    }
    case "itemLevel": {
      const level = b.itemLevel - a.itemLevel;
      if (level !== 0) return level;
      return RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
    }
    case "power": {
      const power = itemPower(b) - itemPower(a);
      if (power !== 0) return power;
      return a.name.localeCompare(b.name, "ru");
    }
    case "name":
      return a.name.localeCompare(b.name, "ru");
  }
}

/** Sort occupied cells, then pack empties to the end. */
export function sortInventory(inventory: Array<Item | null>, mode: InventorySortMode) {
  const packed = inventory.filter((item): item is Item => item !== null);
  packed.sort((a, b) => compareItems(a, b, mode));
  for (let i = 0; i < inventory.length; i++) {
    inventory[i] = packed[i] ?? null;
  }
}
