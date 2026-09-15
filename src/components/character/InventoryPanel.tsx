"use client";

import { Backpack, CheckSquare, Coins, Recycle, Rows3, Square } from "lucide-react";
import { INVENTORY_SIZE } from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/formulas";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { CraftPanel } from "./CraftPanel";
import { AutoSellMenu } from "./AutoSellMenu";
import {
  InventoryFilters,
  InventoryGrid,
  InventorySortControls,
  inventoryFillCount,
} from "./InventoryGrid";

export function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const sellItems = useGameStore((s) => s.sellItems);
  const salvageItems = useGameStore((s) => s.salvageItems);
  const compactInventory = useGameStore((s) => s.compactInventory);
  const selectionMode = useUiStore((s) => s.selectionMode);
  const setSelectionMode = useUiStore((s) => s.setSelectionMode);
  const bulkSelectedIds = useUiStore((s) => s.bulkSelectedIds);
  const clearBulkSelection = useUiStore((s) => s.clearBulkSelection);
  const inventoryMessage = useUiStore((s) => s.inventoryMessage);
  const setInventoryMessage = useUiStore((s) => s.setInventoryMessage);

  const selectedCount = bulkSelectedIds.length;
  const filled = inventoryFillCount(inventory);

  function sellSelected() {
    const res = sellItems(bulkSelectedIds);
    clearBulkSelection();
    setInventoryMessage(
      res.sold > 0
        ? `Продано ${res.sold} · +${formatNumber(res.gold)}`
        : "Надетое нельзя продать",
    );
  }

  function salvageSelected() {
    const res = salvageItems(bulkSelectedIds);
    clearBulkSelection();
    setInventoryMessage(
      res.salvaged > 0
        ? `Разобрано ${res.salvaged} · +${formatNumber(res.ore)}`
        : "Сначала снимите с куклы",
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid h-full min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(220px,32%)] grid-rows-[minmax(0,1fr)] items-stretch gap-3 max-lg:grid-cols-1 max-lg:grid-rows-[minmax(0,1fr)_minmax(11rem,38%)]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-visible">
          <div className="mb-1.5 flex w-max max-w-full shrink-0 flex-nowrap items-center gap-1 max-lg:w-full max-lg:overflow-x-auto max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden">
            <InventoryFilters />
            <InventorySortControls />
            <AutoSellMenu />
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] tabular-nums text-[#8aa0b4]">
              <Backpack className="h-3 w-3" />
              {filled}/{INVENTORY_SIZE}
            </span>
          </div>

          {inventoryMessage ? (
            <p className="mb-1 shrink-0 text-[11px] leading-tight text-amber">{inventoryMessage}</p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible p-1">
            <InventoryGrid />
          </div>
          <div className="es-plate mt-2 flex shrink-0 items-center gap-1.5 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setSelectionMode(!selectionMode)}
              className={selectionMode ? "es-btn es-btn-cyan es-inv-control px-2.5" : "es-btn es-inv-control px-2.5"}
              title={selectionMode ? "Выключить выбор" : "Массовый выбор"}
            >
              {selectionMode ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
              Выбор
            </button>
            {selectionMode ? (
              <>
                <span className="shrink-0 tabular-nums text-[11px] text-[#8aa0b4]">{selectedCount}</span>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={sellSelected}
                  className="es-btn es-btn-amber es-inv-control px-2.5"
                >
                  <Coins className="h-3 w-3" /> Продать
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={salvageSelected}
                  className="es-btn es-btn-cyan es-inv-control px-2.5"
                >
                  <Recycle className="h-3 w-3" /> Разобрать
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => compactInventory()}
              className="es-btn es-inv-control ml-auto h-7 w-7 px-0"
              title="Уплотнить"
              aria-label="Уплотнить"
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <aside className="flex h-full min-h-0 min-w-0 flex-col self-stretch overflow-hidden">
          <CraftPanel />
        </aside>
      </div>
    </div>
  );
}
