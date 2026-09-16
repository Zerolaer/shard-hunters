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
    <div className="es-plate overflow-hidden p-0">
      <div className="relative border-b border-white/8 px-4 py-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 30%, rgba(228,195,106,0.18), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(46,229,157,0.08), transparent 50%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="es-slot flex h-14 w-14 shrink-0 items-center justify-center">
            <Anvil className="h-6 w-6 text-[#e4c36a]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[15px] text-white">Кузница эха</div>
            <p className="mt-0.5 text-[11px] text-[#8aa0b4]">
              Сундук → предмет ур. {level}
              {classId ? " · уклон в класс" : ""}
            </p>
          </div>
          <span className="relative inline-flex items-center gap-1 rounded-md border border-[#e4c36a]/30 bg-[#e4c36a]/10 px-2.5 py-1.5 text-[12px] tabular-nums text-[#f0d78c]">
            <Sparkles className="h-3.5 w-3.5" />
            {formatNumber(shards)}
          </span>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2">
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
                "es-well flex items-center gap-3 p-3 text-left transition",
                can ? "hover:border-white/18" : "opacity-45",
                lastRarity === chest.rarity && message ? "border-white/20" : "",
              )}
              style={{ borderColor: can ? `${accent}44` : undefined }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border"
                style={{
                  color: accent,
                  borderColor: `${accent}55`,
                  background: `${accent}14`,
                }}
              >
                <Anvil className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[13px] text-white">{chest.title}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: accent }}>
                  {RARITY_LABEL[chest.rarity]}
                </div>
                <div className="mt-1 text-[11px] tabular-nums text-[#8aa0b4]">
                  {chest.cost} {ECHO_SHARD_PLURAL.toLowerCase()}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {message ? <p className="border-t border-white/8 px-4 py-2.5 text-[11px] text-white/70">{message}</p> : null}
    </div>
  );
}
