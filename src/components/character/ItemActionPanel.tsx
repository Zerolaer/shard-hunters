"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Coins, Hammer, PackageOpen, Recycle, Scale, Shirt, Wrench, X } from "lucide-react";
import { MAX_ENHANCE } from "@/lib/game/constants";
import { ENHANCE_SAFE_LEVELS } from "@/lib/game/enhance";
import { canWearItem } from "@/lib/game/equipment";
import { echoQty, isMaterialItem } from "@/lib/game/echoCraft";
import { isPotionIngredient, isPotionMaterial, POTION_INGREDIENT_BY_ID, POTION_RECIPE_BY_ID, potionBlurb } from "@/lib/game/potions";
import type { EquipSlot, Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/cn";
import { ItemInspector } from "./ItemTooltip";
import { spotsForLocation } from "@/lib/game/spots";

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
  const usePotion = useGameStore((s) => s.usePotion);
  const selectSpot = useGameStore((s) => s.selectSpot);
  const classId = useGameStore((s) => s.character.classId);
  const openEnhanceModal = useUiStore((s) => s.openEnhanceModal);
  const dismissItemPanel = useUiStore((s) => s.dismissItemPanel);
  const selectionMode = useUiStore((s) => s.selectionMode);
  const setTab = useUiStore((s) => s.setTab);
  const setWorkshopMode = useUiStore((s) => s.setWorkshopMode);
  const [previewLevel, setPreviewLevel] = useState(0);
  const [compareDefaults, setCompareDefaults] = useState(false);

  const found = lookupSelected(inventory, equipment, selectedItemId);
  const item = found?.item ?? null;
  const inBag = found?.inBag ?? false;
  const material = !!item && isMaterialItem(item);
  const potion = !!item && isPotionMaterial(item);
  const ingredient = !!item && isPotionIngredient(item);
  const potionRecipe = potion && item.materialId ? POTION_RECIPE_BY_ID[item.materialId] : null;
  const ingredientDef =
    ingredient && item.materialId ? POTION_INGREDIENT_BY_ID[item.materialId] : null;
  const invIndex = item ? inventory.findIndex((it) => it?.id === item.id) : -1;
  const atMaxEnhance = !!item && !material && item.enhanceLevel >= MAX_ENHANCE;
  const wear = item && !material ? canWearItem(classId, item) : { ok: false, reason: "" };
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
    setCompareDefaults(false);
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
    <div className={cn("flex h-full min-h-0 flex-1 flex-col", className)}>
      {dismissible && (
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2.5 pb-2 pt-2.5">
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
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-2.5 py-2.5 [scrollbar-gutter:stable]">
            <section>
              <ItemInspector
                item={item}
                previewLevel={material ? 0 : previewLevel}
                compareDefaults={!material && compareDefaults}
              />
            </section>

            {material ? (
              <p className="text-[11px] leading-snug text-[#8aa0b4]">
                {item.materialId === "blessing-spark"
                  ? "Искра благословения — расходник мастерской для благословения +15 вещей."
                  : item.materialId === "socket-hammer"
                    ? "Молоток пробоя — редкий инструмент. Один удар открывает гнёзда навсегда."
                    : potionRecipe
                      ? potionBlurb(potionRecipe)
                      : ingredientDef
                        ? `Ингредиент зелий. Фарм: ${ingredientDef.farmHint}.`
                        : `Материал крафта. Сложите ${echoQty(item)} шт. в мастерской, чтобы открыть сундук эха на ваш уровень.`}
              </p>
            ) : (
              <section className="border-t border-white/10 pt-2.5">
                <div className="es-label mb-1.5 flex items-center gap-1.5">
                  <Hammer className="h-3.5 w-3.5 text-[#e4c36a]" />
                  Превью заточки
                  {previewLevel !== item.enhanceLevel && !compareDefaults && (
                    <span className="rounded bg-[#fbbf24]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#fbbf24]">
                      +{previewLevel}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCompareDefaults((v) => !v)}
                    className={cn(
                      "es-btn es-inv-control ml-auto h-7 px-2 text-[10px]",
                      compareDefaults && "es-btn-cyan",
                    )}
                    title="Сравнить базовые статы без заточки, благословения и камней"
                  >
                    <Scale className="h-3 w-3" />
                    Сравнить дэфолт
                  </button>
                </div>
                {!compareDefaults ? (
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
                ) : (
                  <p className="text-[11px] leading-snug text-[#8aa0b4]">
                    Без заточки, благословения и камней — честное сравнение базы с надетым слотом.
                  </p>
                )}
              </section>
            )}
          </div>

          <section className="shrink-0 border-t border-white/10 px-2.5 pb-2 pt-2">
            {material ? (
              <div className="grid grid-cols-2 gap-1.5">
                {potion && invIndex >= 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      usePotion(invIndex);
                      dismiss();
                    }}
                    className={cn(ACTION_BTN, "es-btn-cyan")}
                  >
                    <FlaskConical className="h-3 w-3 shrink-0" />
                    Выпить
                  </button>
                ) : ingredientDef ? (
                  <button
                    type="button"
                    onClick={() => {
                      const spots = spotsForLocation(ingredientDef.farmLocationId);
                      if (spots[0]) selectSpot(spots[0].id);
                      setTab("world");
                    }}
                    className={cn(ACTION_BTN, "es-btn-cyan")}
                  >
                    <PackageOpen className="h-3 w-3 shrink-0" />
                    Фарм
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setWorkshopMode("craft");
                      setTab("workshop");
                    }}
                    className={cn(ACTION_BTN, "es-btn-cyan")}
                  >
                    <Wrench className="h-3 w-3 shrink-0" />
                    Крафт
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
                >
                  <Coins className="h-3 w-3 shrink-0" /> Продать
                </button>
              </div>
            ) : (
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
            )}
          </section>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-2.5 py-6 text-center">
          <PackageOpen className="h-8 w-8 text-white/20" />
          <p className="text-xs text-[#8aa0b4]">Выберите предмет</p>
        </div>
      )}
    </div>
  );
}
