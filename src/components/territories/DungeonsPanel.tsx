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

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,0.72fr)_minmax(0,1.28fr)]">
        {/* Left: dungeon kinds */}
        <aside className="es-plate flex flex-col gap-1 p-2">
          <div className="es-label px-1.5 pb-1.5 pt-0.5">Виды данжей</div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 lg:flex-col lg:overflow-visible">
            {DUNGEON_TYPES.map((t) => {
              const Icon = TYPE_ICON[t];
              const available = dungeonTypeAvailable(dungeonState, t, now);
              const pausedMs = dungeonPausedRemainingMs(dungeonState, t, now);
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "min-w-[7.5rem] shrink-0 rounded-lg border px-2.5 py-2.5 text-left transition lg:min-w-0 lg:w-full",
                    selected
                      ? "border-white/25 bg-white/10"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
                    !available && "opacity-55",
                  )}
                  title={
                    available
                      ? pausedMs > 0
                        ? `Осталось ${formatDungeonCountdown(pausedMs)}`
                        : DUNGEON_TYPE_BLURB[t]
                      : "Время на сегодня исчерпано"
                  }
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "text-[var(--accent)]" : "text-white/45",
                      )}
                    />
                    <span className="font-display text-[13px] text-white">
                      {DUNGEON_TYPE_LABEL[t]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/45 lg:line-clamp-none">
                    {DUNGEON_TYPE_BLURB[t]}
                  </p>
                  {!available ? (
                    <span className="mt-1.5 inline-block text-[9px] uppercase tracking-wide text-white/35">
                      сегодня закрыто
                    </span>
                  ) : pausedMs > 0 ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] tabular-nums text-white/55">
                      <Timer className="h-3 w-3" />
                      {formatDungeonCountdown(pausedMs)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: floor/level cards for selected kind */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
            <div>
              <div className="es-label">Уровни · {DUNGEON_TYPE_LABEL[type]}</div>
              <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{DUNGEON_TYPE_BLURB[type]}</p>
            </div>
            {typePausedMs > 0 && typeAvailable ? (
              <span className="text-[11px] tabular-nums text-white/55">
                осталось {formatDungeonCountdown(typePausedMs)}
              </span>
            ) : !typeAvailable ? (
              <span className="text-[11px] text-white/40">лимит на сегодня</span>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {halls.map((hall) => (
              <FloorCard
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
      </div>
    </div>
  );
}

function FloorCard({
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
    <article
      className={cn(
        "es-well flex flex-col gap-2.5 p-3 transition",
        locked && "opacity-50",
      )}
      style={{ boxShadow: `inset 3px 0 0 0 ${hall.accent}99` }}
    >
      <div>
        <div className="font-display text-[14px] leading-tight text-white">{hall.name}</div>
        <p className="mt-1 text-[10px] text-white/45">{hall.blurb}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 tabular-nums text-white/60">
          ур. {hall.minLevel}+
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 tabular-nums",
            okBm
              ? "border-white/20 bg-white/10 text-white/85"
              : weak
                ? "border-[#fb7185]/30 bg-[#fb7185]/10 text-[#fda4af]"
                : "border-[#e4c36a]/25 bg-[#e4c36a]/10 text-[#f0d78c]",
          )}
        >
          <Zap className="h-3 w-3" />
          БМ {formatFullDigits(rec)}
        </span>
      </div>

      <ul className="space-y-1 text-[11px] text-white/70">
        {chips.length > 0 ? (
          chips.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <span
                className="h-1 w-1 shrink-0 rounded-full"
                style={{ background: hall.accent }}
              />
              {c}
            </li>
          ))
        ) : (
          <li className="text-[#8aa0b4]">Стандартный фарм зала</li>
        )}
        <li className="flex items-center gap-2 text-white/45">
          <span className="h-1 w-1 shrink-0 rounded-full bg-white/25" />
          босс · {hall.bossName}
        </li>
      </ul>

      {weak ? (
        <p className="text-[10px] text-[#fda4af]">БМ ниже комфортного — зал опасен.</p>
      ) : null}

      <button
        type="button"
        disabled={locked || !available || busy}
        onClick={onEnter}
        className="es-btn es-btn-cyan mt-auto h-9 w-full px-3"
      >
        {pausedMs > 0 && !busy && !locked ? "Продолжить" : "ВОЙТИ"}
      </button>
    </article>
  );
}
