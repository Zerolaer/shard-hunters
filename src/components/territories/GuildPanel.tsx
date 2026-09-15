"use client";

import { useMemo, useState } from "react";
import { formatFullDigits, formatNumber, guildXpToNext } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Coins, Landmark, Pickaxe, Trophy, Users } from "lucide-react";
import { HealthBar } from "@/components/combat/HealthBar";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

export function GuildPanel() {
  const guild = useGameStore((s) => s.guild);
  const donateToGuild = useGameStore((s) => s.donateToGuild);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const name = useGameStore((s) => s.character.name);
  const derived = useDerivedStats();
  const [goldAmt, setGoldAmt] = useState(50);
  const [oreAmt, setOreAmt] = useState(10);

  const ranks = useMemo(() => {
    const rows = [
      ...leaderboard.map((n) => ({ id: n.id, name: n.name, guild: n.guild, power: n.power, you: false })),
      { id: "player", name, guild: guild.name, power: derived.powerScore, you: true },
    ];
    return rows.sort((a, b) => b.power - a.power);
  }, [derived.powerScore, guild.name, leaderboard, name]);

  const xpNeed = guildXpToNext(guild.level);
  const members = [...guild.members].sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="flex flex-col gap-4">
      <div className="rp-card p-4">
        <RpHead
          icon={Users}
          title={guild.name}
          meta={`ур. ${guild.level}`}
          action={
            <div className="flex flex-wrap justify-end gap-1.5">
              <RpChip>XP +{((guild.level - 1) * 2).toFixed(0)}%</RpChip>
              <RpChip>дроп +{((guild.level - 1) * 1.5).toFixed(1)}%</RpChip>
            </div>
          }
        />
        <div className="mt-3">
          <HealthBar current={guild.xp} max={xpNeed} label="Прогресс" variant="xp" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <RpChip>
            <Coins className="h-3.5 w-3.5" />
            {formatNumber(guild.treasuryGold)}
          </RpChip>
          <RpChip>
            <Pickaxe className="h-3.5 w-3.5" />
            {formatNumber(guild.treasuryOre)}
          </RpChip>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            value={goldAmt}
            onChange={(e) => setGoldAmt(Number(e.target.value))}
            className="es-input h-11 w-24 px-3 text-sm"
          />
          <button type="button" onClick={() => donateToGuild("gold", goldAmt)} className="es-btn es-btn-amber rp-btn">
            <Coins className="h-3.5 w-3.5" />
            Золото
          </button>
          <input
            type="number"
            min={1}
            value={oreAmt}
            onChange={(e) => setOreAmt(Number(e.target.value))}
            className="es-input h-11 w-24 px-3 text-sm"
          />
          <button type="button" onClick={() => donateToGuild("ore", oreAmt)} className="es-btn es-btn-cyan rp-btn">
            <Pickaxe className="h-3.5 w-3.5" />
            Руда
          </button>
        </div>
      </div>

      <div className="rp-card p-4">
        <RpHead icon={Landmark} title="Вклад" />
        <ul className="mt-3 space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="rp-inset flex items-center justify-between px-3 py-2.5 text-[13px]">
              <span className={m.isPlayer ? "text-amber" : "text-[#d7e2ec]"}>
                {m.name}
                {m.isPlayer ? " (вы)" : ""}
              </span>
              <span className="font-mono text-[#8aa0b4]">{formatNumber(m.contribution)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rp-card p-4">
        <RpHead icon={Trophy} title="Лидерборд" meta="по боевой мощи" />
        <ol className="mt-3 space-y-1.5">
          {ranks.map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center justify-between px-3 py-2.5 text-[13px] ${
                r.you ? "rp-inset text-amber" : "rp-inset text-[#d7e2ec]"
              }`}
            >
              <span className="min-w-0 truncate">
                <span className="mr-2.5 font-mono text-[#8aa0b4]">#{i + 1}</span>
                {r.name}
                <span className="ml-1.5 text-[#6a7c8c]">{r.guild}</span>
              </span>
              <span className="ml-3 shrink-0 font-mono">{formatFullDigits(r.power)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
