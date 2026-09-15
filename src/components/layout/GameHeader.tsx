"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Coins, Gem, LogOut, Pickaxe, Sparkles, Zap } from "lucide-react";
import { formatFullDigits, xpToNext } from "@/lib/game/formulas";
import { BLESSING_MATERIAL_LABEL } from "@/lib/game/workshop";
import { useAuthStore } from "@/store/useAuthStore";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { HealthBar } from "@/components/combat/HealthBar";
import { LevelBadge } from "./LevelBadge";
import { ProfileModal } from "./ProfileModal";

export function GameHeader() {
  const character = useGameStore((s) => s.character);
  const resources = useGameStore((s) => s.resources);
  const logout = useAuthStore((s) => s.logout);
  const derived = useDerivedStats();
  const need = xpToNext(character.level);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="es-header relative z-40 shrink-0 overflow-visible">
      <div className="relative mx-auto flex h-14 max-w-[1600px] items-center overflow-visible px-5">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="group relative z-10 flex min-w-0 max-w-[320px] items-center gap-3 text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-white/20"
          title="Профиль"
          aria-haspopup="dialog"
          aria-expanded={profileOpen}
          aria-label={`Профиль: ${character.name}`}
        >
          <LevelBadge level={character.level} shape="square" size="sm" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 leading-none">
              <span className="truncate font-display text-[13px] font-medium tracking-tight text-[var(--foreground)]">
                {character.name}
              </span>
              <span
                className="inline-flex shrink-0 items-center gap-0.5 font-display text-[12px] font-semibold tabular-nums tracking-tight text-[var(--accent)]/90"
                title="Боевая мощь"
              >
                <Zap className="h-3 w-3 opacity-80" />
                {formatFullDigits(derived.powerScore)}
              </span>
            </div>
            <div className="mt-1.5 w-[140px]">
              <HealthBar current={character.xp} max={need} variant="xp" compact />
            </div>
          </div>
        </button>

        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[1] flex -translate-x-1/2 items-center overflow-visible">
          <div className="pointer-events-auto flex items-center gap-0 overflow-visible">
            <CurrencyStat
              icon={<Coins className="h-3.5 w-3.5 text-amber-300/70" />}
              value={formatFullDigits(resources.gold)}
              minCh={7}
              tip="Золото — основная валюта для усиления и мастерской"
            />
            <span className="es-currency-divider" aria-hidden />
            <CurrencyStat
              icon={<Gem className="h-3.5 w-3.5 text-sky-300/70" />}
              value={formatFullDigits(resources.shards)}
              minCh={5}
              tip="Осколки — редкая валюта для высоких уровней усиления"
            />
            <span className="es-currency-divider" aria-hidden />
            <CurrencyStat
              icon={<Pickaxe className="h-3.5 w-3.5 text-white/40" />}
              value={formatFullDigits(resources.ore)}
              minCh={5}
              tip="Руда — добывается в шахтах, тратится на усиление"
            />
            <span className="es-currency-divider" aria-hidden />
            <CurrencyStat
              icon={<Sparkles className="h-3.5 w-3.5 text-[#f43f5e]/70" />}
              value={formatFullDigits(resources.blessing ?? 0)}
              minCh={4}
              tip={`${BLESSING_MATERIAL_LABEL} — материал мастерской (благословение и сокеты)`}
            />
          </div>
        </div>

        <div className="relative z-10 ml-auto">
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-normal text-[var(--muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--foreground)]"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти
          </button>
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}

function CurrencyStat({
  icon,
  value,
  tip,
  minCh,
}: {
  icon: ReactNode;
  value: string;
  tip: string;
  minCh: number;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  return (
    <div
      className="group/cur relative flex items-center gap-1.5 px-3.5"
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onBlur={() => setAnchor(null)}
    >
      {icon}
      <span
        className="inline-block font-display text-[13px] font-normal tabular-nums tracking-tight text-[var(--foreground)]/85"
        style={{ minWidth: `${minCh}ch`, textAlign: "left" }}
      >
        {value}
      </span>
      {anchor && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              className="es-tooltip pointer-events-none fixed z-[200] w-max max-w-[240px] px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white/85"
              style={{
                left: Math.min(anchor.left + anchor.width / 2, window.innerWidth - 16),
                top: anchor.bottom + 8,
                transform: "translateX(-50%)",
              }}
            >
              {tip}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}
