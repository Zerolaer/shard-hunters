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
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
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
  const derived = useDerivedStats();
  const accent = path ? SIN_PATH_BY_ID[path].accent : "#cfc9c6";
  const hasteDenom = 1 + Math.max(0, derived.skillHaste);

  return (
    <div className="grid h-[52px] min-h-[52px] shrink-0 grid-cols-4 gap-2 overflow-visible max-lg:h-[48px] max-lg:min-h-[48px] max-lg:gap-1.5">
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
        // Veil must use haste-applied CD length — remaining starts at base/(1+haste).
        const appliedCd = Math.max(0.05, cooldown / hasteDenom);
        const remainPct = def && cd > 0 ? Math.min(100, (cd / appliedCd) * 100) : 0;
        const readyPct = remainPct > 0 ? 100 - remainPct : 0;
        const Icon = id && isSinSkillId(id) ? iconForSkill(id) : Sparkles;
        const rank = id && isSinSkillId(id) ? skillPowerRank(sinBuild, id) : 0;
        return (
          <div
            key={i}
            className={cn(
              "es-slot relative h-[52px] min-h-[52px] overflow-hidden px-2 max-lg:h-[48px] max-lg:min-h-[48px] max-lg:px-1.5",
              def && "is-filled",
            )}
          >
            {remainPct > 0 ? (
              <div className="skill-cd" aria-hidden>
                <div className="skill-cd-veil" style={{ height: `${remainPct}%` }} />
                <div className="skill-cd-ready" style={{ height: `${readyPct}%` }} />
              </div>
            ) : null}
            {rank > 0 ? <span className="skill-rank">{rank}</span> : null}
            <div className="relative z-10 flex h-full min-w-0 items-center gap-1.5">
              {def ? (
                <SinGem
                  icon={Icon}
                  kind="skill"
                  accent={accent}
                  size="sm"
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
