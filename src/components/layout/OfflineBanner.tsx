"use client";

import { formatDuration, formatNumber } from "@/lib/game/formulas";
import { useGameStore } from "@/store/useGameStore";

export function OfflineBanner() {
  const report = useGameStore((s) => s.meta.pendingOffline);
  const dismissOffline = useGameStore((s) => s.dismissOffline);
  if (!report) return null;

  return (
    <div className="es-banner relative z-10 shrink-0 px-6 py-3 max-lg:px-3 max-lg:py-2.5">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 text-sm max-lg:flex-col max-lg:items-stretch max-lg:text-[13px]">
        <p>
          Пока вас не было ({formatDuration(report.seconds)}), шахты принесли{" "}
          <span className="font-display font-semibold text-white">{formatNumber(report.ore)}</span> руды осколков.
        </p>
        <button type="button" onClick={dismissOffline} className="es-btn es-btn-amber px-3 py-1">
          Понятно
        </button>
      </div>
    </div>
  );
}
