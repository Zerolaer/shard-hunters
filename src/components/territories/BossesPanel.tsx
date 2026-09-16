"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Coins,
  Crown,
  DoorOpen,
  Gem,
  MapPin,
  Pickaxe,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFullDigits } from "@/lib/game/formulas";
import { RARITY_LABEL } from "@/lib/game/constants";
import {
  activeWorldWindow,
  BOSS_ACCENT,
  BOSS_DEF_BY_ID,
  BOSS_MIN_LEVEL,
  bossClearBonus,
  bossComfortBm,
  bossRecommendedBm,
  canEnterPersonal,
  emptyBossesState,
  FIELD_BOSSES,
  fieldRemainingMs,
  fieldSpawnKey,
  formatBossCountdown,
  hasKilledField,
  hasKilledWorld,
  isFieldSpawnAlive,
  nextFieldSpawnAt,
  nextWorldWindow,
  PERSONAL_BOSSES,
  WORLD_WINDOWS,
  type BossDef,
} from "@/lib/game/bosses";
import type { BossKind } from "@/lib/game/types";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";

type SubTab = BossKind;

function rewardLine(def: BossDef) {
  const b = bossClearBonus(def);
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

export function BossesPanel() {
  const level = useGameStore((s) => s.character.level);
  const bosses = useGameStore((s) => s.bosses);
  const dungeon = useGameStore((s) => s.dungeon);
  const tower = useGameStore((s) => s.tower);
  const enterBoss = useGameStore((s) => s.enterBoss);
  const leaveDungeon = useGameStore((s) => s.leaveDungeon);
  const derived = useDerivedStats();
  const [sub, setSub] = useState<SubTab>("world");
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const state = bosses ?? emptyBossesState();
  const busy = !!state.active || !!dungeon?.active || !!tower?.active;
  const locked = level < BOSS_MIN_LEVEL;
  const world = activeWorldWindow(now);
  const nextWorld = nextWorldWindow(now);
  const fieldAlive = isFieldSpawnAlive(now);
  const fieldKey = fieldSpawnKey(now);
  const fieldRemain = fieldRemainingMs(now);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="es-plate flex shrink-0 items-start gap-3 p-3">
        <div
          className="es-slot flex h-12 w-12 shrink-0 items-center justify-center"
          style={{ boxShadow: `inset 0 0 0 1px ${BOSS_ACCENT}66` }}
        >
          <Crown className="h-5 w-5" style={{ color: BOSS_ACCENT }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] text-white">Боссы</div>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            Мировые · полевые · сюжет. Долгие фазы — без БМ и баффов не пройти.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 tabular-nums text-white/60">
              ур. {BOSS_MIN_LEVEL}+
            </span>
            {state.personalCleared > 0 ? (
              <span className="rounded border border-white/10 px-1.5 py-0.5 text-white/50">
                сюжет {state.personalCleared}/{PERSONAL_BOSSES.length}
              </span>
            ) : null}
          </div>
        </div>
        {state.active ? (
          <button
            type="button"
            onClick={() => setMsg(leaveDungeon().message)}
            className="es-btn es-inv-control shrink-0 px-2.5"
          >
            <DoorOpen className="h-3.5 w-3.5" />
            Выйти
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1">
        {(
          [
            { id: "world" as const, label: "Мировые" },
            { id: "field" as const, label: "Полевые" },
            { id: "personal" as const, label: "Сюжет" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={cn(
              "es-btn flex-1 px-2 py-1.5 text-[11px]",
              sub === t.id && "es-btn-cyan",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg ? <p className="shrink-0 text-[11px] text-white/65">{msg}</p> : null}

      {sub === "world" ? (
        <div className="es-well shrink-0 px-2.5 py-2 text-[11px] text-white/55">
          {world ? (
            <span className="inline-flex items-center gap-1.5 text-[#fbbf24]">
              <Clock className="h-3.5 w-3.5" />
              Окно «{world.window.label}» · осталось {formatBossCountdown(world.remainingMs)}
            </span>
          ) : nextWorld ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Следующее окно «{nextWorld.window.label}» через{" "}
              {formatBossCountdown(nextWorld.at - now)}
            </span>
          ) : (
            "Окна: 08:00 · 14:00 · 20:00 (по 45 мин)"
          )}
        </div>
      ) : null}

      {sub === "field" ? (
        <div className="es-well shrink-0 px-2.5 py-2 text-[11px] text-white/55">
          {fieldAlive ? (
            <span className="inline-flex items-center gap-1.5 text-[#86efac]">
              <MapPin className="h-3.5 w-3.5" />
              Спавн активен · {formatBossCountdown(fieldRemain)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Следующий спавн через {formatBossCountdown(nextFieldSpawnAt(now) - now)}
            </span>
          )}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {sub === "world"
          ? WORLD_WINDOWS.map((w) => {
              const def = BOSS_DEF_BY_ID[w.bossId];
              if (!def) return null;
              const open = world?.window.id === w.id;
              const killed = open && world ? hasKilledWorld(state, world.spawnKey) : false;
              return (
                <BossCard
                  key={w.id}
                  def={def}
                  subtitle={`${w.label} · ${String(w.hour).padStart(2, "0")}:00`}
                  locked={locked || level < def.minLevel}
                  weak={!locked && derived.powerScore < bossComfortBm(def)}
                  ok={!locked && derived.powerScore >= bossRecommendedBm(def)}
                  busy={busy}
                  disabled={!open || killed || locked || busy || level < def.minLevel}
                  status={open ? (killed ? "убит" : "доступен") : "ожидание"}
                  onEnter={() => setMsg(enterBoss("world", def.id).message)}
                  fighting={state.active?.defId === def.id}
                />
              );
            })
          : null}

        {sub === "field"
          ? FIELD_BOSSES.map((def) => {
              const killed = hasKilledField(state, def.id, fieldKey);
              return (
                <BossCard
                  key={def.id}
                  def={def}
                  subtitle={`ур. ${def.minLevel}+`}
                  locked={locked || level < def.minLevel}
                  weak={!locked && derived.powerScore < bossComfortBm(def)}
                  ok={!locked && derived.powerScore >= bossRecommendedBm(def)}
                  busy={busy}
                  disabled={!fieldAlive || killed || locked || busy || level < def.minLevel}
                  status={!fieldAlive ? "ожидание" : killed ? "убит" : "доступен"}
                  onEnter={() => setMsg(enterBoss("field", def.id).message)}
                  fighting={state.active?.defId === def.id}
                />
              );
            })
          : null}

        {sub === "personal"
          ? PERSONAL_BOSSES.map((def) => {
              const ch = def.chapter ?? 1;
              const cleared = state.personalCleared >= ch;
              const current = state.personalIndex === ch;
              const unlocked = canEnterPersonal(state, def);
              return (
                <BossCard
                  key={def.id}
                  def={def}
                  subtitle={`Глава ${ch}`}
                  locked={locked || level < def.minLevel || !unlocked}
                  weak={!locked && derived.powerScore < bossComfortBm(def)}
                  ok={!locked && derived.powerScore >= bossRecommendedBm(def)}
                  busy={busy}
                  disabled={!unlocked || cleared || locked || busy || level < def.minLevel}
                  status={cleared ? "пройден" : current ? "текущий" : unlocked ? "доступен" : "закрыт"}
                  onEnter={() => setMsg(enterBoss("personal", def.id).message)}
                  fighting={state.active?.defId === def.id}
                />
              );
            })
          : null}
      </div>

      <p className="shrink-0 text-[10px] leading-snug text-white/35">
        Боссы бьют сильно и живут долго. Равный БМ — фаза на десятки секунд; ниже комфорта — риск
        смерти без баффов.
      </p>
    </div>
  );
}

function BossCard({
  def,
  subtitle,
  weak,
  ok,
  disabled,
  status,
  onEnter,
  fighting,
}: {
  def: BossDef;
  subtitle: string;
  locked?: boolean;
  weak: boolean;
  ok: boolean;
  busy?: boolean;
  disabled: boolean;
  status: string;
  onEnter: () => void;
  fighting: boolean;
}) {
  const rec = bossRecommendedBm(def);
  const bonus = bossClearBonus(def);
  return (
    <div
      className={cn("es-plate flex flex-col gap-2 p-3", fighting && "border-[#f59e0b]/35")}
      style={{ boxShadow: fighting ? `inset 0 0 0 1px ${def.accent}55` : undefined }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="es-slot flex h-10 w-10 shrink-0 items-center justify-center"
          style={{ boxShadow: `inset 0 0 0 1px ${def.accent}55` }}
        >
          <Swords className="h-4 w-4" style={{ color: def.accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[13px] text-white">{def.name}</span>
            <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/45">
              {status}
            </span>
            {fighting ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#fbbf24]">
                <Swords className="h-3 w-3" /> бой
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[10px] text-[#8aa0b4]">{subtitle}</div>
          <p className="mt-1 text-[11px] leading-snug text-white/50">{def.blurb}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className="es-btn es-btn-cyan es-inv-control shrink-0 px-2.5"
        >
          Атака
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 tabular-nums",
            ok
              ? "border-white/20 bg-white/10 text-white/85"
              : weak
                ? "border-[#fb7185]/30 bg-[#fb7185]/10 text-[#fda4af]"
                : "border-[#e4c36a]/25 bg-[#e4c36a]/10 text-[#f0d78c]",
          )}
        >
          <Zap className="h-3 w-3" />
          БМ {formatFullDigits(rec)}
        </span>
        <span className="inline-flex items-center gap-1 text-white/40">
          <Coins className="h-3 w-3 text-[#e4c36a]" />
          {formatFullDigits(bonus.gold)}
        </span>
        {bonus.ore > 0 ? (
          <span className="inline-flex items-center gap-1 text-white/40">
            <Pickaxe className="h-3 w-3" />
            {formatFullDigits(bonus.ore)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 text-white/40">
          <Sparkles className="h-3 w-3" />
          {formatFullDigits(bonus.shards)}
        </span>
        {bonus.gemRank ? (
          <span className="inline-flex items-center gap-1 text-white/40">
            <Gem className="h-3 w-3 text-[#e4c36a]" />
            {RARITY_LABEL[bonus.gemRank]}
          </span>
        ) : null}
      </div>
      <div className="truncate text-[10px] text-white/35">{rewardLine(def)}</div>
    </div>
  );
}
