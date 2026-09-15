"use client";

import { BM_FIT_LABEL, bmFit, expectedBm } from "@/lib/game/balance";
import { MINES } from "@/lib/game/constants";
import { formatFullDigits } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore, useOreRate } from "@/store/useGameStore";
import { Pickaxe } from "lucide-react";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

export function MinesPanel() {
  const mines = useGameStore((s) => s.mines);
  const level = useGameStore((s) => s.character.level);
  const claimMine = useGameStore((s) => s.claimMine);
  const leaveMine = useGameStore((s) => s.leaveMine);
  const rate = useOreRate();
  const derived = useDerivedStats();

  return (
    <div className="flex flex-col gap-4">
      <div className="rp-card p-4">
        <RpHead
          icon={Pickaxe}
          title="Шахты эссенции"
          action={<RpChip className="font-mono text-[#fbbf24]">AFK {rate.toFixed(1)}/с</RpChip>}
        />
      </div>

      {MINES.map((def) => {
        const mine = mines[def.id];
        const occupants = mine?.occupants ?? [];
        const locked = level < def.minLevel;
        const needBm = expectedBm(def.bmLevel ?? def.minLevel);
        const weakBm = derived.powerScore < needBm;
        const fit = bmFit(derived.powerScore, needBm);
        const hasPlayer = occupants.some((o) => o.isPlayer);
        const free = occupants.length < def.slots;
        const weakest = [...occupants].filter((o) => !o.isPlayer).sort((a, b) => a.power - b.power)[0];
        return (
          <div key={def.id} className="rp-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rp-icon" style={{ color: def.accent }}>
                  <Pickaxe className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-display text-[15px] font-semibold text-white">{def.name}</div>
                  <div className="mt-0.5 text-[11px] text-[#8aa0b4]">
                    {def.blurb}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#8aa0b4]">
                    {occupants.length}/{def.slots} мест · ур. {def.minLevel}+ · {formatFullDigits(needBm)} БМ · {BM_FIT_LABEL[fit]}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[13px] text-amber">+{def.orePerSec}/с</div>
            </div>

            <ul className="mt-3 space-y-1.5">
              {occupants.map((o) => (
                <li key={o.id} className="rp-inset flex items-center justify-between px-3 py-2 text-[13px]">
                  <span className={o.isPlayer ? "text-amber" : "text-[#d7e2ec]"}>
                    {o.name}
                    <span className="ml-1.5 text-[#8aa0b4]">· {o.guild}</span>
                  </span>
                  <span className="font-mono text-[#8aa0b4]">{formatFullDigits(o.power)} БМ</span>
                </li>
              ))}
              {occupants.length === 0 && <li className="px-1 text-[12px] text-[#6a7c8c]">Пусто</li>}
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              {hasPlayer ? (
                <button type="button" onClick={leaveMine} className="es-btn rp-btn">
                  Покинуть
                </button>
              ) : locked ? (
                <span className="text-[12px] text-[#6a7c8c]">Нужен {def.minLevel} ур.</span>
              ) : weakBm ? (
                <span className="text-[12px] text-[#ff8a8e]">Нужно {formatFullDigits(needBm)} БМ</span>
              ) : (
                <>
                  {free && (
                    <button type="button" onClick={() => claimMine(def.id)} className="es-btn es-btn-cyan rp-btn">
                      Занять место
                    </button>
                  )}
                  {!free && weakest && (
                    <button
                      type="button"
                      disabled={derived.powerScore <= weakest.power}
                      onClick={() => claimMine(def.id, weakest.id)}
                      className="es-btn es-btn-amber rp-btn"
                    >
                      Вытеснить {weakest.name}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
