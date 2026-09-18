"use client";

import { Backpack, CheckSquare, Coins, Recycle, Rows3, Square } from "lucide-react";
import {
  INVENTORY_COLS,
  INVENTORY_EXTRA_ROWS_MAX,
  INVENTORY_ROW_COSTS,
  inventoryCapacity,
} from "@/lib/game/constants";
import { formatFullDigits, formatNumber } from "@/lib/game/formulas";
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
  const gold = useGameStore((s) => s.resources.gold);
  const bagExtraRows = useGameStore((s) => s.meta.bagExtraRows ?? 0);
  const buyBagRow = useGameStore((s) => s.buyBagRow);
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
  const cap = inventoryCapacity(bagExtraRows);
  const nextRowCost =
    bagExtraRows < INVENTORY_EXTRA_ROWS_MAX ? INVENTORY_ROW_COSTS[bagExtraRows] : null;

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
      <div className="mb-1.5 flex w-full shrink-0 flex-nowrap items-center gap-1 max-lg:overflow-x-auto max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden">
        <InventoryFilters />
        <InventorySortControls />
        <AutoSellMenu />
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] tabular-nums text-[#8aa0b4]">
          <Backpack className="h-3 w-3" />
          {filled}/{cap}
        </span>
      </div>

      {inventoryMessage ? (
        <p className="mb-1 shrink-0 text-[11px] leading-tight text-amber">{inventoryMessage}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(220px,32%)] grid-rows-[minmax(0,1fr)] items-stretch gap-3 max-lg:grid-cols-1 max-lg:grid-rows-[minmax(0,1fr)_minmax(14rem,42%)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible p-1">
            <InventoryGrid />
          </div>
          {nextRowCost != null ? (
            <button
              type="button"
              onClick={() => {
                const res = buyBagRow();
                setInventoryMessage(res.message);
              }}
              disabled={gold < nextRowCost}
              className="es-btn es-inv-control mx-1 h-8 shrink-0 text-[11px]"
              title={`Купить ряд ${bagExtraRows + 1} (+${INVENTORY_COLS} ячеек)`}
            >
              <Rows3 className="h-3.5 w-3.5" />
              Ряд +{INVENTORY_COLS} · {formatFullDigits(nextRowCost)} зол.
            </button>
          ) : (
            <p className="px-1 text-[10px] text-white/30">Все доп. ряды куплены</p>
          )}
        </div>
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <CraftPanel />
        </aside>
      </div>

      <div className="es-plate mt-2 flex shrink-0 items-center gap-1.5 px-2 py-1.5 max-lg:order-last">
        <button
          type="button"
          onClick={() => {
            setSelectionMode(!selectionMode);
            clearBulkSelection();
          }}
          className="es-btn es-inv-control h-8 px-2 text-[11px]"
        >
          {selectionMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          Выбор
        </button>
        <button
          type="button"
          onClick={() => compactInventory()}
          className="es-btn es-inv-control h-8 px-2 text-[11px]"
        >
          <Rows3 className="h-3.5 w-3.5" />
          Уплотнить
        </button>
        {selectionMode && selectedCount > 0 ? (
          <>
            <button type="button" onClick={sellSelected} className="es-btn es-btn-amber h-8 px-2 text-[11px]">
              <Coins className="h-3.5 w-3.5" />
              Продать ({selectedCount})
            </button>
            <button type="button" onClick={salvageSelected} className="es-btn h-8 px-2 text-[11px]">
              <Recycle className="h-3.5 w-3.5" />
              Разобрать
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
