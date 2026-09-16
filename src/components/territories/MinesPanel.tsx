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
          <div className="font-display text-[15px] text-white">Шахты эссенции</div>
          <p className="text-[11px] text-[#8aa0b4]">AFK-добыча руды · вытесняйте слабых</p>
        </div>
        <span className="rounded-md border border-[#e4c36a]/30 bg-[#e4c36a]/10 px-2.5 py-1.5 font-mono text-[12px] text-[#f0d78c]">
          {rate.toFixed(1)}/с
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {MINES.map((def) => {
          const mine = mines[def.id];
          const occupants = mine?.occupants ?? [];
          const locked = level < def.minLevel;
          const needBm = expectedBm(def.bmLevel ?? def.minLevel);
          const weakBm = derived.powerScore < needBm;
          const fit = bmFit(derived.powerScore, needBm);
          const hasPlayer = occupants.some((o) => o.isPlayer);
          const free = occupants.length < def.slots;
          const weakest = [...occupants]
            .filter((o) => !o.isPlayer)
            .sort((a, b) => a.power - b.power)[0];

          return (
            <div
              key={def.id}
              className={cn("mine-shaft p-3", hasPlayer && "is-active", locked && "opacity-50")}
              style={{ ["--mine-accent" as string]: `${def.accent}55` }}
            >
              <div className="mine-shaft-tex" />
              <div className="relative z-[1]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pickaxe className="h-4 w-4 shrink-0" style={{ color: def.accent }} />
                      <span className="font-display text-[15px] text-white">{def.name}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8aa0b4]">{def.blurb}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-white/50">
                      <span className="rounded border border-white/10 px-1.5 py-0.5">
                        ур. {def.minLevel}+
                      </span>
                      <span className="rounded border border-white/10 px-1.5 py-0.5 tabular-nums">
                        {formatFullDigits(needBm)} БМ · {BM_FIT_LABEL[fit]}
                      </span>
                      <span className="rounded border border-white/10 px-1.5 py-0.5 tabular-nums text-[#e4c36a]/90">
                        +{def.orePerSec}/с
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-white/35" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: def.slots }, (_, i) => {
                      const o = occupants[i];
                      return (
                        <span
                          key={i}
                          className={cn(
                            "mine-slot-pip",
                            o && "is-filled",
                            o?.isPlayer && "is-player",
                          )}
                          title={o ? `${o.name} · ${formatFullDigits(o.power)} БМ` : "Свободно"}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] tabular-nums text-white/40">
                    {occupants.length}/{def.slots}
                  </span>
                </div>

                <ul className="mt-2 space-y-1">
                  {occupants.map((o) => (
                    <li
                      key={o.id}
                      className="es-well flex items-center justify-between px-2.5 py-1.5 text-[12px]"
                    >
                      <span className={o.isPlayer ? "text-[#e4c36a]" : "text-[#d7e2ec]"}>
                        {o.name}
                        <span className="ml-1.5 text-[#8aa0b4]">· {o.guild}</span>
                      </span>
                      <span className="font-mono text-[#8aa0b4]">
                        {formatFullDigits(o.power)} БМ
                      </span>
                    </li>
                  ))}
                  {occupants.length === 0 ? (
                    <li className="px-1 text-[12px] text-[#6a7c8c]">Пусто</li>
                  ) : null}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  {hasPlayer ? (
                    <button type="button" onClick={leaveMine} className="es-btn h-9 px-3">
                      Покинуть
                    </button>
                  ) : locked ? (
                    <span className="text-[12px] text-[#6a7c8c]">Нужен {def.minLevel} ур.</span>
                  ) : weakBm ? (
                    <span className="text-[12px] text-[#ff8a8e]">
                      Нужно {formatFullDigits(needBm)} БМ
                    </span>
                  ) : (
                    <>
                      {free ? (
                        <button
                          type="button"
                          onClick={() => claimMine(def.id)}
                          className="es-btn es-btn-cyan h-9 px-3"
                        >
                          Занять место
                        </button>
                      ) : null}
                      {!free && weakest ? (
                        <button
                          type="button"
                          disabled={derived.powerScore <= weakest.power}
                          onClick={() => claimMine(def.id, weakest.id)}
                          className="es-btn es-btn-amber h-9 px-3"
                        >
                          Вытеснить {weakest.name}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
