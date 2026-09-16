"use client";

import { useEffect, useRef, useState } from "react";
import {
  Axe,
  Clover,
  Copy,
  Droplets,
  EyeOff,
  FlaskConical,
  Heart,
  Megaphone,
  Scissors,
  Shield,
  Sparkles,
  Target,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatBuffBadge,
  formatBuffTitle,
  listActivePlayerBuffs,
  type ActivePlayerBuff,
} from "@/lib/game/activeBuffs";
import { useGameStore } from "@/store/useGameStore";

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
  "guild-horn": Megaphone,
  "guild-luck": Clover,
  "guild-ward": Shield,
};

export function BuffTray() {
  const playerEffects = useGameStore((s) => s.combat.playerEffects);
  const guildBuffs = useGameStore((s) => s.guild.buffs);
  const [, setPulse] = useState(0);
  const hasGuildTimer = (guildBuffs ?? []).some((b) => b.expiresAt > Date.now());

  useEffect(() => {
    if (!hasGuildTimer) return;
    const id = window.setInterval(() => setPulse((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasGuildTimer]);

  const stacked = useBuffStackOrder(
    listActivePlayerBuffs({ playerEffects, guildBuffs }, Date.now()),
  );

  if (stacked.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-2 z-40 flex max-h-[min(42vh,22rem)] flex-col-reverse gap-1 overflow-y-auto lg:bottom-4 lg:left-6"
      aria-label="Активные баффы"
    >
      {stacked.map((buff) => {
        const Icon = ICONS[buff.icon] ?? Sparkles;
        const badge = formatBuffBadge(buff);
        const guild = buff.source === "guild";
        return (
          <div
            key={buff.key}
            title={formatBuffTitle(buff)}
            aria-label={formatBuffTitle(buff)}
            className={cn(
              "pointer-events-auto relative flex h-9 w-9 shrink-0 flex-col items-center rounded-lg border pt-[5px] shadow-[0_6px_16px_rgba(0,0,0,0.45)] backdrop-blur-md",
              guild
                ? "border-[rgba(228,195,106,0.38)] bg-[rgba(18,16,12,0.78)] text-[#f3e6c0]"
                : "border-white/14 bg-black/70 text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            {badge ? (
              <span className="mt-auto pb-px text-center text-[8px] font-semibold leading-none tabular-nums text-white/90">
                {badge}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Oldest stays at the visual bottom; newly seen buffs rise up the column. */
function useBuffStackOrder(buffs: ActivePlayerBuff[]) {
  const orderRef = useRef(new Map<string, number>());
  const seqRef = useRef(0);
  const present = new Set(buffs.map((b) => b.key));
  for (const key of [...orderRef.current.keys()]) {
    if (!present.has(key)) orderRef.current.delete(key);
  }
  for (const buff of buffs) {
    if (!orderRef.current.has(buff.key)) {
      orderRef.current.set(buff.key, seqRef.current++);
    }
  }
  return [...buffs].sort(
    (a, b) => (orderRef.current.get(a.key) ?? 0) - (orderRef.current.get(b.key) ?? 0),
  );
}
