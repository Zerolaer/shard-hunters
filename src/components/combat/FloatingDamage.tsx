"use client";

import { cn } from "@/lib/cn";
import type { FloatingText } from "@/lib/game/types";

export function FloatingDamage({ texts }: { texts: FloatingText[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[-6px] overflow-visible">
      {texts.map((t) => (
        <span
          key={t.id}
          className={cn(
            "float-dmg-hp absolute bottom-0 font-display font-bold tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]",
            t.isMiss && "text-xs tracking-wide text-[var(--muted)]",
            !t.isMiss && t.isHeal && "text-sm text-white",
            !t.isMiss && !t.isHeal && t.isCrit && "text-base text-[#e4c36a]",
            !t.isMiss && !t.isHeal && !t.isCrit && "text-sm text-white/80",
          )}
          style={{ right: `${Math.max(0, 4 + (t.offset + 36) * 0.35)}px` }}
        >
          {t.isMiss ? "MISS" : `${t.isHeal ? "+" : "-"}${t.value}${t.isCrit && !t.isHeal ? "!" : ""}`}
        </span>
      ))}
    </div>
  );
}
