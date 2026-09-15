"use client";

import { useEffect, useState } from "react";
import {
  Coins,
  Hammer,
  PackageOpen,
  Recycle,
  Shirt,
  Wrench,
  X,
} from "lucide-react";
import { MAX_ENHANCE } from "@/lib/game/constants";
import { ENHANCE_SAFE_LEVELS } from "@/lib/game/enhance";
import { canWearItem } from "@/lib/game/equipment";
import type { EquipSlot, Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/cn";
import { ItemInspector } from "./ItemTooltip";

const ACTION_BTN =
  "es-btn es-inv-control !h-9 w-full min-w-0 justify-center whitespace-nowrap px-2 text-[11px]";

export function lookupSelected(
  inventory: Array<Item | null>,
  equipment: Record<EquipSlot, Item | null>,
  id: string | null,
): { item: Item; inBag: boolean } | null {
  if (!id) return null;
  const invIdx = inventory.findIndex((it) => it?.id === id);
  if (invIdx >= 0 && inventory[invIdx]) return { item: inventory[invIdx]!, inBag: true };
  const eq = Object.values(equipment).find((it) => it?.id === id);
  if (eq) return { item: eq, inBag: false };
  return null;
}

export function ItemActionPanel({
  dismissible = false,
  onDismiss,
  className,
}: {
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const inventory = useGameStore((s) => s.inventory);
  const equipment = useGameStore((s) => s.equipment);
  const salvageItem = useGameStore((s) => s.salvageItem);
  const sellItem = useGameStore((s) => s.sellItem);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipSlot = useGameStore((s) => s.unequipSlot);
  const classId = useGameStore((s) => s.character.classId);
  const message = useUiStore((s) => s.enhanceMessage);
  const openEnhanceModal = useUiStore((s) => s.openEnhanceModal);
  const dismissItemPanel = useUiStore((s) => s.dismissItemPanel);
  const selectionMode = useUiStore((s) => s.selectionMode);
  const setTab = useUiStore((s) => s.setTab);
  const [previewLevel, setPreviewLevel] = useState(0);

  const found = lookupSelected(inventory, equipment, selectedItemId);
  const item = found?.item ?? null;
  const inBag = found?.inBag ?? false;
  const atMaxEnhance = !!item && item.enhanceLevel >= MAX_ENHANCE;
  const wear = item ? canWearItem(classId, item) : { ok: false, reason: "" };
  const bagActions = inBag && !selectionMode;

  function dismiss() {
    if (onDismiss) onDismiss();
    else dismissItemPanel();
  }

  useEffect(() => {
    const current = lookupSelected(
      useGameStore.getState().inventory,
      useGameStore.getState().equipment,
      selectedItemId,
    );
    setPreviewLevel(current?.item.enhanceLevel ?? 0);
  }, [selectedItemId]);

  // Item vanished (sold / salvaged)
  useEffect(() => {
    if (selectedItemId && !found) {
      dismissItemPanel();
    }
  }, [selectedItemId, found, dismissItemPanel]);

  useEffect(() => {
    if (!selectedItemId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (e.target instanceof HTMLElement) {
        if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;
      }
      e.preventDefault();
      if (onDismiss) onDismiss();
      else useUiStore.getState().dismissItemPanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItemId, onDismiss]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {dismissible && (
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <div className="es-label flex-1">Предмет</div>
          <button
            type="button"
            onClick={dismiss}
            className="es-btn es-inv-control h-7 w-7 px-0"
            title="Закрыть (Esc)"
            aria-label="Закрыть панель предмета"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {item ? (
        <div className="space-y-3">
          <section>
            <ItemInspector item={item} previewLevel={previewLevel} />
          </section>

          <section className="border-t border-white/10 pt-2.5">
            <div className="es-label mb-1.5 flex items-center gap-1.5">
              <Hammer className="h-3.5 w-3.5 text-[#c4b5fd]" />
              Превью заточки
              {previewLevel !== item.enhanceLevel && (
                <span className="rounded bg-[#fbbf24]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#fbbf24]">
                  +{previewLevel}
                </span>
              )}
            </div>
            <div className="es-enh-grid">
              {Array.from({ length: MAX_ENHANCE + 1 }, (_, level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPreviewLevel(level)}
                  className={cn(
                    "es-enh-chip",
                    level === item.enhanceLevel && "is-actual",
                    level === previewLevel && "is-preview",
                  )}
                  style={
                    (ENHANCE_SAFE_LEVELS as readonly number[]).includes(level) && level > 0
                      ? { borderColor: "#4ade8099", color: "#4ade80" }
                      : undefined
                  }
                  aria-label={`Превью +${level}`}
                  title={
                    (ENHANCE_SAFE_LEVELS as readonly number[]).includes(level) && level > 0
                      ? `+${level} — безопасный уровень: ниже него заточка не откатится`
                      : level === item.enhanceLevel
                        ? `Текущая заточка +${level}`
                        : `Превью +${level}`
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t border-white/10 pt-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              {atMaxEnhance ? (
                <button
                  type="button"
                  onClick={() => setTab("workshop")}
                  className={ACTION_BTN}
                  title="Максимум заточки. Благословение и гнёзда под камни — в Мастерской"
                >
                  <Wrench className="h-3 w-3 shrink-0" />
                  Мастерская
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openEnhanceModal([item.id])}
                  className={cn(ACTION_BTN, "es-btn-cyan")}
                >
                  <Hammer className="h-3 w-3 shrink-0" />
                  Заточить
                </button>
              )}
              {inBag ? (
                <button
                  type="button"
                  onClick={() => equipItem(item.id)}
                  disabled={!bagActions || !wear.ok}
                  className={cn(ACTION_BTN, "es-btn-amber")}
                  title={!bagActions ? undefined : wear.ok ? undefined : wear.reason}
                >
                  <Shirt className="h-3 w-3 shrink-0" /> Надеть
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => unequipSlot(item.slot)}
                  className={ACTION_BTN}
                >
                  <Shirt className="h-3 w-3 shrink-0" /> Снять
                </button>
              )}
              <button
                type="button"
                disabled={!bagActions}
                onClick={() => {
                  sellItem(item.id);
                  dismiss();
                }}
                className={ACTION_BTN}
                title={!inBag ? "Сначала снимите предмет" : undefined}
              >
                <Coins className="h-3 w-3 shrink-0" /> Продать
              </button>
              <button
                type="button"
                disabled={!bagActions}
                onClick={() => {
                  salvageItem(item.id);
                  dismiss();
                }}
                className={ACTION_BTN}
                title={!inBag ? "Сначала снимите предмет" : undefined}
              >
                <Recycle className="h-3 w-3 shrink-0" /> Разобрать
              </button>
            </div>
            <p
              className={cn(
                "min-h-[1rem] text-xs text-white/70",
                !message && "invisible",
              )}
              aria-hidden={!message}
            >
              {message ?? "\u00a0"}
            </p>
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <PackageOpen className="h-8 w-8 text-white/20" />
          <p className="text-xs text-[#8aa0b4]">Выберите предмет</p>
        </div>
      )}
    </div>
  );
}
