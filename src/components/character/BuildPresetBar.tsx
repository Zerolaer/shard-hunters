"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  planSinPresetBuild,
  remainingSinPresetFills,
  SIN_PATH_BY_ID,
  SIN_PRESETS,
  sinPresetGuideCost,
  sinPresetTreePoints,
  type SinPresetDef,
} from "@/lib/game/sin";
import {
  planTalentPresetRanks,
  remainingTalentPresetFills,
  TALENT_PRESETS,
  talentPresetPointsRequired,
  type TalentPresetDef,
} from "@/lib/game/talentPresets";
import { useGameStore } from "@/store/useGameStore";

const PREF_KEY = "sh-preferred-preset";

function readPref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

function writePref(id: string | null) {
  try {
    if (id) window.localStorage.setItem(PREF_KEY, id);
    else window.localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function BuildPresetBar({ mode }: { mode: "classic" | "sin" }) {
  const points = useGameStore((s) => s.talents.points);
  const ranks = useGameStore((s) => s.talents.ranks);
  const level = useGameStore((s) => s.character.level);
  const sinRanks = useGameStore((s) => s.sinBuild?.ranks ?? {});
  const skillRanks = useGameStore((s) => s.sinBuild?.skillRanks);
  const artRanks = useGameStore((s) => s.sinBuild?.artRanks);
  const mastery = useGameStore((s) => s.sinBuild?.mastery ?? 0);
  const path = useGameStore((s) => s.sinBuild?.path ?? null);
  const applyTalentPreset = useGameStore((s) => s.applyTalentPreset);
  const applySinPreset = useGameStore((s) => s.applySinPreset);
  const continuePreferredPreset = useGameStore((s) => s.continuePreferredPreset);
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setPref(readPref());
  }, []);

  /** Same budget applySinPreset uses: total career points = level - 1. */
  const sinBudget = Math.max(0, level - 1);
  const classicBudget = Math.max(0, level - 1);

  const classic = TALENT_PRESETS;
  const sin = SIN_PRESETS;
  const preferredClassic = classic.find((p) => p.id === pref) ?? null;
  const preferredSin = sin.find((p) => p.id === pref) ?? null;

  const suggestFills =
    mode === "sin" && preferredSin && path === preferredSin.path
      ? remainingSinPresetFills(preferredSin, sinRanks, points, {
          skillRanks,
          artRanks,
          mastery,
        }).length
      : mode === "classic" && preferredClassic
        ? remainingTalentPresetFills(preferredClassic, ranks, points).length
        : 0;

  const sinPlans = useMemo(() => {
    if (mode !== "sin") return null;
    return Object.fromEntries(
      sin.map((p) => [p.id, planSinPresetBuild(p, sinBudget)]),
    ) as Record<string, ReturnType<typeof planSinPresetBuild>>;
  }, [mode, sinBudget]);

  const classicPlans = useMemo(() => {
    if (mode !== "classic") return null;
    return Object.fromEntries(
      classic.map((p) => [p.id, planTalentPresetRanks(p, classicBudget)]),
    ) as Record<string, ReturnType<typeof planTalentPresetRanks>>;
  }, [mode, classicBudget]);

  function applyClassic(p: TalentPresetDef) {
    const res = applyTalentPreset(p.id);
    writePref(p.id);
    setPref(p.id);
    setMsg(res.message);
    setOpen(false);
  }

  function applySin(p: SinPresetDef) {
    const res = applySinPreset(p.id);
    writePref(p.id);
    setPref(p.id);
    setMsg(res.message);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn("es-btn es-inv-control px-2.5", open && "es-btn-cyan")}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Готовый пресет
        </button>
        {suggestFills > 0 ? (
          <button
            type="button"
            onClick={() => {
              const res = continuePreferredPreset();
              setMsg(res.message);
            }}
            className="es-btn es-btn-amber es-inv-control px-2.5"
            title="Добрать оставшиеся узлы и ранги по сохранённому пресету"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Добор +{suggestFills}
          </button>
        ) : null}
        {pref ? (
          <span className="text-[10px] text-[#8aa0b4]">
            активен: {preferredClassic?.name ?? preferredSin?.name ?? pref}
          </span>
        ) : null}
      </div>
      {msg ? <p className="mt-1.5 text-[11px] text-white/65">{msg}</p> : null}

      {open ? (
        <div className="es-popover absolute left-0 right-0 z-30 mt-2 max-h-[min(70vh,28rem)] space-y-2 overflow-y-auto p-2.5">
          {mode === "sin"
            ? sin.map((p) => {
                const plan = sinPlans?.[p.id];
                const tree = sinPresetTreePoints(p);
                const guide = sinPresetGuideCost(p);
                const pathLabel = SIN_PATH_BY_ID[p.path].name;
                const active = pref === p.id;
                const spent = plan?.spent ?? 0;
                const power = plan?.powerSpent ?? 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-lg border border-white/10 bg-black/45 px-2.5 py-2 backdrop-blur-md",
                      active && "border-[var(--accent)]/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-[13px] text-white">
                          {p.name}
                          <span className="ml-1.5 font-sans text-[10px] text-[#8aa0b4]">{pathLabel}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#8aa0b4]">{p.description}</p>
                        <p className="mt-1 text-[10px] leading-snug text-white/45">
                          Полный билд: дерево, скиллы, искусства, хотбар, камни в сокеты
                        </p>
                        <p className="mt-0.5 text-[10px] tabular-nums text-white/40">
                          гайд ~{guide} очк. (дерево {tree} + ранги)
                          {" · "}
                          у вас {sinBudget}
                          {plan && spent > 0 ? (
                            <>
                              {" · "}
                              <span className="text-white/65">
                                применит {spent}
                                {power > 0 ? ` (дерево ${plan.treeSpent} · ранги ${power})` : ""}
                                {plan.leftover === 0 && spent >= sinBudget ? " · все очки" : ""}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySin(p)}
                        className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
                      >
                        {active ? <Check className="h-3 w-3" /> : null}
                        Применить
                      </button>
                    </div>
                  </div>
                );
              })
            : classic.map((p) => {
                const need = talentPresetPointsRequired(p);
                const plan = classicPlans?.[p.id];
                const active = pref === p.id;
                const spent = plan?.spent ?? 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-lg border border-white/10 bg-black/45 px-2.5 py-2 backdrop-blur-md",
                      active && "border-[var(--accent)]/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-[13px] text-white">{p.name}</div>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#8aa0b4]">{p.description}</p>
                        <p className="mt-1 text-[10px] leading-snug text-white/45">
                          Полный билд: дерево талантов, хотбар, камни в сокеты
                        </p>
                        <p className="mt-0.5 text-[10px] tabular-nums text-white/40">
                          гайд ~{need} очк. · у вас {classicBudget}
                          {plan && spent > 0 ? (
                            <>
                              {" · "}
                              <span className="text-white/65">
                                применит {spent}
                                {plan.leftover === 0 ? " · все очки" : ""}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyClassic(p)}
                        className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
                      >
                        {active ? <Check className="h-3 w-3" /> : null}
                        Применить
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>
      ) : null}
    </div>
  );
}
