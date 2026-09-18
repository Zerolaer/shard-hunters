"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { CORE_STAT_HINT, STAT_LABEL } from "@/lib/game/constants";
import { collectGear, formatFullDigits } from "@/lib/game/formulas";
import type { CoreStat } from "@/lib/game/types";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Gauge, Plus, Zap } from "lucide-react";
import { STAT_ICONS } from "./itemUi";
import { RpRow } from "@/components/layout/RightChrome";

const ORDER: CoreStat[] = ["strength", "agility", "endurance", "intelligence"];

const COMBAT_ROWS = [
  { key: "dps", label: "DPS", icon: STAT_ICONS.attack },
  { key: "attack", label: STAT_LABEL.attack, icon: STAT_ICONS.attack },
  { key: "defense", label: STAT_LABEL.defense, icon: STAT_ICONS.defense },
  { key: "hp", label: "HP", icon: STAT_ICONS.health },
  { key: "crit", label: STAT_LABEL.critChance, icon: STAT_ICONS.critChance },
  { key: "critDmg", label: STAT_LABEL.critDamage, icon: STAT_ICONS.critDamage },
  { key: "accuracy", label: STAT_LABEL.accuracy, icon: STAT_ICONS.accuracy },
  { key: "speed", label: "Скорость", icon: Gauge },
] as const;

type BreakdownLine = { source: string; value: string };

function useHoldAllocate(stat: CoreStat, enabled: boolean) {
  const allocateStat = useGameStore((s) => s.allocateStat);
  const holdRef = useRef<{
    timer: number | null;
    started: boolean;
    pointerId: number | null;
  }>({ timer: null, started: false, pointerId: null });

  function clearHold() {
    const h = holdRef.current;
    if (h.timer != null) window.clearTimeout(h.timer);
    h.timer = null;
    h.started = false;
    h.pointerId = null;
  }

  useEffect(() => () => clearHold(), []);

  function tick(delay: number) {
    if (useGameStore.getState().character.unspentPoints <= 0) {
      clearHold();
      return;
    }
    allocateStat(stat);
    if (useGameStore.getState().character.unspentPoints <= 0) {
      clearHold();
      return;
    }
    const next = Math.max(28, delay * 0.82);
    holdRef.current.timer = window.setTimeout(() => tick(next), next);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!enabled || e.button !== 0) return;
    e.preventDefault();
    clearHold();
    holdRef.current.pointerId = e.pointerId;
    holdRef.current.started = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    allocateStat(stat);
    holdRef.current.timer = window.setTimeout(() => tick(110), 320);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (holdRef.current.pointerId != null && e.currentTarget.hasPointerCapture(holdRef.current.pointerId)) {
      e.currentTarget.releasePointerCapture(holdRef.current.pointerId);
    }
    clearHold();
  }

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  };
}

function StatPlusButton({ stat, enabled }: { stat: CoreStat; enabled: boolean }) {
  const hold = useHoldAllocate(stat, enabled);
  return (
    <button
      type="button"
      disabled={!enabled}
      {...hold}
      className="es-btn es-btn-cyan grid h-7 w-7 touch-none place-items-center p-0 select-none"
      aria-label={`Вложить в ${STAT_LABEL[stat]}`}
      title="Удерживайте, чтобы вкладывать быстрее"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  );
}

