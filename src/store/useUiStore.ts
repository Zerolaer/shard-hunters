import { create } from "zustand";
import type { InventorySortMode } from "@/lib/game/inventory";
import type { EquipSlot, Rarity, RightTab } from "@/lib/game/types";

interface UiState {
  tab: RightTab;
  selectedItemId: string | null;
  selectionMode: boolean;
  bulkSelectedIds: string[];
  filterSlot: EquipSlot | "all";
  filterRarity: Rarity | "all";
  inventorySortMode: InventorySortMode;
  enhanceMessage: string | null;
  inventoryMessage: string | null;
  showCombatLog: boolean;
  setTab: (tab: RightTab) => void;
  /** Select / pin an item for CraftPanel + PinnedItemPanel. Pass null to dismiss. */
  selectItem: (id: string | null) => void;
  dismissItemPanel: () => void;
  setSelectionMode: (on: boolean) => void;
  toggleBulkItem: (id: string) => void;
  setBulkSelected: (ids: string[]) => void;
  clearBulkSelection: () => void;
  setFilterSlot: (slot: EquipSlot | "all") => void;
  setFilterRarity: (rarity: Rarity | "all") => void;
  setInventorySortMode: (mode: InventorySortMode) => void;
  setEnhanceMessage: (msg: string | null) => void;
  setInventoryMessage: (msg: string | null) => void;
  setShowCombatLog: (on: boolean) => void;
  toggleCombatLog: () => void;
}

function readShowCombatLog(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("sh-show-combat-log");
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function writeShowCombatLog(on: boolean) {
  try {
    window.localStorage.setItem("sh-show-combat-log", on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export const useUiStore = create<UiState>((set) => ({
  tab: "character",
  selectedItemId: null,
  selectionMode: false,
  bulkSelectedIds: [],
  filterSlot: "all",
  filterRarity: "all",
  inventorySortMode: "rarity",
  enhanceMessage: null,
  inventoryMessage: null,
  showCombatLog: false,
  setTab: (tab) => set({ tab }),
  selectItem: (id) => set({ selectedItemId: id }),
  dismissItemPanel: () => set({ selectedItemId: null, enhanceMessage: null }),
  setSelectionMode: (on) =>
    set({
      selectionMode: on,
      bulkSelectedIds: on ? [] : [],
      inventoryMessage: null,
    }),
  toggleBulkItem: (id) =>
    set((s) => ({
      bulkSelectedIds: s.bulkSelectedIds.includes(id)
        ? s.bulkSelectedIds.filter((x) => x !== id)
        : [...s.bulkSelectedIds, id],
    })),
  setBulkSelected: (ids) => set({ bulkSelectedIds: ids }),
  clearBulkSelection: () => set({ bulkSelectedIds: [], inventoryMessage: null }),
  setFilterSlot: (filterSlot) => set({ filterSlot }),
  setFilterRarity: (filterRarity) => set({ filterRarity }),
  setInventorySortMode: (inventorySortMode) => set({ inventorySortMode }),
  setEnhanceMessage: (enhanceMessage) => set({ enhanceMessage }),
  setInventoryMessage: (inventoryMessage) => set({ inventoryMessage }),
  setShowCombatLog: (showCombatLog) => {
    writeShowCombatLog(showCombatLog);
    set({ showCombatLog });
  },
  toggleCombatLog: () =>
    set((s) => {
      const showCombatLog = !s.showCombatLog;
      writeShowCombatLog(showCombatLog);
      return { showCombatLog };
    }),
}));

export function hydrateCombatLogPref() {
  useUiStore.setState({ showCombatLog: readShowCombatLog() });
}
