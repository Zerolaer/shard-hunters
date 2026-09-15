"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import type { LogKind } from "@/lib/game/types";
import { cn } from "@/lib/cn";

const KIND_CLASS: Record<LogKind, string> = {
  hit: "text-white/75",
  crit: "text-amber-300 font-medium",
  skill: "text-violet-300/90",
  heal: "text-emerald-300/90",
  loot: "text-sky-300/90",
  xp: "text-indigo-200/70",
  gold: "text-amber-200/85",
  death: "text-rose-300/90",
  boss: "text-rose-200 font-medium",
  system: "text-[var(--muted)] italic",
  enhance: "text-fuchsia-300/85",
  pvp: "text-orange-300 font-medium",
  miss: "text-white/35",
};

const KIND_MARK: Partial<Record<LogKind, string>> = {
  crit: "✦",
  loot: "◆",
  gold: "◎",
  heal: "+",
  boss: "♛",
  death: "✕",
  xp: "↑",
};

export function CombatLog() {
  const log = useGameStore((s) => s.combat.log);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div
      ref={scroller}
      className="es-well h-full min-h-0 space-y-0.5 overflow-x-hidden overflow-y-auto p-2.5 text-xs leading-5"
    >
      {log.map((e) => {
        const mark = KIND_MARK[e.kind];
        return (
          <div
            key={e.id}
            className={cn(
              "group/log rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/[0.04]",
              KIND_CLASS[e.kind],
            )}
          >
            <span
              className={cn(
                "mr-1.5 inline-block w-3 text-center text-[10px]",
                mark ? "opacity-80" : "text-white/20",
              )}
            >
              {mark ?? "›"}
            </span>
            <span className="group-hover/log:underline group-hover/log:decoration-white/20 group-hover/log:underline-offset-2">
              {e.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
