"use client";

import { useEffect, useState } from "react";
import { Crown, DoorOpen, Eye, EyeOff, List, Swords, Timer, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { expectedBm } from "@/lib/game/balance";
import {
  KILLS_FOR_BOSS,
  LOCATION_BY_ID,
  locationRecommendedBm,
} from "@/lib/game/constants";
import {
  DUNGEON_TYPE_LABEL,
  dungeonRemainingMs,
  formatDungeonCountdown,
  isDungeonLocationId,
} from "@/lib/game/dungeons";
import { formatFullDigits } from "@/lib/game/formulas";
import { FARM_SPOT_BY_ID } from "@/lib/game/spots";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { hydrateCombatLogPref, useUiStore } from "@/store/useUiStore";
import { LevelBadge } from "@/components/layout/LevelBadge";
import { CombatLog } from "./CombatLog";
import { EffectPills } from "./EffectPills";
import { HealthBar } from "./HealthBar";
import { MonsterVisual } from "./MonsterVisual";
import { SkillBar } from "./SkillBar";
import { SinResourceBar } from "./SinResourceBar";

export function CombatPanel() {
  const character = useGameStore((s) => s.character);
  const monster = useGameStore((s) => s.combat.monster);
  const locationId = useGameStore((s) => s.combat.locationId);
  const spotId = useGameStore((s) => s.combat.spotId);
  const texts = useGameStore((s) => s.combat.floatingTexts);
  const playerHit = useGameStore((s) => s.combat.playerHitFlash);
  const hitFlash = useGameStore((s) => s.combat.hitFlash);
  const playerEffects = useGameStore((s) => s.combat.playerEffects ?? []);
  const monsterEffects = useGameStore((s) => s.combat.monsterEffects ?? []);
  const prog = useGameStore((s) => s.progression.locations[s.combat.locationId]);
  const dungeon = useGameStore((s) => s.dungeon);
  const challengeBoss = useGameStore((s) => s.challengeBoss);
  const leaveDungeon = useGameStore((s) => s.leaveDungeon);
  const autoBattle = useGameStore((s) => s.settings.autoBattle);
  const toggleAutoBattle = useGameStore((s) => s.toggleAutoBattle);
  const mode = useGameStore((s) => s.combat.mode);
  const showCombatLog = useUiStore((s) => s.showCombatLog);
  const toggleCombatLog = useUiStore((s) => s.toggleCombatLog);
  const derived = useDerivedStats();
  const loc = LOCATION_BY_ID[locationId];
  const spot = FARM_SPOT_BY_ID[spotId];
  const inDungeon = !!dungeon?.active || isDungeonLocationId(locationId);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    hydrateCombatLogPref();
  }, []);

  useEffect(() => {
    if (!dungeon?.active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [dungeon?.active]);

  const floor = prog?.floor ?? 1;
  const bossReady = prog?.bossReady ?? false;
  const showBossCta = !inDungeon && bossReady && !monster?.isBoss && mode !== "pvp";
  const killsToBoss = (prog?.killsOnFloor ?? 0) % KILLS_FOR_BOSS;
  const dense = showCombatLog;
  const enemyHits = texts.filter((t) => !t.isPlayerTarget);
  const playerHits = texts.filter((t) => t.isPlayerTarget);
  const locBm = loc ? locationRecommendedBm(loc) : 0;
  const spotBm = spot?.requiredBm ?? locBm;
  const enemyBm = monster
    ? monster.isPvp
      ? expectedBm(monster.level)
      : Math.round(spotBm * (monster.isBoss ? 1.55 : 1))
    : 0;
  const dungeonRemain = dungeonRemainingMs(dungeon?.active, now);

  return (
    <section className="es-frame flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden p-4">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-white/[0.08] pb-3">
        <div className="flex h-10 items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-[15px] font-medium tracking-tight text-white">
              {loc?.name ?? "Локация"}
              {inDungeon ? (
                <span className="ml-2 font-sans text-xs font-normal text-[var(--accent)]">
                  Подземелье
                  {dungeon?.active ? ` · ${DUNGEON_TYPE_LABEL[dungeon.active.type]}` : ""}
                </span>
              ) : (
                <span className="ml-2 font-sans text-xs font-normal text-[var(--muted)]">
                  Этаж {floor}
                </span>
              )}
              {mode === "pvp" ? (
                <span className="ml-2 font-sans text-xs font-normal text-white/70">PvP</span>
              ) : null}
            </h2>
            {mode !== "pvp" ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/40">
                {spot ? <span className="truncate">{spot.name}</span> : null}
                <span className="inline-flex items-center gap-0.5 tabular-nums text-white/55">
                  <Zap className="h-2.5 w-2.5" />
                  спот {formatFullDigits(spotBm)} БМ
                </span>
                {loc ? (
                  <span className="tabular-nums">зона ~{formatFullDigits(locBm)} БМ</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex h-8 shrink-0 items-center gap-1.5">
            <div className="w-[5.5rem]">
              {showBossCta ? (
                <button
                  type="button"
                  onClick={challengeBoss}
                  className="es-btn es-btn-boss h-8 w-full px-2.5 text-xs font-medium"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Босс
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleAutoBattle}
              className={cn(
                "es-btn h-8 px-2.5 text-xs font-medium",
                autoBattle ? "es-btn-amber battle-pulse" : "",
              )}
              aria-pressed={autoBattle}
              aria-label={autoBattle ? "Авто-бой включён" : "Авто-бой выключен"}
              title={autoBattle ? "Авто-бой включён" : "Авто-бой выключен"}
            >
              <Swords className="h-3.5 w-3.5" />
              Авто
            </button>
          </div>
        </div>

        {inDungeon && dungeon?.active ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-1 text-[11px] tabular-nums text-[var(--accent)]">
              <Timer className="h-3.5 w-3.5" />
              {formatDungeonCountdown(dungeonRemain)}
            </span>
            <button
              type="button"
              onClick={() => leaveDungeon()}
              className="es-btn es-inv-control h-7 px-2 text-[10px]"
              title="Ранний выход тратит ежедневный вход"
            >
              <DoorOpen className="h-3.5 w-3.5" />
              Выйти
            </button>
          </div>
        ) : mode !== "pvp" ? (
          <div className="flex items-center gap-2">
            <div className="h-1 min-w-0 flex-1 max-w-[180px] overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  bossReady ? "bg-rose-400" : "bg-white/40",
                )}
                style={{
                  width: bossReady ? "100%" : `${(killsToBoss / KILLS_FOR_BOSS) * 100}%`,
                }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-white/40">
              {bossReady ? "босс готов" : `${killsToBoss}/${KILLS_FOR_BOSS} до босса`}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div
          className={cn(
            "combat-side combat-side-enemy flex flex-col",
            dense ? "min-h-0 flex-1 gap-2 p-2.5" : "min-h-0 flex-1 gap-2.5 p-3",
            !dense && hitFlash > 0 && "monster-hit",
            monster?.isPvp ? "is-pvp" : monster?.isBoss ? "is-boss" : "is-mob",
          )}
        >
          {monster ? (
            <>
              <div className={cn("flex min-w-0 items-center", dense ? "gap-3" : "gap-2.5")}>
                <MonsterVisual compact />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate font-display font-medium tracking-tight text-white",
                      dense ? "text-base" : "text-lg",
                    )}
                  >
                    {monster.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {monster.isBoss && !monster.isPvp ? (
                      <span className="rounded-sm border border-[#e4c36a]/40 bg-[#e4c36a]/12 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#f0d78c]">
                        Фаза босса
                      </span>
                    ) : null}
                    <span className="truncate text-xs text-[var(--muted)]">
                      Ур. {monster.level}
                      {monster.isPvp ? " · охотник" : monster.isBoss ? " · босс" : ""}
                      <span className="ml-1.5 inline-flex items-center gap-0.5 tabular-nums text-white/45">
                        <Zap className="h-2.5 w-2.5" />
                        ~{formatFullDigits(enemyBm)} БМ
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <HealthBar
                current={monster.hp}
                max={monster.maxHp}
                label={dense ? undefined : "HP"}
                variant="enemy"
                floaters={enemyHits}
              />
              <EffectPills effects={monsterEffects} kind="debuff" dense={dense} />
            </>
          ) : (
            <div className="py-2 text-sm text-[#6a7c8c]">Нет цели</div>
          )}
        </div>

        <div
          className={cn(
            "combat-side combat-side-player flex flex-col",
            dense ? "min-h-0 flex-1 gap-2 p-2.5" : "min-h-0 flex-1 gap-2.5 p-3",
            playerHit > 0 && "player-hit",
          )}
        >
          <div className={cn("flex min-w-0 items-center", dense ? "gap-3" : "gap-2.5")}>
            <LevelBadge level={character.level} shape="circle" size="md" />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate font-display font-medium tracking-tight text-white",
                  dense ? "text-base" : "text-lg",
                )}
              >
                {character.name}
              </div>
              <div className="truncate text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-[var(--accent)]/85">
                  <Zap className="h-2.5 w-2.5" />
                  БМ {formatFullDigits(derived.powerScore)}
                </span>
              </div>
            </div>
          </div>
          <HealthBar
            current={character.hp}
            max={derived.maxHp}
            label={dense ? undefined : "HP"}
            variant="player"
            floaters={playerHits}
          />
          <EffectPills effects={playerEffects} kind="buff" dense={dense} />
          <SinResourceBar />
        </div>
      </div>

      <SkillBar />

      <div className={cn("flex min-h-0 flex-col", dense ? "min-h-[6rem] flex-[0.62]" : "shrink-0")}>
        <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <List className="h-3.5 w-3.5" />
            Журнал
          </div>
          <button
            type="button"
            onClick={toggleCombatLog}
            className="es-btn h-8 w-8 p-0"
            title={dense ? "Скрыть журнал" : "Показать журнал"}
            aria-pressed={dense}
            aria-label={dense ? "Скрыть журнал" : "Показать журнал"}
          >
            {dense ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {dense ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <CombatLog />
          </div>
        ) : null}
      </div>
    </section>
  );
}
