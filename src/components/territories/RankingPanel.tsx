"use client";

import { Trophy, Zap } from "lucide-react";
import { formatFullDigits } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { RpHead } from "@/components/layout/RightChrome";

/** Player-only ranking — world bots removed. */
export function RankingPanel() {
  const character = useGameStore((s) => s.character);
  const guildName = useGameStore((s) => s.guild.name);
  const derived = useDerivedStats();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="es-plate p-3">
        <RpHead
          icon={Trophy}
          title="Рейтинг"
          meta="Пока только вы. Глобальный рейтинг отключён."
        />
      </div>
      <div className="es-plate flex items-center gap-3 border-[var(--accent)]/25 bg-[var(--accent)]/8 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 font-display text-lg text-white">
          1
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[16px] text-white">{character.name}</div>
          <div className="text-[11px] text-[#8aa0b4]">
            ур. {character.level}
            {guildName ? ` · ${guildName}` : " · без гильдии"}
          </div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 font-display text-[15px] tabular-nums text-[var(--accent)]">
            <Zap className="h-3.5 w-3.5" />
            {formatFullDigits(derived.powerScore)}
          </div>
          <div className="text-[10px] text-white/40">БМ</div>
        </div>
      </div>
    </div>
  );
}
