import { create } from "zustand";
import type { InventorySortMode } from "@/lib/game/inventory";
import type { EquipSlot, Rarity, RightTab } from "@/lib/game/types";

export type MobileScreen = "combat" | "panel";

interface UiState {
  tab: RightTab;
  /** Phone layout only: fight screen vs the selected right-panel. Desktop ignores this. */
  mobileScreen: MobileScreen;
  selectedItemId: string | null;
  selectionMode: boolean;
  bulkSelectedIds: string[];
  filterSlot: EquipSlot | "all";
  filterRarity: Rarity | "all";
  inventorySortMode: InventorySortMode;
  enhanceMessage: string | null;
  /** Dedicated заточка ceremony modal. */
  enhanceModalOpen: boolean;
  /** Pre-selected item ids when the enhance modal opens. */
  enhanceModalSeedIds: string[];
  inventoryMessage: string | null;
  showCombatLog: boolean;
  setTab: (tab: RightTab) => void;
  setMobileScreen: (screen: MobileScreen) => void;
  openMobileTab: (tab: RightTab) => void;
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
  openEnhanceModal: (seedIds?: string[]) => void;
  closeEnhanceModal: () => void;
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
  mobileScreen: "combat",
  selectedItemId: null,
  selectionMode: false,
  bulkSelectedIds: [],
  filterSlot: "all",
  filterRarity: "all",
  inventorySortMode: "rarity",
  enhanceMessage: null,
  enhanceModalOpen: false,
  enhanceModalSeedIds: [],
  inventoryMessage: null,
  showCombatLog: false,
  setTab: (tab) => set({ tab }),
  setMobileScreen: (mobileScreen) => set({ mobileScreen }),
  openMobileTab: (tab) => set({ tab, mobileScreen: "panel" }),
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
  openEnhanceModal: (seedIds) =>
    set({
      enhanceModalOpen: true,
      enhanceModalSeedIds: seedIds?.length ? [...seedIds] : [],
      enhanceMessage: null,
    }),
  closeEnhanceModal: () =>
    set({ enhanceModalOpen: false, enhanceModalSeedIds: [], enhanceMessage: null }),
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
