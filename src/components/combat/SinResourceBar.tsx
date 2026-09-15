"use client";

import { useGameStore } from "@/store/useGameStore";

function Pips({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="w-10 shrink-0 text-[9px] uppercase tracking-widest text-[#8aa0b4]">{label}</span>
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1"
            style={{
              background: i < value ? color : "rgba(7,9,13,0.9)",
              boxShadow: i < value ? `0 0 6px ${color}40` : "inset 0 1px 2px rgba(0,0,0,0.7)",
            }}
          />
        ))}
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-[#8aa0b4]">
        {Math.round(value)}
      </span>
    </div>
  );
}

export function SinResourceBar() {
  const classId = useGameStore((s) => s.character.classId);
  const sin = useGameStore((s) => s.combat.sin);
  const path = useGameStore((s) => s.sinBuild?.path ?? null);
  if (classId !== "assassin" || !sin) return null;

  const comboMax = path === "blade" ? 6 : 5;
  const poisonMax = path === "venom" ? 16 : 12;
  const shadeMax = path === "phantom" ? 4 : 3;

  return (
    <div className="space-y-1">
      <Pips value={sin.combo} max={comboMax} color="#d7d0cb" label="Комбо" />
      <Pips value={sin.poison} max={Math.min(poisonMax, 16)} color="#b9c4ce" label="Яд" />
      <Pips value={sin.shade} max={shadeMax} color="#cfc9c6" label="Тень" />
    </div>
  );
}
