"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  "potion-attack": Zap,
  "potion-defense": Shield,
  "potion-accuracy": Target,
  "potion-crit": Axe,
  "potion-haste": Timer,
};

export function BuffTray() {
  const playerEffects = useGameStore((s) => s.combat.playerEffects);
  const guildBuffs = useGameStore((s) => s.guild.buffs);
  const potionBuffs = useGameStore((s) => s.meta.potionBuffs);
  const [, setPulse] = useState(0);
  const hasTimer =
    (guildBuffs ?? []).some((b) => b.expiresAt > Date.now()) ||
    (potionBuffs ?? []).some((b) => b.expiresAt > Date.now());

  useEffect(() => {
    if (!hasTimer) return;
    const id = window.setInterval(() => setPulse((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasTimer]);

  const stacked = useBuffStackOrder(
    listActivePlayerBuffs({ playerEffects, guildBuffs, potionBuffs }, Date.now()),
  );

  if (stacked.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-2 z-40 flex max-h-[min(42vh,22rem)] flex-col-reverse gap-1 overflow-y-auto lg:bottom-4 lg:left-6"
      aria-label="Активные баффы"
    >
      {stacked.map((buff) => (
        <BuffIcon key={buff.key} buff={buff} />
      ))}
    </div>
  );
}

function BuffIcon({ buff }: { buff: ActivePlayerBuff }) {
  const Icon = ICONS[buff.icon] ?? Sparkles;
  const badge = formatBuffBadge(buff);
  const guild = buff.source === "guild";
  const potion = buff.source === "potion";
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <div
      aria-label={formatBuffTitle(buff)}
      className={cn(
        "pointer-events-auto relative flex h-9 w-9 shrink-0 cursor-default flex-col items-center rounded-lg border pt-[5px] shadow-[0_6px_16px_rgba(0,0,0,0.45)] backdrop-blur-md",
        guild
          ? "border-[rgba(228,195,106,0.38)] bg-[rgba(18,16,12,0.78)] text-[#f3e6c0]"
          : potion
            ? "border-emerald-400/35 bg-emerald-950/70 text-emerald-100"
            : "border-white/14 bg-black/70 text-white",
      )}
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      {badge ? (
        <span className="mt-auto pb-px text-center text-[8px] font-semibold leading-none tabular-nums text-white/90">
          {badge}
        </span>
      ) : null}
      {anchor && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              className="es-tooltip pointer-events-none fixed z-[200] w-max max-w-[260px] whitespace-pre-line px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white/85"
              style={{
                left: Math.min(anchor.left + anchor.width / 2, window.innerWidth - 16),
                top: Math.max(8, anchor.top - 8),
                transform: "translate(-50%, -100%)",
              }}
            >
              {formatBuffTitle(buff)}
            </span>,
            document.body,
          )
        : null}
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
