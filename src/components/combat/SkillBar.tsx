"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { SKILL_BY_ID } from "@/lib/game/constants";
import {
  iconForSkill,
  isSinSkillId,
  isSinSkillUnlocked,
  resolveSinOpts,
  resolveSinSkill,
  SIN_PATH_BY_ID,
  skillPowerRank,
} from "@/lib/game/sin";
import { isSkillUnlocked } from "@/lib/game/talents";
import { useGameStore } from "@/store/useGameStore";
import { SinGem } from "@/components/character/sin/SinGem";

export function SkillBar() {
  const hotbar = useGameStore((s) => s.combat.hotbar);
  const skillCd = useGameStore((s) => s.combat.skillCd);
  const ranks = useGameStore((s) => s.talents.ranks);
  const classId = useGameStore((s) => s.character.classId);
  const path = useGameStore((s) => s.sinBuild?.path ?? null);
  const arts = useGameStore((s) => s.sinBuild?.arts ?? {});
  const sinRanks = useGameStore((s) => s.sinBuild?.ranks ?? {});
  const sinBuild = useGameStore((s) => s.sinBuild);
  const accent = path ? SIN_PATH_BY_ID[path].accent : "#cfc9c6";

  return (
    <div className="grid h-[52px] min-h-[52px] shrink-0 grid-cols-4 gap-2 overflow-visible">
      {hotbar.map((id, i) => {
        const sin =
          id && isSinSkillId(id)
            ? resolveSinSkill(id, path, arts[id], hotbar, resolveSinOpts(sinBuild, id))
            : null;
        const def = sin ?? (id ? SKILL_BY_ID[id] : null);
        const cd = id ? (skillCd[id] ?? 0) : 0;
        const locked = id
          ? classId === "assassin"
            ? !(isSinSkillId(id) && isSinSkillUnlocked(sinRanks, id))
            : !isSkillUnlocked(ranks, id)
          : false;
        const cooldown = def && "cooldown" in def ? def.cooldown : 1;
        const pct = def && cd > 0 ? (cd / cooldown) * 100 : 0;
        const link = i < 3 && hotbar[i] && hotbar[i + 1];
        const Icon = id && isSinSkillId(id) ? iconForSkill(id) : Sparkles;
        return (
          <div
            key={i}
            className={cn("es-slot relative h-[52px] min-h-[52px] overflow-visible px-2", def && "is-filled")}
          >
            {link ? <span className="skill-link" aria-hidden /> : null}
            {pct > 0 ? (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                <div className="absolute inset-x-0 bottom-0 bg-[#07090d]/80" style={{ height: `${pct}%` }} />
              </div>
            ) : null}
            <div className="relative z-10 flex h-full min-w-0 items-center gap-1.5">
              {def ? (
                <SinGem
                  icon={Icon}
                  kind="skill"
                  accent={accent}
                  size="sm"
                  rank={id && isSinSkillId(id) ? skillPowerRank(sinBuild, id) || undefined : undefined}
                  owned={!locked}
                  locked={locked}
                />
              ) : (
                <span className="font-mono text-[10px] text-[#6a7c8c]">Q{i + 1}</span>
              )}
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium leading-4 text-white">
                  {def ? def.name : "Пусто"}
                </div>
                <div className="truncate text-[10px] leading-3 text-[#8aa0b4]">
                  {locked ? "Нет в билде" : cd > 0 ? `${cd.toFixed(1)}с` : def ? "Готов" : "Слот"}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
