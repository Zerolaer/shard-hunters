"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { RARITY_COLOR, SLOT_LABEL } from "@/lib/game/constants";
import { itemIconName, rarityGlow, resolveItemIconSrc } from "@/lib/game/itemIcons";
import type { EquipSlot, Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { ItemHoverTooltip } from "./ItemTooltip";
import { SLOT_ICONS } from "./itemUi";

function EmptySlotGlyph({ slot }: { slot: EquipSlot }) {
  const SlotIcon = SLOT_ICONS[slot];
  return <SlotIcon className="h-5 w-5 opacity-40" />;
}

function SlotCell({ slot }: { slot: EquipSlot }) {
  const item = useGameStore((s) => s.equipment[slot]);
  const unequipSlot = useGameStore((s) => s.unequipSlot);
  const selectItem = useUiStore((s) => s.selectItem);
  const selected = useUiStore((s) => s.selectedItemId === item?.id);
  const SlotIcon = SLOT_ICONS[slot];
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  return (
    <button
      type="button"
      onClick={() => {
        // Empty slot dismisses the pinned item panel; filled slot pins it.
        if (!item) {
          useUiStore.getState().dismissItemPanel();
          return;
        }
        selectItem(item.id);
      }}
      onDoubleClick={() => unequipSlot(slot)}
      onMouseEnter={(e) => {
        if (!item) return;
        setHoverRect(e.currentTarget.getBoundingClientRect());
      }}
      onMouseLeave={() => setHoverRect(null)}
      className={cn(
        "es-slot group relative flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-visible text-[10px] text-[#8aa0b4]",
        selected && "is-selected",
        item?.blessed && "item-blessed",
      )}
      draggable={false}
      style={
        item
          ? { boxShadow: `inset 0 2px 6px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${RARITY_COLOR[item.rarity]}` }
          : undefined
      }
      title={item ? `${item.name} (двойной клик — снять)` : SLOT_LABEL[slot]}
      aria-label={item ? `${SLOT_LABEL[slot]}: ${item.name}` : SLOT_LABEL[slot]}
    >
      {item ? (
        <div className="absolute inset-[3px] overflow-hidden rounded-[6px]">
          <ItemGlyph item={item} />
        </div>
      ) : (
        <EmptySlotGlyph slot={slot} />
      )}
      {item ? (
        <span className="item-level-badge pointer-events-none absolute bottom-1 left-1 z-[1] rounded px-0.5 text-[10px] font-semibold leading-none tabular-nums text-white/90">
          {item.itemLevel}
        </span>
      ) : null}
      <span className="pointer-events-none absolute -bottom-0.5 left-1/2 z-10 -translate-x-1/2 translate-y-full rounded bg-black/70 px-1 text-[8px] leading-none text-[#8aa0b4] opacity-0 group-hover:opacity-100">
        {SLOT_LABEL[slot]}
      </span>
      {!item ? <SlotIcon className="pointer-events-none absolute left-0.5 top-0.5 h-2.5 w-2.5 text-white/20" /> : null}
      {item && hoverRect ? <ItemHoverTooltip item={item} anchor={hoverRect} compare={false} /> : null}
    </button>
  );
}

export function ItemGlyph({ item, compact }: { item: Item; compact?: boolean }) {
  const glow = rarityGlow(item.rarity);
  const src = resolveItemIconSrc(item);
  const Fallback = SLOT_ICONS[item.slot];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.id, item.name, item.slot, item.rarity, item.kind, item.materialId]);

  return (
    <div className="item-glyph relative h-full w-full" title={itemIconName(item)}>
      <span
        className="item-glyph-glow pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[58%]"
        style={{
          background: `radial-gradient(ellipse 95% 85% at 50% 115%, ${glow}70 0%, ${glow}38 32%, ${glow}14 58%, transparent 78%)`,
        }}
        aria-hidden
      />
      {item.blessed ? (
        <span className="item-blessed-sheen pointer-events-none absolute inset-0 z-0" aria-hidden />
      ) : null}

      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className={cn(
            "item-glyph-art relative z-[1] h-full w-full object-contain p-[10%]",
            compact ? "rounded-[4px]" : "rounded-[6px]",
          )}
        />
      ) : (
        <Fallback
          className="relative z-[1] mx-auto mt-[22%] h-[55%] w-[55%] opacity-90"
          style={{ color: glow }}
        />
      )}

      {item.enhanceLevel > 0 ? (
        <span
          className={cn(
            "item-enhance-badge absolute left-0.5 top-0.5 z-[2] rounded px-0.5 font-semibold leading-none tabular-nums",
            compact ? "text-[10px]" : "text-[11px]",
          )}
          style={{ color: glow }}
        >
          +{item.enhanceLevel}
        </span>
      ) : null}
    </div>
  );
}

export function EquipmentDoll() {
  return (
    <div className="rp-card relative flex flex-col items-center gap-2 overflow-visible px-4 py-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.06),transparent_60%)]" />
      <div className="relative text-[10px] uppercase tracking-[0.18em] text-white/40">Экипировка</div>
      <div className="relative flex flex-col items-center gap-2">
        <SlotCell slot="helmet" />
        <div className="flex items-center gap-2">
          <SlotCell slot="weapon" />
          <SlotCell slot="armor" />
          <SlotCell slot="offhand" />
        </div>
        <SlotCell slot="gloves" />
        <div className="flex items-center gap-2">
          <SlotCell slot="ring" />
          <SlotCell slot="boots" />
          <SlotCell slot="amulet" />
        </div>
      </div>
      <div className="relative mt-3 w-full border-t border-white/10 pt-3">
        <div className="mb-2 text-center text-[10px] uppercase tracking-[0.18em] text-amber-200/50">
          Артефакты
        </div>
        <div className="flex items-center justify-center gap-2">
          <SlotCell slot="artifact1" />
          <SlotCell slot="artifact2" />
          <SlotCell slot="artifact3" />
        </div>
      </div>
    </div>
  );
}
