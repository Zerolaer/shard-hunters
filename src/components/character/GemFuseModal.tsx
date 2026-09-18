"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Merge, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  fusionNeed,
  GEM_NAME,
  GEM_RANK_LABEL,
  gemScore,
} from "@/lib/game/gems";
import { GEM_RANK_ACCENT } from "@/lib/game/workshop";
import { formatAffix } from "@/lib/game/formulas";
import { STAT_LABEL } from "@/lib/game/constants";
import type { Gem, GemRank } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";

export function GemFuseModal({
  rank,
  open,
  onClose,
  onDone,
}: {
  rank: GemRank;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const gems = useGameStore((s) => s.gems);
  const fuseGems = useGameStore((s) => s.fuseGems);
  const need = fusionNeed(rank);
  const pool = useMemo(
    () => (gems ?? []).filter((g) => g.rank === rank && !g.blessed).sort((a, b) => gemScore(a) - gemScore(b)),
    [gems, rank],
  );
  const [picked, setPicked] = useState<string[]>([]);

  if (!open || typeof document === "undefined") return null;

  function toggle(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= need) return prev;
      return [...prev, id];
    });
  }

  function selectAllWorst() {
    setPicked(pool.slice(0, need).map((g) => g.id));
  }

  function run() {
    const res = fuseGems(rank, picked.length === need ? picked : undefined);
    onDone(res.message);
    if (res.ok) {
      setPicked([]);
      onClose();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" role="dialog">
      <div className="es-plate flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Merge className="h-4 w-4 text-[#e4c36a]" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[14px] text-white">
              Скрестить · {GEM_RANK_LABEL[rank]}
            </div>
            <p className="text-[11px] text-[#8aa0b4]">
              {rank === "mythic"
                ? `${need} мифических → 1 благнутый камень`
                : `${need} → 1 следующего грейда`}
            </p>
          </div>
          <button type="button" className="es-btn h-8 w-8 p-0" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2">
          <button type="button" className="es-btn es-inv-control h-8 px-2 text-[11px]" onClick={selectAllWorst}>
            Выбрать все (худшие)
          </button>
          <span className="ml-auto text-[11px] tabular-nums text-white/50">
            {picked.length}/{need}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-3">
          {pool.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-white/40">Нет камней этого грейда</p>
          ) : (
            pool.map((gem) => (
              <GemPickRow
                key={gem.id}
                gem={gem}
                selected={picked.includes(gem.id)}
                onToggle={() => toggle(gem.id)}
              />
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            disabled={picked.length !== need && pool.length < need}
            onClick={run}
            className="es-btn es-btn-cyan h-11 w-full"
          >
            <Merge className="h-4 w-4" />
            {picked.length === need ? "Скрестить выбранные" : `Скрестить (${need} худших)`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GemPickRow({
  gem,
  selected,
  onToggle,
}: {
  gem: Gem;
  selected: boolean;
  onToggle: () => void;
}) {
  const accent = GEM_RANK_ACCENT[gem.rank];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left",
        selected ? "border-white/30 bg-white/10" : "border-white/8 bg-black/20 hover:border-white/16",
        gem.blessed && "item-blessed",
      )}
    >
      <span
        className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border"
        style={{ borderColor: accent, background: selected ? accent : "transparent" }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px]" style={{ color: accent }}>
          {GEM_NAME[gem.rank]}
          {gem.blessed ? " · благнутый" : ""}
        </span>
        <span className="text-[10px] text-[#8aa0b4]">
          {gem.affixes
            .map((a) => `${STAT_LABEL[a.stat]} ${formatAffix(a.stat, a.value)}`)
            .join(" · ")}
        </span>
      </span>
    </button>
  );
}
