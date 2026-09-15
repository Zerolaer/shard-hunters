"use client";

import { CLASS_DEFS } from "@/lib/game/classes";
import { formatFullDigits, xpToNext } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { GitBranch, Zap } from "lucide-react";
import { LevelBadge } from "@/components/layout/LevelBadge";
import { HealthBar } from "@/components/combat/HealthBar";
import { EquipmentDoll } from "./EquipmentDoll";
import { StatBlock } from "./StatBlock";

export function CharacterPanel() {
  const character = useGameStore((s) => s.character);
  const talentPoints = useGameStore((s) => s.talents.points);
  const setTab = useUiStore((s) => s.setTab);
  const derived = useDerivedStats();
  const def = character.classId ? CLASS_DEFS[character.classId] : null;
  const need = xpToNext(character.level);
  const accent = def?.accent ?? "#c4b5fd";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 p-4"
        style={{
          background: `linear-gradient(135deg, ${accent}18 0%, rgba(20,20,24,0.95) 42%, #0c0c0e 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-25 blur-2xl"
          style={{ background: accent }}
        />
        <div className="relative flex items-start gap-3.5">
          <LevelBadge level={character.level} shape="square" size="lg" className="!rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-medium tracking-tight text-white">
                {character.name}
              </h3>
              <span className="inline-flex items-center gap-1 font-display text-[13px] font-semibold tabular-nums tracking-tight text-[var(--accent)]/90">
                <Zap className="h-3.5 w-3.5" />
                {formatFullDigits(derived.powerScore)}
              </span>
            </div>
            {def ? (
              <div className="mt-1 text-[12px] text-white/40">
                <span style={{ color: `${accent}cc` }}>{def.name}</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span>{def.blurb}</span>
              </div>
            ) : null}
            <div className="mt-2.5 max-w-[260px]">
              <div className="mb-1 flex justify-between text-[10px] text-white/40">
                <span>Опыт</span>
                <span className="tabular-nums">
                  {Math.round(character.xp)} / {need}
                </span>
              </div>
              <HealthBar current={character.xp} max={need} variant="xp" compact />
            </div>
          </div>
          {talentPoints > 0 ? (
            <button
              type="button"
              onClick={() => setTab("build")}
              className="es-btn es-btn-amber shrink-0 px-3 py-2 text-xs font-medium"
            >
              <GitBranch className="h-3.5 w-3.5" />
              {talentPoints} очк.
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <EquipmentDoll />
        <StatBlock />
      </div>
    </div>
  );
}
