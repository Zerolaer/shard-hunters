"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Coins, Gem, LogOut, Pickaxe, Zap } from "lucide-react";
import { formatFullDigits, xpToNext } from "@/lib/game/formulas";
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
    <header className="es-header relative z-40 shrink-0 overflow-visible select-none">
      <div className="relative mx-auto hidden h-14 max-w-[1600px] items-center overflow-visible px-5 lg:flex">
        <ProfileButton
          name={character.name}
          level={character.level}
          power={derived.powerScore}
          xp={character.xp}
          need={need}
          open={profileOpen}
          onOpen={() => setProfileOpen(true)}
        />

        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[1] flex -translate-x-1/2 items-center overflow-visible">
          <CurrencyRow resources={resources} />
        </div>

        <div className="relative z-10 ml-auto">
          <LogoutButton onClick={() => void logout()} withLabel />
        </div>
      </div>

      <div className="mobile-header mx-auto flex max-w-[1600px] flex-col gap-2 px-3 pb-2.5 pt-2 lg:hidden">
        <div className="flex items-center gap-2">
          <ProfileButton
            name={character.name}
            level={character.level}
            power={derived.powerScore}
            xp={character.xp}
            need={need}
            open={profileOpen}
            onOpen={() => setProfileOpen(true)}
            compact
          />
          <LogoutButton onClick={() => void logout()} />
        </div>
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CurrencyRow resources={resources} compact />
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}

function ProfileButton({
  name,
  level,
  power,
  xp,
  need,
  open,
  onOpen,
  compact,
}: {
  name: string;
  level: number;
  power: number;
  xp: number;
  need: number;
  open: boolean;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative z-10 flex min-w-0 flex-1 items-center gap-3 text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-white/20 lg:max-w-[320px] lg:flex-none"
      title="Профиль"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Профиль: ${name}`}
    >
      <LevelBadge level={level} shape="square" size="sm" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 leading-none">
          <span className="truncate font-display text-[13px] font-medium tracking-tight text-[var(--foreground)]">
            {name}
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-0.5 font-display text-[12px] font-semibold tabular-nums tracking-tight text-[var(--accent)]/90"
            title="Боевая мощь"
          >
            <Zap className="h-3 w-3 opacity-80" />
            {formatFullDigits(power)}
          </span>
        </div>
        <div className={compact ? "mt-1.5 w-full max-w-[11rem]" : "mt-1.5 w-[140px]"}>
          <HealthBar current={xp} max={need} variant="xp" compact />
        </div>
      </div>
    </button>
  );
}

function CurrencyRow({
  resources,
  compact,
}: {
  resources: { gold: number; shards: number; ore: number; blessing?: number };
  compact?: boolean;
}) {
  return (
    <div className={compact ? "pointer-events-auto flex w-max items-center gap-0" : "pointer-events-auto flex items-center gap-0 overflow-visible"}>
      <CurrencyStat
        icon={<Coins className="h-3.5 w-3.5 text-amber-300/70" />}
        value={formatFullDigits(resources.gold)}
        minCh={compact ? 0 : 7}
        tip="Золото — основная валюта для усиления и мастерской"
        compact={compact}
      />
      <span className="es-currency-divider" aria-hidden />
      <CurrencyStat
        icon={<Gem className="h-3.5 w-3.5 text-sky-300/70" />}
        value={formatFullDigits(resources.shards)}
        minCh={compact ? 0 : 5}
        tip="Осколки — редкая валюта для высоких уровней усиления"
        compact={compact}
      />
      <span className="es-currency-divider" aria-hidden />
      <CurrencyStat
        icon={<Pickaxe className="h-3.5 w-3.5 text-white/40" />}
        value={formatFullDigits(resources.ore)}
        minCh={compact ? 0 : 5}
        tip="Руда — добывается в шахтах, тратится на усиление"
        compact={compact}
      />
    </div>
  );
}

function LogoutButton({ onClick, withLabel }: { onClick: () => void; withLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-normal text-[var(--muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--foreground)] lg:h-8"
      title="Выйти"
      aria-label="Выйти"
    >
      <LogOut className="h-3.5 w-3.5" />
      {withLabel ? "Выйти" : null}
    </button>
  );
}

function CurrencyStat({
  icon,
  value,
  tip,
  minCh,
  compact,
}: {
  icon: ReactNode;
  value: string;
  tip: string;
  minCh: number;
  compact?: boolean;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  return (
    <div
      className={
        compact
          ? "group/cur relative flex cursor-default items-center gap-1 px-2.5 select-text"
          : "group/cur relative flex cursor-default items-center gap-1.5 px-3.5 select-text"
      }
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onBlur={() => setAnchor(null)}
    >
      {icon}
      <span
        className="inline-block font-display text-[13px] font-normal tabular-nums tracking-tight text-[var(--foreground)]/85"
        style={minCh > 0 ? { minWidth: `${minCh}ch`, textAlign: "left" } : undefined}
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