function BreakdownTip({
  lines,
  children,
}: {
  lines: BreakdownLine[];
  children: React.ReactNode;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <div
      className="relative"
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && lines.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              className="es-tooltip pointer-events-none fixed z-[220] min-w-[180px] max-w-[260px] px-2.5 py-2 text-[11px] leading-snug text-white/90"
              style={{
                left: Math.min(anchor.left, window.innerWidth - 280),
                top: anchor.top - 8,
                transform: "translateY(-100%)",
              }}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Состав</div>
              <ul className="space-y-0.5">
                {lines.map((l) => (
                  <li key={l.source} className="flex justify-between gap-3">
                    <span className="text-white/55">{l.source}</span>
                    <span className="tabular-nums text-white/90">{l.value}</span>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function StatBlock() {
  const character = useGameStore((s) => s.character);
  const equipment = useGameStore((s) => s.equipment);
  const derived = useDerivedStats();
  const gear = collectGear(equipment);

  const combatValue: Record<(typeof COMBAT_ROWS)[number]["key"], string> = {
    dps: formatFullDigits(Math.round(derived.dps)),
    attack: formatFullDigits(derived.attack),
    defense: formatFullDigits(derived.defense),
    hp: `${formatFullDigits(Math.round(character.hp))}/${formatFullDigits(derived.maxHp)}`,
    crit: `${derived.critChance.toFixed(1)}%`,
    critDmg: `${derived.critDamage.toFixed(0)}%`,
    accuracy: `${derived.accuracy.toFixed(1)}%`,
    speed: `${derived.attackInterval.toFixed(2)}с`,
  };

  const breakdowns: Record<(typeof COMBAT_ROWS)[number]["key"], BreakdownLine[]> = {
    dps: [
      { source: "Атака", value: formatFullDigits(derived.attack) },
      { source: "Интервал", value: `${derived.attackInterval.toFixed(2)}с` },
      { source: "Крит", value: `${derived.critChance.toFixed(1)}%` },
    ],
    attack: [
      { source: "База / статы", value: formatFullDigits(Math.max(0, derived.attack - Math.round(gear.attack))) },
      { source: "Экипировка", value: `+${formatFullDigits(Math.round(gear.attack))}` },
    ],
    defense: [
      { source: "База / статы", value: formatFullDigits(Math.max(0, derived.defense - Math.round(gear.defense))) },
      { source: "Экипировка", value: `+${formatFullDigits(Math.round(gear.defense))}` },
    ],
    hp: [
      { source: "Макс. HP", value: formatFullDigits(derived.maxHp) },
      { source: "Экипировка HP", value: `+${formatFullDigits(Math.round(gear.health))}` },
      { source: "Выносливость", value: String(character.endurance + Math.round(gear.endurance)) },
    ],
    crit: [
      { source: "База / ловкость", value: `${Math.max(0, derived.critChance - gear.critChance).toFixed(1)}%` },
      { source: "Экипировка", value: `+${gear.critChance.toFixed(1)}%` },
    ],
    critDmg: [
      { source: "База", value: `${Math.max(0, derived.critDamage - gear.critDamage).toFixed(0)}%` },
      { source: "Экипировка", value: `+${gear.critDamage.toFixed(0)}%` },
    ],
    accuracy: [
      { source: "База / ловкость", value: `${Math.max(0, derived.accuracy - gear.accuracy).toFixed(1)}%` },
      { source: "Экипировка", value: `+${gear.accuracy.toFixed(1)}%` },
    ],
    speed: [
      { source: "Интервал атаки", value: `${derived.attackInterval.toFixed(2)}с` },
      { source: "Ловкость", value: String(character.agility + Math.round(gear.agility)) },
    ],
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="rp-inset flex items-center gap-3 overflow-hidden px-3.5 py-3">
        <span className="rp-icon text-amber-300/90">
          <Zap className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Боевая мощь</div>
          <div className="font-display text-2xl font-medium leading-none tracking-tight text-white">
            {formatFullDigits(derived.powerScore)}
          </div>
        </div>
        <div className="text-right text-[11px] leading-tight text-white/40">
          <div>DPS {formatFullDigits(Math.round(derived.dps))}</div>
        </div>
      </div>

      {character.unspentPoints > 0 && (
        <div className="rp-inset flex items-center gap-3 border border-amber-400/25 px-3.5 py-3">
          <Zap className="h-4 w-4 text-[#fbbf24]" />
          <span className="flex-1 text-[13px] text-[#8aa0b4]">Очки характеристик</span>
          <span className="font-display text-lg font-medium tabular-nums text-[#fbbf24]">
            {character.unspentPoints}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ORDER.map((stat) => {
          const Icon = STAT_ICONS[stat];
          const bonus = gear[stat];
          return (
            <div key={stat} className="rp-card relative overflow-hidden p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-white/40" />
                <span
                  className="min-w-0 flex-1 truncate text-[11px] text-[#8aa0b4]"
                  title={CORE_STAT_HINT[stat]}
                >
                  {STAT_LABEL[stat]}
                </span>
                {character.unspentPoints > 0 && (
                  <StatPlusButton stat={stat} enabled={character.unspentPoints > 0} />
                )}
              </div>
              <div className="mt-1.5 font-display text-xl font-medium leading-none tracking-tight text-white">
                {character[stat]}
                {bonus > 0 && <span className="ml-1 text-sm text-emerald-300/70">+{Math.round(bonus)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rp-card space-y-1 p-2.5">
        <div className="px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-white/35">Характеристики</div>
        {COMBAT_ROWS.map((row) => (
          <BreakdownTip key={row.key} lines={breakdowns[row.key]}>
            <RpRow icon={row.icon} label={row.label} value={combatValue[row.key]} />
          </BreakdownTip>
        ))}
      </div>
    </div>
  );
}
