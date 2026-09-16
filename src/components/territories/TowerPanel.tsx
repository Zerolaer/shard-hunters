"use client";

import { useMemo, useState } from "react";
import { Coins, DoorOpen, Gem, Pickaxe, Sparkles, Swords, TowerControl, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFullDigits } from "@/lib/game/formulas";
import { RARITY_LABEL } from "@/lib/game/constants";
import {
  TOWER_ACCENT,
  TOWER_MIN_LEVEL,
  TOWER_MILESTONE,
  emptyTowerState,
  isTowerMilestone,
  towerClearBonus,
  towerComfortBm,
  towerMilestoneRarity,
  towerRecommendedBm,
} from "@/lib/game/tower";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";

function rewardLine(floor: number) {
  const b = towerClearBonus(floor);
  const parts = [
    `+${formatFullDigits(b.gold)} зол.`,
    b.ore > 0 ? `+${formatFullDigits(b.ore)} руды` : null,
    `+${formatFullDigits(b.shards)} осколков`,
  ];
  if (b.sparks > 0) parts.push(`+${b.sparks} искр`);
  if (b.itemRarity) parts.push(RARITY_LABEL[b.itemRarity]);
  if (b.gemRank) parts.push("камень");
  return parts.filter(Boolean).join(" · ");
}

