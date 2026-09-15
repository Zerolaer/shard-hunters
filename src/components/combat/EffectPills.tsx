"use client";

import {
  Axe,
  Copy,
  Droplets,
  EyeOff,
  FlaskConical,
  Heart,
  Scissors,
  Shield,
  Sparkles,
  Target,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CombatEffect } from "@/lib/game/types";

const ICONS: Record<string, LucideIcon> = {
  bloodlust: Heart,
  ward: Shield,
  poison: Droplets,
  bleed: Scissors,
  mark: Target,
  stealth: EyeOff,
  nightblade: Sparkles,
  clone: Copy,
  veil: Shield,
  empower: Zap,
  slow: Timer,
  rupture: FlaskConical,
  backstab: Axe,
};

function hitsWord(n: number) {
  const abs = Math.abs(Math.round(n));
  const m10 = abs % 10;
  const m100 = abs % 100;
  if (m10 === 1 && m100 !== 11) return `${abs} удар`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${abs} удара`;
  return `${abs} ударов`;
}

function formatTimer(effect: CombatEffect) {
  if (effect.remainingHits != null) return hitsWord(effect.remainingHits);
  if (effect.remainingStacks != null) {
    const stacks = Math.round(effect.remainingStacks);
    return stacks === 1 ? "×1" : `×${stacks}`;
  }
  if (effect.remainingSec != null) {
    const sec = effect.remainingSec;
    return sec >= 10 ? `${Math.ceil(sec)}с` : `${sec.toFixed(1)}с`;
  }
  return "";
}

export function EffectPills({
  effects,
  kind,
  dense = false,
  singleLine = false,
}: {
  effects: CombatEffect[];
  kind: "buff" | "debuff";
  dense?: boolean;
  singleLine?: boolean;
}) {
  const visible = effects.filter((e) => e.kind === kind);
  const max = singleLine ? (dense ? 4 : 5) : 99;
  const overflow = Math.max(0, visible.length - max);
  const shown = overflow > 0 ? visible.slice(0, max - 1) : visible.slice(0, max);
  const extra = visible.length - shown.length;
  const pillSize = dense
    ? "gap-1 px-1.5 py-0.5 text-[10px]"
    : "gap-1.5 px-2 py-1 text-[11px]";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center",
        singleLine ? "flex-nowrap overflow-hidden" : "flex-wrap",
        visible.length === 0 && singleLine
          ? "min-h-0 gap-0"
          : dense
            ? "min-h-[18px] gap-1"
            : "min-h-[22px] gap-1.5",
      )}
      aria-label={kind === "buff" ? "Баффы" : "Дебаффы"}
    >
      {shown.map((effect) => {
        const Icon = ICONS[effect.icon] ?? Sparkles;
        return (
          <span
            key={effect.id}
            title={effect.name}
            className={cn(
              "inline-flex max-w-full items-center rounded-lg border leading-none",
              pillSize,
              kind === "debuff"
                ? "border-white/10 bg-black/70 text-white/80 backdrop-blur-md"
                : "border-white/14 bg-white/10 text-white",
            )}
          >
            <Icon className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate font-medium">{effect.name}</span>
            <span className="shrink-0 tabular-nums text-white/55">{formatTimer(effect)}</span>
          </span>
        );
      })}
      {extra > 0 ? (
        <span
          title={`Ещё ${extra}`}
          className={cn(
            "inline-flex shrink-0 items-center rounded-lg border leading-none tabular-nums",
            pillSize,
            kind === "debuff"
              ? "border-white/10 bg-black/70 text-white/80"
              : "border-white/14 bg-white/10 text-white",
          )}
        >
          +{extra}
        </span>
      ) : null}
      {visible.length === 0 && !singleLine ? (
        <span
          aria-hidden
          className={cn(
            "invisible inline-flex items-center rounded-lg border border-transparent leading-none",
            pillSize,
          )}
        >
          <span className="h-3 w-3 shrink-0" />
          <span>0</span>
        </span>
      ) : null}
    </div>
  );
}
