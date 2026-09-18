"use client";

import { BM_FIT_LABEL, bmFit, expectedBm } from "@/lib/game/balance";
import { MINES } from "@/lib/game/constants";
import { formatFullDigits } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore, useOreRate } from "@/store/useGameStore";
import { Pickaxe, Users } from "lucide-react";
import { cn } from "@/lib/cn";

export function MinesPanel() {
  const mines = useGameStore((s) => s.mines);
  const level = useGameStore((s) => s.character.level);
  const claimMine = useGameStore((s) => s.claimMine);
  const leaveMine = useGameStore((s) => s.leaveMine);
  const rate = useOreRate();
  const derived = useDerivedStats();

  return (
    <div className="flex flex-col gap-3">
      <div className="es-plate flex items-center gap-3 p-3">
        <div className="es-slot flex h-11 w-11 items-center justify-center">
          <Pickaxe className="h-5 w-5 text-[#e4c36a]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] text-white">Шахты</div>
          <p className="text-[11px] text-[#8aa0b4]">AFK-добыча руды</p>
        </div>
        <span className="rounded-md border border-[#e4c36a]/30 bg-[#e4c36a]/10 px-2.5 py-1.5 font-mono text-[12px] text-[#f0d78c]">
          {rate.toFixed(1)}/с
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MINES.map((def) => {
          const mine = mines[def.id];
          const occupants = (mine?.occupants ?? []).filter((o) => o.isPlayer);
          const locked = level < def.minLevel;
          const needBm = expectedBm(def.bmLevel ?? def.minLevel);
          const fit = bmFit(derived.powerScore, needBm);
          const hasPlayer = occupants.some((o) => o.isPlayer);
          const free = occupants.length < def.slots;

          return (
            <div
              key={def.id}
              className={cn(
                "overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c]",
                hasPlayer && "border-white/20",
                locked && "opacity-50",
              )}
            >
              <div
                className="relative h-28 w-full"
                style={{
                  background: `linear-gradient(145deg, ${def.accent}55 0%, #121214 55%, #0a0a0c 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
                <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-black/40">
                  <Pickaxe className="h-4 w-4" style={{ color: def.accent }} />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
                  <div className="font-display text-[16px] text-white">{def.name}</div>
                </div>
              </div>

              <div className="space-y-3 p-3">
                <p className="text-[11px] text-[#8aa0b4]">{def.blurb}</p>
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/35">Режим:</div>
                <div className="grid grid-cols-1 gap-1.5">
                  <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-white">Добыча</span>
                      <span className="text-[10px] tabular-nums text-[#e4c36a]">+{def.orePerSec}/с</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#8aa0b4]">
                      ур. {def.minLevel}+ · {formatFullDigits(needBm)} БМ · {BM_FIT_LABEL[fit]}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#8aa0b4]">
                  <Users className="h-3.5 w-3.5" />
                  {occupants.length}/{def.slots} слотов
                </div>
                {hasPlayer ? (
                  <button
                    type="button"
            onClick={() => leaveMine()}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] text-[13px] font-medium text-white transition hover:bg-white/[0.1]"
          >
            Покинуть
          </button>
                ) : (
                  <button
                    type="button"
                    disabled={locked || !free || derived.powerScore < needBm}
                    onClick={() => claimMine(def.id)}
                    className="h-11 w-full rounded-xl bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {locked ? `Ур. ${def.minLevel}+` : "Начать добычу"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
