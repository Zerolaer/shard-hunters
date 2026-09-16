"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowUpDown, ListFilter } from "lucide-react";
import { cn } from "@/lib/cn";
import { INVENTORY_COLS, RARITY_COLOR, RARITY_LABEL, SLOT_LABEL } from "@/lib/game/constants";
import { canWearItem } from "@/lib/game/equipment";
import { itemPower } from "@/lib/game/formulas";
import { INVENTORY_SORT_LABEL, INVENTORY_SORT_MODES } from "@/lib/game/inventory";
import { GEM_RANK_ACCENT } from "@/lib/game/workshop";
import { echoQty, isMaterialItem } from "@/lib/game/echoCraft";
import { EQUIP_SLOTS, RARITIES, type Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { ItemGlyph } from "./EquipmentDoll";
import { ItemHoverTooltip } from "./ItemTooltip";

/** Live itemPower vs same-slot equipped piece — same metric as tooltips / equip choice. */
function inventoryCompareVsEquipped(
  item: Item,
  equipped: Item | null,
): "better" | "worse" | null {
  if (isMaterialItem(item) || !equipped || equipped.id === item.id) return null;
  const delta = itemPower(item) - itemPower(equipped);
  if (delta > 0) return "better";
  if (delta < 0) return "worse";
  return null;
}

const INV_DRAG_PREFIX = "inv:";

export function visibleInventoryIds(
  inventory: Array<Item | null>,
  filterSlot: string,
  filterRarity: string,
) {
  const ids: string[] = [];
  for (const item of inventory) {
    if (!item) continue;
    const hidden =
      (filterSlot !== "all" && (isMaterialItem(item) || item.slot !== filterSlot)) ||
      (filterRarity !== "all" && item.rarity !== filterRarity);
    if (!hidden) ids.push(item.id);
  }
  return ids;
}

export function InventoryGrid() {
  const inventory = useGameStore((s) => s.inventory);
  const classId = useGameStore((s) => s.character.classId);
  const equipItem = useGameStore((s) => s.equipItem);
  const moveInventoryItem = useGameStore((s) => s.moveInventoryItem);
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const selectItem = useUiStore((s) => s.selectItem);
  const selectionMode = useUiStore((s) => s.selectionMode);
  const bulkSelectedIds = useUiStore((s) => s.bulkSelectedIds);
  const toggleBulkItem = useUiStore((s) => s.toggleBulkItem);
  const filterSlot = useUiStore((s) => s.filterSlot);
  const filterRarity = useUiStore((s) => s.filterRarity);
  const [hover, setHover] = useState<{ item: Item; rect: DOMRect } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropOver, setDropOver] = useState<number | null>(null);
  const skipClickRef = useRef(false);
  const ghostRef = useRef<HTMLElement | null>(null);

  function clearGhost() {
    ghostRef.current?.remove();
    ghostRef.current = null;
  }

  return (
    <>
      <div
        className="es-inv-grid w-full"
        style={{ gridTemplateColumns: `repeat(${INVENTORY_COLS}, minmax(0, 1fr))` }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropOver(null);
        }}
      >
        {inventory.map((item, idx) => {
          const hidden =
            !!item &&
            ((filterSlot !== "all" && (isMaterialItem(item) || item.slot !== filterSlot)) ||
              (filterRarity !== "all" && item.rarity !== filterRarity));
          const locked = !!item && !isMaterialItem(item) && !canWearItem(classId, item).ok;
          const bulkOn = selectionMode && !!item && bulkSelectedIds.includes(item.id);
          const craftOn = !selectionMode && !!item && item.id === selectedItemId;
          return (
            <InventoryCell
              key={item?.id ?? `empty-${idx}`}
              index={idx}
              item={item}
              dimmed={hidden}
              locked={locked}
              selected={bulkOn || craftOn}
              selectionMode={selectionMode}
              dragging={dragFrom === idx}
              dropTarget={dropOver === idx && dragFrom !== idx}
              onSelect={() => {
                if (skipClickRef.current) {
                  skipClickRef.current = false;
                  return;
                }
                if (!item) {
                  if (!selectionMode) useUiStore.getState().dismissItemPanel();
                  return;
                }
                if (selectionMode) toggleBulkItem(item.id);
                else selectItem(item.id);
              }}
              onEquip={() => {
                if (selectionMode || !item || isMaterialItem(item)) return;
                equipItem(item.id);
              }}
              onHover={(next) => {
                if (dragFrom !== null) {
                  setHover(null);
                  return;
                }
                setHover(next);
              }}
              onDragStartCell={(e) => {
                if (selectionMode || !item) {
                  e.preventDefault();
                  return;
                }
                skipClickRef.current = true;
                setDragFrom(idx);
                setHover(null);
                e.dataTransfer.setData("text/plain", `${INV_DRAG_PREFIX}${idx}`);
                e.dataTransfer.effectAllowed = "move";
                const source = e.currentTarget;
                const ghost = source.cloneNode(true) as HTMLElement;
                const rect = source.getBoundingClientRect();
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${rect.height}px`;
                ghost.style.position = "absolute";
                ghost.style.top = "-9999px";
                ghost.style.left = "-9999px";
                ghost.style.opacity = "0.92";
                ghost.style.pointerEvents = "none";
                ghost.classList.add("es-inv-ghost");
                document.body.appendChild(ghost);
                ghostRef.current = ghost;
                e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
              }}
              onDragOverCell={(e) => {
                if (selectionMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropOver !== idx) setDropOver(idx);
              }}
              onDropCell={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData("text/plain");
                if (!raw.startsWith(INV_DRAG_PREFIX)) return;
                const from = Number(raw.slice(INV_DRAG_PREFIX.length));
                if (!Number.isFinite(from)) return;
                moveInventoryItem(from, idx);
                setDragFrom(null);
                setDropOver(null);
                clearGhost();
              }}
              onDragEndCell={() => {
                setDragFrom(null);
                setDropOver(null);
                clearGhost();
                window.setTimeout(() => {
                  skipClickRef.current = false;
                }, 80);
              }}
            />
          );
        })}
      </div>
      {hover && dragFrom === null && <ItemHoverTooltip item={hover.item} anchor={hover.rect} />}
    </>
  );
}

function InventoryCell({
  index,
  item,
  selected,
  dimmed,
  locked,
  selectionMode,
  dragging,
  dropTarget,
  onSelect,
  onEquip,
  onHover,
  onDragStartCell,
  onDragOverCell,
  onDropCell,
  onDragEndCell,
}: {
  index: number;
  item: Item | null;
  selected: boolean;
  dimmed: boolean;
  locked: boolean;
  selectionMode: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: () => void;
  onEquip: () => void;
  onHover: (next: { item: Item; rect: DOMRect } | null) => void;
  onDragStartCell: (e: DragEvent<HTMLDivElement>) => void;
  onDragOverCell: (e: DragEvent<HTMLDivElement>) => void;
  onDropCell: (e: DragEvent<HTMLDivElement>) => void;
  onDragEndCell: () => void;
}) {
  const canDrag = !selectionMode && !!item;
  const equipped = useGameStore((s) => (item && !isMaterialItem(item) ? s.equipment[item.slot] : null));
  const vsEquipped = item ? inventoryCompareVsEquipped(item, equipped) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canDrag}
      onClick={onSelect}
      onDoubleClick={onEquip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onDragStart={onDragStartCell}
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={onDragOverCell}
      onDrop={onDropCell}
      onDragEnd={onDragEndCell}
      onMouseEnter={(e) => {
        if (!item) return;
        onHover({ item, rect: e.currentTarget.getBoundingClientRect() });
      }}
      onMouseLeave={() => onHover(null)}
      aria-label={
        item
          ? vsEquipped === "better"
            ? `${item.name}, лучше надетого`
            : vsEquipped === "worse"
              ? `${item.name}, хуже надетого`
              : item.name
          : `Пустая ячейка ${index + 1}`
      }
      className={cn(
        "es-slot es-inv-cell relative flex aspect-square w-full items-center justify-center overflow-visible",
        selected && (selectionMode ? "is-bulk" : "is-selected"),
        dimmed && "opacity-25",
        locked && "opacity-55",
        canDrag && "es-inv-draggable",
        dragging && "is-dragging",
        dropTarget && "is-drop",
        item?.blessed && "item-blessed",
      )}
      style={
        item
          ? { boxShadow: `inset 0 2px 6px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${RARITY_COLOR[item.rarity]}` }
          : undefined
      }
    >
      {item && (
        <div className="absolute inset-[3px] overflow-hidden rounded-[4px]">
          <ItemGlyph item={item} compact />
        </div>
      )}
      {item && !isMaterialItem(item) ? (
        <div className="pointer-events-none absolute bottom-0.5 left-0.5 z-[1] flex max-w-[90%] flex-col items-start gap-px">
          <span className="item-level-badge rounded px-0.5 text-[10px] font-semibold leading-none tabular-nums text-white/90">
            {item.itemLevel}
          </span>
          {!!item.sockets?.length && (
            <span className="flex gap-px">
              {item.sockets.map((gem, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full border border-white/25"
                  style={{ background: gem ? GEM_RANK_ACCENT[gem.rank] : "transparent" }}
                />
              ))}
            </span>
          )}
        </div>
      ) : null}
      {vsEquipped ? (
        <span
          className={cn(
            "inv-cmp-arrow pointer-events-none absolute bottom-1 right-1 z-[1] flex h-[1.05rem] w-[1.05rem] items-center justify-center rounded-sm text-[13px] font-black leading-none",
            vsEquipped === "better" ? "is-better" : "is-worse",
          )}
          title={vsEquipped === "better" ? "Лучше надетого" : "Хуже надетого"}
          aria-hidden
        >
          {vsEquipped === "better" ? "▲" : "▼"}
        </span>
      ) : null}
      {item && isMaterialItem(item) ? (
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 z-[1] rounded bg-black/75 px-0.5 text-[9px] font-bold leading-none tabular-nums text-[#e9d5ff]">
          {echoQty(item)}
        </span>
      ) : null}
      {locked && <span className="absolute right-0 top-2.5 z-[1] text-[8px] leading-none text-[#ff5a5f]">✕</span>}
      {selectionMode && selected && (
        <span className="absolute left-0.5 top-0.5 z-[1] flex h-3 w-3 items-center justify-center rounded-full bg-white text-[8px] font-bold text-black">
          ✓
        </span>
      )}
    </div>
  );
}

export function InventoryFilters() {
  const filterSlot = useUiStore((s) => s.filterSlot);
  const filterRarity = useUiStore((s) => s.filterRarity);
  const setFilterSlot = useUiStore((s) => s.setFilterSlot);
  const setFilterRarity = useUiStore((s) => s.setFilterRarity);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = filterSlot !== "all" || filterRarity !== "all";
  const activeCount = (filterSlot !== "all" ? 1 : 0) + (filterRarity !== "all" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("es-btn es-inv-control px-2", (open || active) && "es-btn-cyan")}
        aria-expanded={open}
        aria-label="Фильтр"
        title="Фильтр: слот и грейд"
      >
        <ListFilter className="h-3.5 w-3.5" />
        Фильтр
        {active ? (
          <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black/80 px-0.5 text-[8px] font-bold leading-none text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="es-popover absolute left-0 z-40 mt-1.5 w-[232px] space-y-2.5 p-2.5">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8aa0b4]">Слот</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterSlot("all")}
                className={cn("es-rarity-toggle", filterSlot === "all" && "is-on")}
                aria-pressed={filterSlot === "all"}
              >
                Все
              </button>
              {EQUIP_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterSlot(s)}
                  className={cn("es-rarity-toggle", filterSlot === s && "is-on")}
                  aria-pressed={filterSlot === s}
                >
                  {SLOT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8aa0b4]">Грейд</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterRarity("all")}
                className={cn("es-rarity-toggle", filterRarity === "all" && "is-on")}
                aria-pressed={filterRarity === "all"}
              >
                Все
              </button>
              {RARITIES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRarity(r)}
                  className={cn("es-rarity-toggle", filterRarity === r && "is-on")}
                  style={{
                    color: RARITY_COLOR[r],
                    borderColor: filterRarity === r ? RARITY_COLOR[r] : undefined,
                  }}
                  aria-pressed={filterRarity === r}
                >
                  {RARITY_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function InventorySortControls() {
  const sortMode = useUiStore((s) => s.inventorySortMode);
  const setSortMode = useUiStore((s) => s.setInventorySortMode);
  const sortInventory = useGameStore((s) => s.sortInventory);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("es-btn es-inv-control h-7 w-7 px-0", open && "es-btn-cyan")}
        aria-expanded={open}
        aria-label={`Сортировка: ${INVENTORY_SORT_LABEL[sortMode]}`}
        title={`Сортировка: ${INVENTORY_SORT_LABEL[sortMode]}`}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="es-popover absolute left-0 z-40 mt-1.5 w-[168px] space-y-0.5 p-1.5">
          {INVENTORY_SORT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setSortMode(mode);
                sortInventory(mode);
                setOpen(false);
              }}
              className={cn(
                "es-btn es-inv-control h-7 w-full justify-start px-2",
                mode === sortMode && "es-btn-cyan",
              )}
            >
              {INVENTORY_SORT_LABEL[mode]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function inventoryFillCount(inventory: Array<Item | null>) {
  let n = 0;
  for (const item of inventory) if (item) n += 1;
  return n;
}
