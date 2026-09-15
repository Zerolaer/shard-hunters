"use client";

import { cn } from "@/lib/cn";
import type { FloatingText } from "@/lib/game/types";
import { FloatingDamage } from "./FloatingDamage";

const HP_GREEN = [0x2e, 0xe5, 0x9d] as const;
const HP_ORANGE = [0xf5, 0xa5, 0x24] as const;
const HP_RED = [0xe5, 0x48, 0x4d] as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexByte(n: number) {
  return Math.round(n).toString(16).padStart(2, "0");
}

function lerpRgb(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
) {
  const clamped = Math.max(0, Math.min(1, t));
  return `#${hexByte(lerp(from[0], to[0], clamped))}${hexByte(lerp(from[1], to[1], clamped))}${hexByte(lerp(from[2], to[2], clamped))}`;
}

function hpFillColor(pct: number): string {
  if (pct >= 50) {
    return lerpRgb(HP_GREEN, HP_ORANGE, (100 - pct) / 50);
  }
  if (pct >= 20) {
    return lerpRgb(HP_ORANGE, HP_RED, (50 - pct) / 30);
  }
  return "#e5484d";
}

export function HealthBar({
  current,
  max,
  label,
  variant,
  compact = false,
  floaters,
}: {
  current: number;
  max: number;
  label?: string;
  variant: "player" | "enemy" | "xp" | "gold";
  compact?: boolean;
  floaters?: FloatingText[];
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (current / max) * 100));
  const isHp = variant === "player" || variant === "enemy";
  const fillClass = isHp ? undefined : variant === "xp" ? "es-bar-xp" : "es-bar-gold";
  const showMeta = !compact && label != null;
  const showRow = showMeta || !!floaters;

  return (
    <div className="relative w-full">
      {showRow ? (
        <div
          className={cn(
            "flex items-end gap-2",
            floaters ? (compact ? "mb-1 min-h-[18px]" : "mb-1.5 min-h-[22px]") : "mb-1.5",
          )}
        >
          {showMeta ? (
            <span className="min-w-0 truncate text-xs font-medium text-[var(--muted)]">{label}</span>
          ) : null}
          <span className="shrink-0 whitespace-nowrap font-display text-xs font-semibold text-white">
            {Math.round(current)} / {Math.round(max)}
          </span>
          {floaters ? (
            <div className="relative min-h-[20px] min-w-[72px] flex-1 overflow-visible">
              <FloatingDamage texts={floaters} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("es-bar", compact && "!h-[3px]")}>
        <div
          className={cn("es-bar-fill", fillClass, isHp && "is-hp")}
          style={{
            width: `${pct}%`,
            ...(isHp ? { backgroundColor: hpFillColor(pct) } : {}),
          }}
        />
      </div>
    </div>
  );
}
