"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
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

/** Press-and-hold auto-allocate with accelerating repeat. */
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

export function StatBlock() {
  const character = useGameStore((s) => s.character);
  const equipment = useGameStore((s) => s.equipment);
  const derived = useDerivedStats();
  const gear = collectGear(equipment);

  const combatValue: Record<(typeof COMBAT_ROWS)[number]["key"], string> = {
    dps: derived.dps.toFixed(1),
    attack: String(derived.attack),
    defense: String(derived.defense),
    hp: `${Math.round(character.hp)}/${derived.maxHp}`,
    crit: `${derived.critChance.toFixed(1)}%`,
    critDmg: `${derived.critDamage.toFixed(0)}%`,
    accuracy: `${derived.accuracy.toFixed(1)}%`,
    speed: `${derived.attackInterval.toFixed(2)}с`,
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
          <div>DPS {derived.dps.toFixed(1)}</div>
          <div className="tabular-nums">
            {Math.round(character.hp)}/{derived.maxHp} HP
          </div>
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
        <div className="px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-white/35">Бой</div>
        {COMBAT_ROWS.map((row) => (
          <RpRow key={row.key} icon={row.icon} label={row.label} value={combatValue[row.key]} />
        ))}
      </div>
    </div>
  );
}
