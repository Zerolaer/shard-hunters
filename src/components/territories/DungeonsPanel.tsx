"use client";

import { useEffect, useState } from "react";
import {
  Coins,
  DoorOpen,
  Gem,
  Pickaxe,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
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
  if (hall.rates.orePerKill > 0) chips.push("руда с убийств");
  if (hall.rates.dropChanceMult > 1.01) chips.push(`дроп ×${hall.rates.dropChanceMult}`);
  if (hall.rates.rarityBias > 0) chips.push("удача редкости");
  return chips;
}

export function DungeonsPanel() {
  const level = useGameStore((s) => s.character.level);
  const dungeon = useGameStore((s) => s.dungeon);
  const enterDungeon = useGameStore((s) => s.enterDungeon);
  const leaveDungeon = useGameStore((s) => s.leaveDungeon);
  const derived = useDerivedStats();
  const [type, setType] = useState<DungeonType>("xp");
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const dungeonState = dungeon ?? emptyDungeonState();

  useEffect(() => {
    if (!dungeon?.active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [dungeon?.active]);

  const active = dungeon?.active ?? null;
  const activeHall = active ? DUNGEON_HALL_BY_ID[active.hallId] : null;
  const remain = dungeonRemainingMs(active, now);
  const halls = hallsForType(type);

  return (
    <div className="flex flex-col gap-3">
      <div className="es-plate p-3">
        <div className="font-display text-[14px] text-white">Подземелья</div>
        <p className="mt-1 text-[11px] leading-snug text-[#8aa0b4]">
          Ежедневные часовые залы. Выберите тип награды, затем зал по уровню. Вход
          по уровню; слабый БМ — будете умирать. Каждый тип — час в сутки. Выход
          ставит таймер на паузу: можно вернуться и доиграть оставшееся время.
        </p>

        {active && activeHall ? (
          <div className="mt-3 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent)]/8 p-3">
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
                onClick={() => {
                  const res = leaveDungeon();
                  setMsg(res.message);
                }}
                className="es-btn es-inv-control shrink-0 px-2.5"
              >
                <DoorOpen className="h-3.5 w-3.5" />
                Выйти
              </button>
            </div>
          </div>
        ) : null}

        {msg ? <p className="mt-2 text-[11px] text-white/65">{msg}</p> : null}
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/8 bg-black/20 p-1">
        {DUNGEON_TYPES.map((t) => {
          const Icon = TYPE_ICON[t];
          const available = dungeonTypeAvailable(dungeonState, t, now);
          const pausedMs = dungeonPausedRemainingMs(dungeonState, t, now);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "es-btn h-auto flex-col gap-0.5 py-2 text-[10px]",
                type === t && "es-btn-amber",
                !available && "opacity-55",
              )}
              title={
                available
                  ? pausedMs > 0
                    ? `Осталось ${formatDungeonCountdown(pausedMs)} — можно продолжить`
                    : DUNGEON_TYPE_BLURB[t]
                  : "Время на сегодня исчерпано"
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {DUNGEON_TYPE_LABEL[t]}
              {!available ? (
                <span className="text-[9px] text-white/40">сегодня</span>
              ) : pausedMs > 0 ? (
                <span className="text-[9px] tabular-nums text-white/55">
                  {formatDungeonCountdown(pausedMs)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[#8aa0b4]">{DUNGEON_TYPE_BLURB[type]}</p>

      <div className="space-y-2">
        {halls.map((hall) => {
          const rec = dungeonRecommendedBm(hall);
          const comfort = dungeonComfortBm(hall);
          const locked = level < hall.minLevel;
          const weak = !locked && derived.powerScore < comfort;
          const okBm = !locked && derived.powerScore >= rec;
          const available = dungeonTypeAvailable(dungeonState, hall.type, now);
          const busy = !!active;
          const pausedMs = dungeonPausedRemainingMs(dungeonState, hall.type, now);
          return (
            <div
              key={hall.id}
              className={cn(
                "rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur-md",
                locked && "opacity-45",
              )}
              style={{ borderColor: locked ? undefined : `${hall.accent}33` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-[13px] text-white">{hall.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 tabular-nums text-white/60">
                      ур. {hall.minLevel}+
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 tabular-nums",
                        okBm
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200/90"
                          : weak
                            ? "border-rose-400/25 bg-rose-500/10 text-rose-200/90"
                            : "border-amber-400/20 bg-amber-500/10 text-amber-100/90",
                      )}
                    >
                      <Zap className="h-3 w-3" />
                      БМ {formatFullDigits(rec)}
                    </span>
                    {rateChips(hall).map((c) => (
                      <span
                        key={c}
                        className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-white/50"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  {weak ? (
                    <p className="mt-1.5 text-[10px] text-rose-300/80">
                      Ваш БМ ниже комфортного — зал опасен.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={locked || !available || busy}
                  onClick={() => {
                    const res = enterDungeon(hall.id);
                    setMsg(res.message);
                  }}
                  className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
                >
                  {pausedMs > 0 && !busy ? "Продолжить" : "Войти"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
