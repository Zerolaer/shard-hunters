"use client";

import { formatDuration, formatNumber } from "@/lib/game/formulas";
import { useGameStore } from "@/store/useGameStore";

export function OfflineBanner() {
  const report = useGameStore((s) => s.meta.pendingOffline);
  const dismissOffline = useGameStore((s) => s.dismissOffline);
  if (!report) return null;

  const kills = report.kills ?? 0;
  const xp = report.xp ?? 0;
  const gold = report.gold ?? 0;
  const levels = report.levels ?? 0;
  const farmed = kills > 0 || xp > 0 || gold > 0;
  const bits: string[] = [];
  if (kills > 0) bits.push(`${formatNumber(kills)} убийств`);
  if (xp > 0) bits.push(`+${formatNumber(xp)} XP`);
  if (gold > 0) bits.push(`+${formatNumber(gold)} золота`);
  if (report.ore > 0) bits.push(`+${formatNumber(report.ore)} руды осколков`);
  if (levels > 0) bits.push(`+${levels} ур.`);
  const loot = bits.length
    ? `${farmed ? "авто-фарм принёс" : "шахты принесли"} ${bits.join(", ")}.`
    : "мир продолжал идти.";

  return (
    <div className="es-banner relative z-10 shrink-0 px-6 py-3 max-lg:px-3 max-lg:py-2.5">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 text-sm max-lg:flex-col max-lg:items-stretch max-lg:text-[13px]">
        <p>
          Пока вас не было ({formatDuration(report.seconds)}), {loot}
          {report.died ? " Авто-бой остановился: вы пали." : ""}
        </p>
        <button type="button" onClick={dismissOffline} className="es-btn es-btn-amber px-3 py-1">
          Понятно
        </button>
      </div>
    </div>
  );
}
