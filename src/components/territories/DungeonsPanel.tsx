"use client";

import { useEffect, useState } from "react";
import { Coins, DoorOpen, Gem, Pickaxe, Sparkles, Timer, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DUNGEON_HALL_BY_ID,
  DUNGEON_TYPE_BLURB,
  DUNGEON_TYPE_LABEL,
  DUNGEON_TYPES,
  dungeonComfortBm,
  dungeonPausedRemainingMs,
  dungeonRecommendedBm,
  dungeonRemainingMs,
  dungeonTypeAvailable,
  emptyDungeonState,
  formatDungeonCountdown,
  hallsForType,
  type DungeonHall,
  type DungeonType,
} from "@/lib/game/dungeons";
import { formatFullDigits } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";

const TYPE_ICON = {
  xp: Sparkles,
  gold: Coins,
  ore: Pickaxe,
  loot: Gem,
} as const;

const TYPE_ACCENT: Record<DungeonType, string> = {
  xp: "#a78bfa",
  gold: "#e4c36a",
  ore: "#94a3b8",
  loot: "#38bdf8",
};

function rateChips(hall: DungeonHall) {
  const chips: string[] = [];
  if (hall.rates.xpMult > 1.01) chips.push(`XP ×${hall.rates.xpMult}`);
  if (hall.rates.goldMult > 1.01) chips.push(`золото ×${hall.rates.goldMult}`);
  if (hall.rates.orePerKill > 0) chips.push(`руда ×${hall.rates.orePerKill}/убийство`);
  if (hall.rates.dropChanceMult > 1.01) chips.push(`дроп ×${hall.rates.dropChanceMult}`);
  if (hall.rates.rarityBias > 0) chips.push("удача редкости");
  return chips;
}

export function DungeonsPanel() {
  const level = useGameStore((s) => s.character.level);
  const dungeon = useGameStore((s) => s.dungeon);
  const tower = useGameStore((s) => s.tower);
  const enterDungeon = useGameStore((s) => s.enterDungeon);
  const leaveDungeon = useGameStore((s) => s.leaveDungeon);
  const derived = useDerivedStats();
  const [type, setType] = useState<DungeonType>("xp");
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const dungeonState = dungeon ?? emptyDungeonState();
  const towerActive = !!tower?.active;
  const busy = !!dungeon?.active || towerActive;

  useEffect(() => {
    if (!dungeon?.active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [dungeon?.active]);

  const active = dungeon?.active ?? null;
  const activeHall = active ? DUNGEON_HALL_BY_ID[active.hallId] : null;
  const remain = dungeonRemainingMs(active, now);
  const halls = hallsForType(type);
  const typeAvailable = dungeonTypeAvailable(dungeonState, type, now);
  const typePausedMs = dungeonPausedRemainingMs(dungeonState, type, now);

  return (
    <div className="flex flex-col gap-3">
      {active && activeHall ? (
        <div className="es-plate border-[var(--accent)]/35 bg-[var(--accent)]/8 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
                Активный забег · {DUNGEON_TYPE_LABEL[active.type]}
              </div>
              <div className="mt-0.5 font-display text-[15px] text-white">{activeHall.name}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] tabular-nums text-white/70">
                <Timer className="h-3.5 w-3.5" />
                {formatDungeonCountdown(remain)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMsg(leaveDungeon().message)}
              className="es-btn es-inv-control shrink-0 px-2.5"
            >
              <DoorOpen className="h-3.5 w-3.5" />
              Выйти
            </button>
          </div>
        </div>
      ) : null}

      {msg ? <p className="text-[11px] text-white/65">{msg}</p> : null}

      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {DUNGEON_TYPES.map((t) => {
          const Icon = TYPE_ICON[t];
          const selected = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px]",
                selected
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-white/8 text-white/50 hover:bg-white/[0.04]",
              )}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: TYPE_ACCENT[t] }} />
              {DUNGEON_TYPE_LABEL[t]}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[#8aa0b4]">{DUNGEON_TYPE_BLURB[type]}</p>
      {typePausedMs > 0 && typeAvailable ? (
        <span className="text-[11px] tabular-nums text-white/55">
          осталось {formatDungeonCountdown(typePausedMs)}
        </span>
      ) : !typeAvailable ? (
        <span className="text-[11px] text-white/40">лимит на сегодня</span>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {halls.map((hall) => (
          <DungeonCard
            key={hall.id}
            hall={hall}
            level={level}
            power={derived.powerScore}
            available={typeAvailable}
            busy={busy}
            pausedMs={typePausedMs}
            onEnter={() => setMsg(enterDungeon(hall.id).message)}
          />
        ))}
      </div>
    </div>
  );
}

function DungeonCard({
  hall,
  level,
  power,
  available,
  busy,
  pausedMs,
  onEnter,
}: {
  hall: DungeonHall;
  level: number;
  power: number;
  available: boolean;
  busy: boolean;
  pausedMs: number;
  onEnter: () => void;
}) {
  const rec = dungeonRecommendedBm(hall);
  const comfort = dungeonComfortBm(hall);
  const locked = level < hall.minLevel;
  const weak = !locked && power < comfort;
  const okBm = !locked && power >= rec;
  const chips = rateChips(hall);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c]",
        locked && "opacity-50",
      )}
    >
      <div
        className="relative h-28 w-full"
        style={{
          background: `linear-gradient(145deg, ${hall.accent}55 0%, #121214 55%, #0a0a0c 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
          <div className="font-display text-[16px] text-white">{hall.name}</div>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <p className="text-[11px] text-[#8aa0b4]">{hall.blurb}</p>
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/35">Режим:</div>
        <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-white">Зал</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] tabular-nums",
                okBm ? "text-white/80" : weak ? "text-[#fda4af]" : "text-[#f0d78c]",
              )}
            >
              <Zap className="h-3 w-3" />
              {formatFullDigits(rec)} БМ
            </span>
          </div>
          <div className="mt-1 text-[10px] text-[#8aa0b4]">
            ур. {hall.minLevel}+ · {chips.slice(0, 2).join(" · ") || "стандарт"}
          </div>
          <div className="mt-1 text-[10px] text-white/35">босс · {hall.bossName} · артефакты в дропе</div>
        </div>
        <button
          type="button"
          disabled={locked || !available || busy}
          onClick={onEnter}
          className="h-11 w-full rounded-xl bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pausedMs > 0 && !busy && !locked ? "Продолжить" : "ВОЙТИ"}
        </button>
      </div>
    </div>
  );
}
