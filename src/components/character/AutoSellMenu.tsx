"use client";

import { useEffect, useRef, useState } from "react";
import { Coins } from "lucide-react";
import { RARITY_COLOR, RARITY_LABEL } from "@/lib/game/constants";
import { RARITIES } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { cn } from "@/lib/cn";

const RARITY_SHORT: Record<(typeof RARITIES)[number], string> = {
  common: "Об",
  uncommon: "Не",
  rare: "Ре",
  epic: "Эп",
  legendary: "Ле",
  mythic: "Ми",
};

export function AutoSellMenu() {
  const autoSell = useGameStore((s) => s.settings.autoSell);
  const autoSellEnabled = useGameStore((s) => s.settings.autoSellEnabled !== false);
  const setAutoSell = useGameStore((s) => s.setAutoSell);
  const setAutoSellEnabled = useGameStore((s) => s.setAutoSellEnabled);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onCount = RARITIES.filter((r) => !!autoSell?.[r]).length;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("es-btn es-inv-control relative h-7 w-7 px-0", autoSellEnabled && "es-btn-cyan")}
        aria-expanded={open}
        title="Автопродажа"
        aria-label="Автопродажа"
      >
        <Coins className="h-3.5 w-3.5" />
        {autoSellEnabled && onCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black/80 px-0.5 text-[8px] font-bold leading-none text-white">
            {onCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="es-popover absolute right-0 z-40 mt-1.5 w-[220px] space-y-2 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/70">Автопродажа</span>
            <button
              type="button"
              onClick={() => setAutoSellEnabled(!autoSellEnabled)}
              className={cn("es-btn es-inv-control px-2.5", autoSellEnabled && "es-btn-cyan")}
              aria-pressed={autoSellEnabled}
            >
              {autoSellEnabled ? "Вкл" : "Выкл"}
            </button>
          </div>
          <div className={cn("flex flex-wrap gap-1", !autoSellEnabled && "pointer-events-none opacity-40")}>
            {RARITIES.map((r) => {
              const on = !!autoSell?.[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAutoSell(r, !on)}
                  disabled={!autoSellEnabled}
                  className={cn("es-rarity-toggle", on && "is-on")}
                  style={{
                    color: RARITY_COLOR[r],
                    borderColor: on ? RARITY_COLOR[r] : undefined,
                  }}
                  title={RARITY_LABEL[r]}
                  aria-pressed={on}
                >
                  {RARITY_SHORT[r]}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] leading-snug text-[#6a7c8c]">
            {autoSellEnabled
              ? `Продаётся сразу: ${onCount} грейд(ов).`
              : "Выкл: дроп остаётся в сумке."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
