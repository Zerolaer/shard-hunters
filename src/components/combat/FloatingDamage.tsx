"use client";

import { cn } from "@/lib/cn";
import type { FloatingText } from "@/lib/game/types";

/** Floating hit/heal numbers overlaid on enemy/player combat cards. */
export function FloatingDamage({
  texts,
  variant = "card",
}: {
  texts: FloatingText[];
  /** `card` = full-card overlay (default). `inline` = cramped HP-row mode. */
  variant?: "card" | "inline";
}) {
  if (texts.length === 0) return null;

  if (variant === "inline") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[-6px] z-[5] overflow-visible">
        {texts.map((t) => (
          <span
            key={t.id}
            className={cn(
              "float-dmg-hp absolute bottom-0 font-display font-bold tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]",
              floaterTone(t),
            )}
            style={{ right: `${Math.max(0, 4 + (t.offset + 36) * 0.35)}px` }}
          >
            {formatFloater(t)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[20] overflow-visible"
      aria-hidden
    >
      {texts.map((t) => {
        // Spread hits across the card so multi-hit bursts stay readable.
        const leftPct = Math.max(18, Math.min(82, 50 + t.offset * 0.55));
        return (
          <span
            key={t.id}
            className={cn(
              "float-dmg absolute top-[42%] font-display font-bold tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]",
              floaterTone(t),
              t.isCrit && !t.isMiss && !t.isHeal && "text-lg",
              !t.isCrit && !t.isMiss && "text-base",
              t.isMiss && "text-sm",
            )}
            style={{ left: `${leftPct}%` }}
          >
            {formatFloater(t)}
          </span>
        );
      })}
    </div>
  );
}

function floaterTone(t: FloatingText) {
  if (t.isMiss) return "tracking-wide text-[#9aa8b8]";
  if (t.isHeal) return "text-[#4ade80]";
  if (t.isCrit) return "text-[#e4c36a]";
  return "text-white";
}

function formatFloater(t: FloatingText) {
  if (t.isMiss) return "MISS";
  const n = Math.abs(Math.round(t.value)).toLocaleString("ru-RU");
  return `${t.isHeal ? "+" : "-"}${n}${t.isCrit && !t.isHeal ? "!" : ""}`;
}
