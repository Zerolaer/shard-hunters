"use client";

import { useRef, useState, type DragEvent } from "react";
import { ArrowUpDown, Filter, Rows3, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { INVENTORY_COLS, RARITY_COLOR, SLOT_LABEL } from "@/lib/game/constants";
import { canWearItem } from "@/lib/game/equipment";
import { INVENTORY_SORT_LABEL, INVENTORY_SORT_MODES } from "@/lib/game/inventory";
import { GEM_RANK_ACCENT } from "@/lib/game/workshop";
import { EQUIP_SLOTS, type Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { ItemGlyph } from "./EquipmentDoll";
import { ItemHoverTooltip } from "./ItemTooltip";

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
      (filterSlot !== "all" && item.slot !== filterSlot) ||
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
            ((filterSlot !== "all" && item.slot !== filterSlot) ||
              (filterRarity !== "all" && item.rarity !== filterRarity));
          const locked = !!item && !canWearItem(classId, item).ok;
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
                if (selectionMode || !item) return;
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
      aria-label={item ? item.name : `Пустая ячейка ${index + 1}`}
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
      {item ? (
        <span
          className="pointer-events-none absolute right-0.5 top-0.5 z-[1] h-1.5 w-1.5 rounded-full shadow-[0_0_4px_currentColor]"
          style={{ background: RARITY_COLOR[item.rarity], color: RARITY_COLOR[item.rarity] }}
          aria-hidden
        />
      ) : null}
      {item ? (
        <div className="pointer-events-none absolute bottom-0.5 left-0.5 z-[1] flex max-w-[90%] flex-col items-start gap-px">
          <span className="rounded bg-black/65 px-0.5 text-[8px] font-medium leading-none tabular-nums text-white/85">
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

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <Filter className="h-3.5 w-3.5 shrink-0 text-[#8aa0b4]" />
      <select
        value={filterSlot}
        onChange={(e) => setFilterSlot(e.target.value as typeof filterSlot)}
        className="es-select es-inv-control min-w-[7.5rem] px-2"
        aria-label="Фильтр по слоту"
      >
        <option value="all">Все слоты</option>
        {EQUIP_SLOTS.map((s) => (
          <option key={s} value={s}>
            {SLOT_LABEL[s]}
          </option>
        ))}
      </select>
      <select
        value={filterRarity}
        onChange={(e) => setFilterRarity(e.target.value as typeof filterRarity)}
        className="es-select es-inv-control min-w-[8rem] px-2"
        aria-label="Фильтр по редкости"
      >
        <option value="all">Все грейды</option>
        <option value="common">Обычный</option>
        <option value="uncommon">Необычный</option>
        <option value="rare">Редкий</option>
        <option value="epic">Эпический</option>
        <option value="legendary">Легендарный</option>
        <option value="mythic">Мифический</option>
      </select>
    </div>
  );
}

export function InventorySortControls() {
  const sortMode = useUiStore((s) => s.inventorySortMode);
  const setSortMode = useUiStore((s) => s.setInventorySortMode);
  const sortInventory = useGameStore((s) => s.sortInventory);
  const compactInventory = useGameStore((s) => s.compactInventory);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#8aa0b4]" />
      <select
        value={sortMode}
        onChange={(e) => {
          const mode = e.target.value as typeof sortMode;
          setSortMode(mode);
          sortInventory(mode);
        }}
        className="es-select es-inv-control min-w-[8.5rem] px-2"
        aria-label="Сортировка"
      >
        {INVENTORY_SORT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {INVENTORY_SORT_LABEL[mode]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => sortInventory(sortMode)}
        className="es-btn es-inv-control px-2.5"
        title="Собрать предметы в начало сетки по выбранной сортировке"
      >
        <Sparkles className="h-3 w-3" />
        Сорт
      </button>
      <button
        type="button"
        onClick={() => compactInventory()}
        className="es-btn es-inv-control px-2.5"
        title="Убрать пустые ячейки, порядок предметов не меняется"
      >
        <Rows3 className="h-3 w-3" />
        Уплотнить
      </button>
    </div>
  );
}

export function inventoryFillCount(inventory: Array<Item | null>) {
  let n = 0;
  for (const item of inventory) if (item) n += 1;
  return n;
}
