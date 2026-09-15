"use client";

import { Coins } from "lucide-react";
import { RARITY_COLOR, RARITY_LABEL } from "@/lib/game/constants";
import { RARITIES } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/cn";
import { ItemActionPanel } from "./ItemActionPanel";

const RARITY_SHORT: Record<(typeof RARITIES)[number], string> = {
  common: "Об",
  uncommon: "Не",
  rare: "Ре",
  epic: "Эп",
  legendary: "Ле",
  mythic: "Ми",
};

export function CraftPanel() {
  const autoSell = useGameStore((s) => s.settings.autoSell);
  const autoSellEnabled = useGameStore((s) => s.settings.autoSellEnabled !== false);
  const setAutoSell = useGameStore((s) => s.setAutoSell);
  const setAutoSellEnabled = useGameStore((s) => s.setAutoSellEnabled);

  return (
    <div className="flex flex-col gap-2">
      <div className="es-plate p-2.5" data-item-action-panel>
        <ItemActionPanel />
      </div>

      <div className="es-plate px-2.5 py-2">
        <div className="es-label mb-1.5 flex items-center gap-1.5">
          <Coins className="h-3 w-3 text-[#fbbf24]" /> Автопродажа
          <button
            type="button"
            onClick={() => setAutoSellEnabled(!autoSellEnabled)}
            className={cn(
              "es-btn es-inv-control ml-auto px-2.5",
              autoSellEnabled ? "es-btn-cyan" : "",
            )}
            aria-pressed={autoSellEnabled}
            title={autoSellEnabled ? "Автопродажа включена" : "Автопродажа выключена"}
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
                aria-label={`Автопродажа: ${RARITY_LABEL[r]}`}
              >
                {RARITY_SHORT[r]}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-[#6a7c8c]">
          {autoSellEnabled
            ? "Вкл: добыча выбранных грейдов продаётся сразу."
            : "Выкл: автопродажа не работает, даже если грейды отмечены."}
        </p>
      </div>
    </div>
  );
}