export function TowerPanel() {
  const level = useGameStore((s) => s.character.level);
  const tower = useGameStore((s) => s.tower);
  const dungeon = useGameStore((s) => s.dungeon);
  const enterTower = useGameStore((s) => s.enterTower);
  const leaveDungeon = useGameStore((s) => s.leaveDungeon);
  const derived = useDerivedStats();
  const [msg, setMsg] = useState<string | null>(null);

  const towerState = tower ?? emptyTowerState();
  const floor = towerState.floor;
  const towerRec = towerRecommendedBm(floor);
  const towerComfort = towerComfortBm(floor);
  const towerLocked = level < TOWER_MIN_LEVEL;
  const towerWeak = !towerLocked && derived.powerScore < towerComfort;
  const towerOk = !towerLocked && derived.powerScore >= towerRec;
  const towerBusy = towerState.active || !!dungeon?.active;
  const nextMilestone = Math.ceil(floor / TOWER_MILESTONE) * TOWER_MILESTONE;
  const floors = useMemo(() => {
    const start = Math.max(1, floor - 4);
    const end = floor + 6;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).reverse();
  }, [floor]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="es-plate flex shrink-0 items-start gap-3 p-3">
        <div
          className="es-slot flex h-12 w-12 shrink-0 items-center justify-center"
          style={{ boxShadow: `inset 0 0 0 1px ${TOWER_ACCENT}66` }}
        >
          <TowerControl className="h-5 w-5" style={{ color: TOWER_ACCENT }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] text-white">Башня Испытаний</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 tabular-nums text-white/60">
              ур. {TOWER_MIN_LEVEL}+
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 tabular-nums",
                towerOk
                  ? "border-white/20 bg-white/10 text-white/85"
                  : towerWeak
                    ? "border-[#fb7185]/30 bg-[#fb7185]/10 text-[#fda4af]"
                    : "border-[#e4c36a]/25 bg-[#e4c36a]/10 text-[#f0d78c]",
              )}
            >
              <Zap className="h-3 w-3" />
              БМ {formatFullDigits(towerRec)}
            </span>
            {towerState.bestFloor > 0 ? (
              <span className="rounded border border-white/10 px-1.5 py-0.5 text-white/50">
                рекорд {towerState.bestFloor}
              </span>
            ) : null}
          </div>
        </div>
        {towerState.active ? (
          <button
            type="button"
            onClick={() => setMsg(leaveDungeon().message)}
            className="es-btn es-inv-control shrink-0 px-2.5"
          >
            <DoorOpen className="h-3.5 w-3.5" />
            Выйти
          </button>
        ) : (
          <button
            type="button"
            disabled={towerLocked || towerBusy}
            onClick={() => setMsg(enterTower().message)}
            className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
          >
            {towerState.bestFloor > 0 ? "Продолжить" : "Войти"}
          </button>
        )}
      </div>

      {msg ? <p className="shrink-0 text-[11px] text-white/65">{msg}</p> : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
        <div className="tower-canvas min-h-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-white/8 bg-black/50 px-3 py-2 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: TOWER_ACCENT }}>
              Шпиль · этаж {floor}
            </div>
          </div>
          {floors.map((f) => {
            const current = f === floor;
            const cleared = f < floor;
            const milestone = isTowerMilestone(f);
            const bonus = towerClearBonus(f);
            return (
              <div
                key={f}
                className={cn(
                  "tower-floor-row",
                  current && "is-current",
                  cleared && "is-cleared",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-display text-[13px] tabular-nums",
                    current
                      ? "border-[#fb7185]/50 bg-[#fb7185]/15 text-[#fda4af]"
                      : milestone
                        ? "border-[#e4c36a]/35 bg-[#e4c36a]/10 text-[#f0d78c]"
                        : "border-white/10 bg-black/35 text-white/55",
                  )}
                >
                  {f}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13px] text-white">
                      {milestone ? "Особый этаж" : "Страж"}
                    </span>
                    {current && towerState.active ? (
                      <span className="tower-swords text-[#fda4af]" title="Бой">
                        <Swords className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    {cleared ? (
                      <span className="text-[10px] text-white/35">пройден</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-[#8aa0b4]">
                    {rewardLine(f)}
                  </div>
                </div>
                {milestone ? (
                  <Gem className="h-3.5 w-3.5 shrink-0 text-[#e4c36a]" />
                ) : bonus.ore > 0 ? (
                  <Pickaxe className="h-3.5 w-3.5 shrink-0 text-white/25" />
                ) : (
                  <Coins className="h-3.5 w-3.5 shrink-0 text-white/20" />
                )}
              </div>
            );
          })}
        </div>

        <aside className="es-plate flex flex-col gap-3 p-3">
          <div>
            <div className="es-label mb-1.5">Награда за этаж {floor}</div>
            <RewardBlock floor={floor} />
          </div>
          <div>
            <div className="es-label mb-1.5">Следующая особая · эт. {nextMilestone}</div>
            <RewardBlock floor={nextMilestone} highlight />
          </div>
          {towerWeak ? (
            <p className="text-[11px] text-[#fda4af]">БМ ниже комфортного — страж опасен.</p>
          ) : null}
          <p className="mt-auto text-[10px] leading-snug text-white/35">
            Убил стража — следующий этаж. Смерть оставляет на том же. Каждые {TOWER_MILESTONE}{" "}
            этажей — особая награда.
          </p>
        </aside>
      </div>
    </div>
  );
}

function RewardBlock({ floor, highlight }: { floor: number; highlight?: boolean }) {
  const b = towerClearBonus(floor);
  return (
    <div
      className={cn(
        "es-well space-y-1.5 px-2.5 py-2",
        highlight && "border-[#fb7185]/25",
      )}
    >
      <div className="flex items-center justify-between text-[12px]">
        <span className="inline-flex items-center gap-1 text-[#8aa0b4]">
          <Coins className="h-3 w-3 text-[#e4c36a]" /> Золото
        </span>
        <span className="tabular-nums text-white">+{formatFullDigits(b.gold)}</span>
      </div>
      {b.ore > 0 ? (
        <div className="flex items-center justify-between text-[12px]">
          <span className="inline-flex items-center gap-1 text-[#8aa0b4]">
            <Pickaxe className="h-3 w-3" /> Руда
          </span>
          <span className="tabular-nums text-white">+{formatFullDigits(b.ore)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-[12px]">
        <span className="inline-flex items-center gap-1 text-[#8aa0b4]">
          <Sparkles className="h-3 w-3" /> Осколки
        </span>
        <span className="tabular-nums text-white">+{formatFullDigits(b.shards)}</span>
      </div>
      {b.sparks > 0 ? (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#8aa0b4]">Искры</span>
          <span className="tabular-nums text-[#fda4af]">+{b.sparks}</span>
        </div>
      ) : null}
      {b.itemRarity ? (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#8aa0b4]">Предмет</span>
          <span className="text-white">{RARITY_LABEL[b.itemRarity]}</span>
        </div>
      ) : null}
      {b.gemRank ? (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#8aa0b4]">Камень</span>
          <span className="text-white">{RARITY_LABEL[b.gemRank]}</span>
        </div>
      ) : null}
    </div>
  );
}
