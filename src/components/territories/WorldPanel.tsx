"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Castle, MapPin, Pickaxe } from "lucide-react";
import { FarmMap } from "./FarmMap";
import { MinesPanel } from "./MinesPanel";
import { DungeonsPanel } from "./DungeonsPanel";

type WorldSlice = "spots" | "mines" | "dungeons";

export function WorldPanel() {
  const [slice, setSlice] = useState<WorldSlice>("spots");

  return (
    <div className="flex flex-col gap-3">
      <div className="es-plate p-2.5">
        <div className="font-display text-[14px] text-white">Карта мира</div>
        <p className="mt-0.5 text-[11px] text-[#8aa0b4]">
          Споты фарма, шахты, ежедневные залы и Башня.
        </p>
        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-lg border border-white/8 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setSlice("spots")}
            className={cn("es-btn h-9 text-xs", slice === "spots" && "es-btn-amber")}
          >
            <MapPin className="h-4 w-4" />
            Споты
          </button>
          <button
            type="button"
            onClick={() => setSlice("mines")}
            className={cn("es-btn h-9 text-xs", slice === "mines" && "es-btn-cyan")}
          >
            <Pickaxe className="h-4 w-4" />
            Шахты
          </button>
          <button
            type="button"
            onClick={() => setSlice("dungeons")}
            className={cn("es-btn h-9 text-xs", slice === "dungeons" && "es-btn-amber")}
          >
            <Castle className="h-4 w-4" />
            Данжи
          </button>
        </div>
      </div>
      {slice === "spots" ? <FarmMap /> : slice === "mines" ? <MinesPanel /> : <DungeonsPanel />}
    </div>
  );
}
