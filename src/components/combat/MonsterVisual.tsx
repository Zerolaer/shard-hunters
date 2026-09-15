"use client";

import { Crown, Flame, Ghost, Skull, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/cn";
import { LOCATION_BY_ID, LOCATIONS, regionForLocation } from "@/lib/game/constants";
import { useGameStore } from "@/store/useGameStore";
import type { LucideIcon } from "lucide-react";

const REGION_ICONS: Record<string, LucideIcon> = {
  whispering: Skull,
  crystal: Sparkles,
  ash: Flame,
  cult: Ghost,
  astral: Sparkles,
  crimson: Swords,
  brine: Ghost,
  night: Skull,
  sovereign: Crown,
};

export function MonsterVisual({ compact = false }: { compact?: boolean }) {
  const monster = useGameStore((s) => s.combat.monster);
  const hitFlash = useGameStore((s) => s.combat.hitFlash);
  const locationId = useGameStore((s) => s.combat.locationId);
  const loc = LOCATION_BY_ID[locationId] ?? LOCATIONS[0]!;
  const region = regionForLocation(locationId);
  const Icon = REGION_ICONS[region.id] ?? Skull;

  if (!monster) {
    if (compact) return null;
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-visible text-[#6a7c8c]">
        Нет цели
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40",
          monster.isPvp && "border-white/40",
          monster.isBoss && !monster.isPvp && "border-[#e4c36a]/50",
          hitFlash > 0 && "monster-hit",
        )}
      >
        <Icon
          className="relative h-6 w-6"
          style={{ color: monster.isPvp ? "#fff" : monster.isBoss ? "#f0d78c" : loc.accent }}
        />
        {monster.isBoss && !monster.isPvp && (
          <>
            <Crown className="absolute -top-1.5 h-3.5 w-3.5 text-[#f0d78c]" />
            <span className="absolute -bottom-1 rounded-sm border border-[#e4c36a]/45 bg-black/70 px-1 text-[8px] font-medium uppercase tracking-wide text-[#f0d78c]">
              босс
            </span>
          </>
        )}
        {monster.isPvp && <Swords className="absolute -top-1.5 h-3.5 w-3.5 text-white" />}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-visible px-3">
      <div
        className={cn(
          "relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/55 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl",
          monster.isPvp && "border-white/40",
          monster.isBoss && !monster.isPvp && "border-[#e4c36a]/50 shadow-[0_0_28px_rgba(228,195,106,0.25)]",
          hitFlash > 0 && "monster-hit",
        )}
      >
        <div className="absolute inset-3 rounded-full bg-white/10 blur-md" />
        <Icon
          className="relative h-12 w-12"
          style={{ color: monster.isPvp ? "#fff" : monster.isBoss ? "#f0d78c" : loc.accent }}
        />
        {monster.isBoss && !monster.isPvp && (
          <Crown className="absolute -top-2 h-5 w-5 text-[#f0d78c]" />
        )}
        {monster.isPvp && <Swords className="absolute -top-2 h-5 w-5 text-white" />}
      </div>
      <div className="relative z-10 mt-4 w-full min-w-0 text-center">
        {monster.isBoss && !monster.isPvp ? (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#e4c36a]">Фаза босса</div>
        ) : null}
        <div className="truncate font-display text-2xl font-semibold tracking-tight text-white">{monster.name}</div>
        <div className="truncate text-sm text-[var(--muted)]">
          Ур. {monster.level}
          {monster.isPvp ? " · ОХОТНИК" : monster.isBoss ? " · БОСС" : ""}
        </div>
      </div>
    </div>
  );
}
