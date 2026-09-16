"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hammer, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { MAX_ENHANCE, RARITY_COLOR } from "@/lib/game/constants";
import {
  enhanceCost,
  enhancePlanCost,
  enhanceSafeFloor,
  enhanceSuccessChance,
  isEnhanceSafe,
} from "@/lib/game/enhance";
import { formatNumber } from "@/lib/game/formulas";
import type { Item } from "@/lib/game/types";
import { isMaterialItem } from "@/lib/game/echoCraft";
import { cn } from "@/lib/cn";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { ItemGlyph } from "./EquipmentDoll";

type FxKind = "idle" | "charge" | "success" | "fail";

const SLOW_MS = { charge: 400, success: 720, fail: 740, resourceFail: 650 } as const;
const QUICK_MS = { charge: 60, success: 100, fail: 100, resourceFail: 80 } as const;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function collectEnhanceable(
  inventory: Array<Item | null>,
  equipment: Record<string, Item | null>,
): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of Object.values(equipment)) {
    if (!it || isMaterialItem(it) || it.enhanceLevel >= MAX_ENHANCE || seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  for (const it of inventory) {
    if (!it || isMaterialItem(it) || it.enhanceLevel >= MAX_ENHANCE || seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function lookupItem(
  inventory: Array<Item | null>,
  equipment: Record<string, Item | null>,
  id: string,
): Item | null {
  const eq = Object.values(equipment).find((it) => it?.id === id);
  if (eq) return eq;
  return inventory.find((it) => it?.id === id) ?? null;
}

function costButtonLabel(plan: { gold: number; ore: number; shards: number }) {
  const parts = [
    "Заточить",
    `${formatNumber(plan.gold)} золота`,
    `${formatNumber(plan.ore)} руды`,
  ];
  if (plan.shards > 0) parts.push(`${formatNumber(plan.shards)} осколков`);
  return parts.join(" · ");
}

/** Compact selected-row glyph — list count must not resize the modal. */
const PREVIEW_BOX = "h-10 w-10";
const PREVIEW_GLYPH = "h-8 w-8";
const PREVIEW_RADIUS = "rounded-lg";
const PICKER_COLS = 5;

export function EnhanceModal() {
  const open = useUiStore((s) => s.enhanceModalOpen);
  const seedIds = useUiStore((s) => s.enhanceModalSeedIds);
  const closeEnhanceModal = useUiStore((s) => s.closeEnhanceModal);
  const inventory = useGameStore((s) => s.inventory);
  const equipment = useGameStore((s) => s.equipment);
  const resources = useGameStore((s) => s.resources);
  const enhanceItem = useGameStore((s) => s.enhanceItem);

  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetLevel, setTargetLevel] = useState(1);
  const [quickEnhance, setQuickEnhance] = useState(false);
  const [running, setRunning] = useState(false);
  const [fx, setFx] = useState<FxKind>("idle");
  const [fxNonce, setFxNonce] = useState(0);
  const [fxLevel, setFxLevel] = useState<number | null>(null);
  /** Scale-bar paint: animate only the changed chip; secured levels stay solid green. */
  const [scalePaint, setScalePaint] = useState<"ok" | "fail" | null>(null);
  const [scalePaintLevel, setScalePaintLevel] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const pendingCloseRef = useRef(false);
  const quickRef = useRef(quickEnhance);
  const titleId = useId();

  quickRef.current = quickEnhance;

  const equippedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const it of Object.values(equipment)) if (it) ids.add(it.id);
    return ids;
  }, [equipment]);

  const candidates = useMemo(
    () => collectEnhanceable(inventory, equipment),
    [inventory, equipment],
  );

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) => lookupItem(inventory, equipment, id))
        .filter((it): it is Item => !!it && !isMaterialItem(it) && it.enhanceLevel < MAX_ENHANCE),
    [selectedIds, inventory, equipment],
  );

  /** Items still below the chosen mark — over-cap selections are ignored. */
  const workItems = useMemo(
    () => selectedItems.filter((it) => it.enhanceLevel < targetLevel),
    [selectedItems, targetLevel],
  );

  const minCurrent = selectedItems.length
    ? Math.min(...selectedItems.map((it) => it.enhanceLevel))
    : 0;

  const plan = useMemo(() => {
    let gold = 0;
    let ore = 0;
    let shards = 0;
    let attempts = 0;
    for (const it of workItems) {
      const c = enhancePlanCost(it.enhanceLevel, targetLevel, it.itemLevel);
      gold += c.gold;
      ore += c.ore;
      shards += c.shards;
      attempts += c.attempts;
    }
    return { gold, ore, shards, attempts };
  }, [workItems, targetLevel]);

  const canAffordNext = useMemo(() => {
    if (workItems.length === 0) return false;
    // Affordability for the next strike among items that still need work.
    for (const it of workItems) {
      const c = enhanceCost(it.enhanceLevel, it.itemLevel);
      return (
        resources.gold >= c.gold &&
        resources.ore >= c.ore &&
        resources.shards >= c.shards
      );
    }
    return false;
  }, [workItems, resources.gold, resources.ore, resources.shards]);

  const focusItem = activeId
    ? lookupItem(inventory, equipment, activeId)
    : workItems[0] ?? selectedItems[0] ?? null;
  const focusChance = focusItem ? enhanceSuccessChance(focusItem.enhanceLevel) : 0;
  const focusSafe = focusItem ? isEnhanceSafe(focusItem.enhanceLevel) : true;
  const showFocusMeta = !!(focusItem && focusItem.enhanceLevel < targetLevel);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Snapshot once on open — do not reset when inventory updates mid-batch.
    const list = collectEnhanceable(
      useGameStore.getState().inventory,
      useGameStore.getState().equipment,
    );
    const validSeed = seedIds.filter((id) => list.some((it) => it.id === id));
    const initial =
      validSeed.length > 0 ? validSeed : list[0] ? [list[0].id] : [];
    setSelectedIds(initial);
    const seedItems = initial
      .map((id) => list.find((it) => it.id === id))
      .filter((it): it is Item => !!it);
    // Default mark = one step above the lowest selected piece (over-cap items ignored).
    const nextTarget = seedItems.length
      ? Math.min(MAX_ENHANCE, Math.min(...seedItems.map((it) => it.enhanceLevel)) + 1)
      : 1;
    setTargetLevel(nextTarget);
    setRunning(false);
    setFx("idle");
    setFxNonce(0);
    setFxLevel(null);
    setScalePaint(null);
    setScalePaintLevel(0);
    setActiveId(null);
    cancelRef.current = false;
    pendingCloseRef.current = false;
  }, [open, seedIds]);

  useEffect(() => {
    if (!open || running) return;
    if (selectedItems.length === 0) return;
    // Only nudge when *every* selected item is already at/above the mark.
    if (targetLevel <= minCurrent) {
      setTargetLevel(Math.min(MAX_ENHANCE, minCurrent + 1));
    }
  }, [open, running, selectedItems.length, minCurrent, targetLevel]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (running) {
        cancelRef.current = true;
        pendingCloseRef.current = true;
        return;
      }
      closeEnhanceModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, running, closeEnhanceModal]);

  function toggleItem(id: string) {
    if (running) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function requestClose() {
    if (running) {
      cancelRef.current = true;
      pendingCloseRef.current = true;
      return;
    }
    closeEnhanceModal();
  }

  async function runBatch() {
    if (running || workItems.length === 0 || plan.attempts === 0) return;
    if (!canAffordNext) return;

    cancelRef.current = false;
    pendingCloseRef.current = false;
    setRunning(true);
    setFx("idle");
    setFxNonce(0);
    setFxLevel(null);
    setScalePaint(null);
    setScalePaintLevel(0);

    const timing = () => (quickRef.current ? QUICK_MS : SLOW_MS);
    const queue = [...selectedIds];

    for (const itemId of queue) {
      if (cancelRef.current) break;

      while (!cancelRef.current) {
        const item = lookupItem(
          useGameStore.getState().inventory,
          useGameStore.getState().equipment,
          itemId,
        );
        // Skip items already at/above the mark — leave them untouched.
        if (!item || item.enhanceLevel >= targetLevel || item.enhanceLevel >= MAX_ENHANCE) {
          break;
        }

        const attemptFrom = item.enhanceLevel;
        setActiveId(itemId);
        setFx("charge");
        setFxNonce((n) => n + 1);
        setFxLevel(null);
        setScalePaint(null);
        await sleep(timing().charge);
        if (cancelRef.current) break;

        const res = enhanceItem(itemId);
        const after = lookupItem(
          useGameStore.getState().inventory,
          useGameStore.getState().equipment,
          itemId,
        );
        const levelNow = after?.enhanceLevel ?? item.enhanceLevel;

        if (res.ok) {
          setFx("success");
          setFxLevel(levelNow);
          setScalePaint("ok");
          setScalePaintLevel(levelNow);
        } else if (res.message.includes("Недостаточно")) {
          setFx("fail");
          setFxLevel(levelNow);
          setScalePaint("fail");
          setScalePaintLevel(Math.min(MAX_ENHANCE, attemptFrom + 1));
          cancelRef.current = true;
          setFxNonce((n) => n + 1);
          await sleep(timing().resourceFail);
          break;
        } else {
          setFx("fail");
          setFxLevel(levelNow);
          setScalePaint("fail");
          setScalePaintLevel(Math.min(MAX_ENHANCE, attemptFrom + 1));
        }
        setFxNonce((n) => n + 1);

        await sleep(res.ok ? timing().success : timing().fail);
        // Fail does not stop this item — keep forging until mark / cancel / resources.
      }
    }

    setFx("idle");
    setFxNonce(0);
    setFxLevel(null);
    setScalePaint(null);
    setScalePaintLevel(0);
    setActiveId(null);
    setRunning(false);
    const shouldClose = pendingCloseRef.current;
    cancelRef.current = false;
    pendingCloseRef.current = false;
    if (shouldClose) closeEnhanceModal();
  }

  if (!open || !mounted) return null;

  const enhanceDisabled =
    workItems.length === 0 || plan.attempts === 0 || !canAffordNext;
  const skippedCount = selectedItems.length - workItems.length;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Закрыть заточку"
        className="es-modal-scrim absolute inset-0"
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-enhance-modal
        className="es-modal relative z-10 flex h-[min(90vh,36rem)] w-full max-w-3xl flex-col overflow-hidden max-lg:h-[min(92dvh,40rem)]"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e4c36a]/25 bg-[#e4c36a]/10">
            <Hammer className="h-5 w-5 text-[#e4c36a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p id={titleId} className="font-display text-lg font-semibold tracking-tight text-white">
              Заточка
            </p>
            <p className="mt-0.5 text-xs text-[#8aa0b4]">
              Слева — выбор. Справа — выбранные и цель. Куём до марки; уже на ней пропускаются.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="es-btn h-9 w-9 shrink-0 p-0"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="es-enhance-split">
          <section className="es-enhance-col border-r border-white/10 px-3 py-3 max-lg:border-r-0 max-lg:border-b max-lg:border-white/10">
            <div className="es-label mb-1.5 flex min-h-[1rem] shrink-0 items-center justify-between gap-2">
              <span>Предметы</span>
              <span
                className={cn(
                  "tabular-nums text-[10px] font-normal normal-case tracking-normal text-[#8aa0b4]",
                  selectedIds.length === 0 && "invisible",
                )}
                aria-hidden={selectedIds.length === 0}
              >
                выбрано {selectedIds.length || 0}
                {skippedCount > 0 ? ` · к цели ${workItems.length}` : ""}
              </span>
            </div>
            {candidates.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-center text-xs text-[#8aa0b4]">
                Нет предметов для заточки (все уже +{MAX_ENHANCE} или инвентарь пуст).
              </p>
            ) : (
              <div
                className="es-inv-grid es-enhance-col-list rounded-xl border border-white/8 bg-black/20 p-1.5 content-start"
                style={{ gridTemplateColumns: `repeat(${PICKER_COLS}, minmax(0, 1fr))` }}
              >
                {candidates.map((it) => {
                  const on = selectedIds.includes(it.id);
                  const active = activeId === it.id;
                  const worn = equippedIds.has(it.id);
                  const atOrAbove = on && it.enhanceLevel >= targetLevel;
                  const cellFx =
                    active && (fx === "success" || fx === "fail" || fx === "charge") ? fx : "idle";
                  return (
                    <button
                      key={it.id}
                      type="button"
                      disabled={running}
                      onClick={() => toggleItem(it.id)}
                      aria-pressed={on}
                      aria-label={`${it.name} +${it.enhanceLevel}${worn ? ", надето" : ""}`}
                      className={cn(
                        "es-slot es-inv-cell relative flex aspect-square w-full items-center justify-center overflow-hidden",
                        on && "is-bulk",
                        atOrAbove && "opacity-70",
                        running && !active && "opacity-55",
                      )}
                      style={{
                        boxShadow: `inset 0 2px 6px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${RARITY_COLOR[it.rarity]}`,
                      }}
                    >
                      <div className="absolute inset-[3px] overflow-hidden rounded-[4px]">
                        <div
                          key={cellFx !== "idle" ? `cell-fx-${it.id}-${fxNonce}` : undefined}
                          className={cn(
                            "flex h-full w-full items-center justify-center",
                            quickEnhance && cellFx !== "idle" && "is-quick",
                            cellFx === "charge" && "enhance-charge",
                            cellFx === "success" && "enhance-success",
                            cellFx === "fail" && "enhance-fail",
                          )}
                        >
                          <ItemGlyph item={it} compact />
                        </div>
                        {cellFx === "success" && (
                          <span
                            key={`ok-${fxNonce}`}
                            className={cn(
                              "es-enhance-burst pointer-events-none absolute inset-0",
                              quickEnhance && "is-quick",
                            )}
                            aria-hidden
                          />
                        )}
                      </div>
                      {on && (
                        <span className="absolute right-0.5 top-0.5 z-[1] flex h-3 w-3 items-center justify-center rounded-full bg-white text-[8px] font-bold text-black">
                          ✓
                        </span>
                      )}
                      {worn && (
                        <span
                          className="absolute bottom-0.5 right-0.5 z-[1] rounded bg-black/80 px-0.5 text-[8px] font-bold leading-none text-[var(--accent)]"
                          title="Надето"
                        >
                          Е
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className={cn(
              "es-enhance-col es-enhance-stage relative px-3 py-3",
              fx === "success" && "is-success",
              fx === "fail" && "is-fail",
              fx === "charge" && "is-charge",
              quickEnhance && "is-quick",
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(228,195,106,0.1),transparent_58%)]" />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="es-label mb-1.5 flex shrink-0 items-center justify-between gap-2">
                <span>Выбрано</span>
                <span className="tabular-nums text-[10px] font-normal normal-case tracking-normal text-[#8aa0b4]">
                  {selectedItems.length === 0
                    ? "пусто"
                    : workItems.length === 0
                      ? `все ≥ +${targetLevel}`
                      : `${workItems.length} к цели`}
                </span>
              </div>

              <div className="es-enhance-col-list space-y-1.5 rounded-xl border border-white/8 bg-black/20 p-1.5">
                {selectedItems.length === 0 ? (
                  <div className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-6 text-center">
                    <div
                      className={cn(
                        "es-enhance-anvil flex items-center justify-center border border-white/12 bg-black/55",
                        PREVIEW_BOX,
                        PREVIEW_RADIUS,
                      )}
                    >
                      <Sparkles className="h-5 w-5 text-white/25" />
                    </div>
                    <p className="text-xs text-[#8aa0b4]">Выберите предмет слева</p>
                  </div>
                ) : (
                  selectedItems.map((it) => {
                    const active = activeId === it.id;
                    const done = it.enhanceLevel >= targetLevel;
                    const worn = equippedIds.has(it.id);
                    const showFx =
                      active && (fx === "success" || fx === "fail" || fx === "charge");
                    const shownLevel =
                      active && fxLevel != null ? fxLevel : it.enhanceLevel;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        disabled={running}
                        onClick={() => toggleItem(it.id)}
                        title={`${it.name} +${it.enhanceLevel} — нажмите, чтобы убрать`}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-2 py-1.5 text-left transition-colors",
                          done && !active && "opacity-55",
                          active && "border-amber-300/40 ring-1 ring-amber-300/35",
                          !running && "hover:border-white/20 hover:bg-black/50",
                        )}
                      >
                        <div
                          className={cn(
                            "es-enhance-anvil flex items-center justify-center border border-white/12 bg-black/55",
                            PREVIEW_BOX,
                            PREVIEW_RADIUS,
                          )}
                        >
                          <div
                            key={showFx ? `anvil-fx-${it.id}-${fxNonce}` : undefined}
                            className={cn(
                              "relative z-[1] flex items-center justify-center overflow-hidden",
                              PREVIEW_GLYPH,
                              PREVIEW_RADIUS,
                              quickEnhance && showFx && "is-quick",
                              showFx && fx === "success" && "enhance-success",
                              showFx && fx === "fail" && "enhance-fail",
                              showFx && fx === "charge" && "enhance-charge",
                            )}
                          >
                            <ItemGlyph item={it} compact />
                          </div>
                          {showFx && fx === "charge" && (
                            <span
                              className={cn(
                                "es-enhance-fx enhance-charge pointer-events-none",
                                quickEnhance && "is-quick",
                              )}
                              aria-hidden
                            />
                          )}
                          {showFx && fx === "success" && (
                            <span
                              key={`burst-${it.id}-${fxNonce}`}
                              className={cn(
                                "es-enhance-burst pointer-events-none absolute inset-0 z-[2]",
                                quickEnhance && "is-quick",
                              )}
                              aria-hidden
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white">{it.name}</p>
                          <p className="mt-0.5 text-[10px] tabular-nums text-amber-200/90">
                            {done
                              ? `+${shownLevel} · уже на цели`
                              : `+${shownLevel} → +${targetLevel}`}
                            {worn ? " · надето" : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-2 shrink-0 space-y-2 border-t border-white/10 pt-2">
                <div className="min-h-[1.25rem]">
                  {selectedItems.length > 1 ? (
                    <p className="truncate text-xs font-medium text-white">
                      {selectedItems.length} предметов → +{targetLevel}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "flex min-h-[1.25rem] flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#8aa0b4]",
                      !showFocusMeta && selectedItems.length <= 1 && "invisible",
                    )}
                    aria-hidden={!showFocusMeta}
                  >
                    <span className="font-mono text-white/75">
                      {(focusChance * 100).toFixed(0)}%
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        focusSafe ? "text-[#4ade80]" : "text-[#f87171]",
                      )}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {focusSafe
                        ? "безопасный уровень"
                        : `откат до +${focusItem ? enhanceSafeFloor(focusItem.enhanceLevel) : 0}`}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="es-label mb-0 flex items-center gap-1.5">
                    Цель
                    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                      +{targetLevel}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={quickEnhance}
                    disabled={running}
                    onClick={() => setQuickEnhance((v) => !v)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold tracking-wide transition-colors",
                      quickEnhance
                        ? "border-amber-400/45 bg-amber-400/15 text-amber-200"
                        : "border-white/10 bg-black/30 text-[#8aa0b4]",
                      running && "opacity-60",
                    )}
                    title="Быстрая заточка — ускоренные анимации"
                  >
                    <Zap className="h-3 w-3" />
                    Быстро
                  </button>
                </div>
                <div className="es-enh-grid" aria-live="polite">
                  {Array.from({ length: MAX_ENHANCE }, (_, i) => {
                    const level = i + 1;
                    const disabled = running || level <= minCurrent;
                    // Secured greens stay solid; only the newly reached / failed chip animates.
                    const securedLevel =
                      scalePaint === "fail"
                        ? (fxLevel ?? 0)
                        : scalePaint === "ok"
                          ? scalePaintLevel
                          : (focusItem?.enhanceLevel ?? 0);
                    const fillFail =
                      scalePaint === "fail" && level === scalePaintLevel;
                    const fillOkNew =
                      scalePaint === "ok" && level === scalePaintLevel;
                    const filled =
                      level <= securedLevel && !fillFail && !fillOkNew;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={disabled}
                        onClick={() => setTargetLevel(level)}
                        className={cn(
                          "es-enh-chip",
                          level === targetLevel && !scalePaint && "is-preview",
                          selectedItems.length === 1 &&
                            selectedItems[0].enhanceLevel === level &&
                            !scalePaint &&
                            "is-actual",
                          filled && "is-filled",
                          fillOkNew && "is-fill-ok",
                          fillFail && "is-fill-fail",
                        )}
                        aria-label={`Цель +${level}`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-stretch gap-2 border-t border-white/10 px-4 py-3">
          <div className="relative min-h-11 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => void runBatch()}
              disabled={enhanceDisabled || running}
              className={cn(
                "es-btn es-btn-cyan absolute inset-0 justify-center gap-1.5 px-3 text-center leading-tight",
                running && "pointer-events-none invisible",
              )}
              tabIndex={running ? -1 : 0}
            >
              <Hammer className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                {plan.attempts > 0
                  ? costButtonLabel(plan)
                  : selectedItems.length === 0
                    ? "Выберите предметы"
                    : "Уже на цели"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true;
              }}
              className={cn(
                "es-btn absolute inset-0 justify-center px-3",
                !running && "pointer-events-none invisible",
              )}
              tabIndex={running ? 0 : -1}
            >
              Остановить
            </button>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="es-btn h-11 shrink-0 px-3"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
