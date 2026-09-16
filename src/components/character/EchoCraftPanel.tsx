"use client";

import { useState } from "react";
import { Anvil, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { RARITY_COLOR, RARITY_LABEL } from "@/lib/game/constants";
import {
  countEchoShards,
  ECHO_CHESTS,
  ECHO_SHARD_PLURAL,
  type EchoChestRarity,
} from "@/lib/game/echoCraft";
import { formatNumber } from "@/lib/game/formulas";
import { useGameStore } from "@/store/useGameStore";

export function EchoCraftPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const level = useGameStore((s) => s.character.level);
  const classId = useGameStore((s) => s.character.classId);
  const craftEchoChest = useGameStore((s) => s.craftEchoChest);
  const shards = countEchoShards(inventory);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRarity, setLastRarity] = useState<EchoChestRarity | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="es-plate flex items-start gap-2.5 p-3">
        <Anvil className="mt-0.5 h-4 w-4 shrink-0 text-[#c084fc]" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] text-white">Сундуки эха</div>
          <p className="mt-0.5 text-[11px] leading-snug text-[#8aa0b4]">
            {ECHO_SHARD_PLURAL} падают с любого врага. Сундук выдаёт случайный предмет{" "}
            <span className="text-white/80">ур. {level}</span>
            {classId ? " с уклоном в ваш класс" : ""}.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-[#c084fc]/30 bg-[#c084fc]/10 px-2 py-1 text-[11px] tabular-nums text-[#e9d5ff]">
          <Sparkles className="h-3 w-3" />
          {formatNumber(shards)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {ECHO_CHESTS.map((chest) => {
          const can = shards >= chest.cost;
          const accent = RARITY_COLOR[chest.rarity];
          return (
            <button
              key={chest.rarity}
              type="button"
              disabled={!can}
              onClick={() => {
                const res = craftEchoChest(chest.rarity);
                setLastRarity(chest.rarity);
                setMessage(res.message);
              }}
              className={cn(
                "es-plate flex items-center gap-3 p-2.5 text-left transition",
                can ? "hover:border-white/20" : "opacity-50",
                lastRarity === chest.rarity && message ? "border-white/20" : "",
              )}
              style={{ borderColor: can ? `${accent}55` : undefined }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
                style={{
                  color: accent,
                  borderColor: `${accent}66`,
                  background: `${accent}18`,
                }}
              >
                <Anvil className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[13px] text-white">{chest.title}</span>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: accent }}>
                    {RARITY_LABEL[chest.rarity]}
                  </span>
                </div>
                <div className="text-[10px] text-[#8aa0b4]">{chest.hint}</div>
              </div>
              <span
                className="shrink-0 text-[11px] font-semibold tabular-nums"
                style={{ color: can ? accent : "#8aa0b4" }}
              >
                {chest.cost}
              </span>
            </button>
          );
        })}
      </div>

      {message ? (
        <p className="text-[11px] leading-snug text-white/75">{message}</p>
      ) : (
        <p className="text-[11px] text-[#8aa0b4]">Соберите осколки в сумке и откройте сундук.</p>
      )}
    </div>
  );
}
