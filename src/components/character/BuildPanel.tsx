"use client";

import { cn } from "@/lib/cn";
import { SKILLS, SKILL_BY_ID } from "@/lib/game/constants";
import {
  canAllocateTalent,
  respecCost,
  TALENTS,
  TALENT_TREES,
  unlockedSkills,
} from "@/lib/game/talents";
import type { SkillKind } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { Flame, GitBranch, Heart, Moon, RotateCcw, Sparkles, Sword, Wind } from "lucide-react";
import { RpChip, RpHead } from "@/components/layout/RightChrome";
import { BuildPresetBar } from "./BuildPresetBar";
import { SinBuildPanel } from "./SinBuildPanel";

const TREE_ICON = {
  fury: Flame,
  shadow: Moon,
  essence: Sparkles,
} as const;

const KIND_ICON: Record<SkillKind, typeof Sword> = {
  physical: Sword,
  agility: Wind,
  magic: Sparkles,
  heal: Heart,
  buff: Sparkles,
};

export function BuildPanel() {
  const classId = useGameStore((s) => s.character.classId);
  if (classId === "assassin") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <SinBuildPanel />
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-visible p-0.5">
      <GenericBuildPanel />
    </div>
  );
}

function GenericBuildPanel() {
  const ranks = useGameStore((s) => s.talents.ranks);
  const points = useGameStore((s) => s.talents.points);
  const gold = useGameStore((s) => s.resources.gold);
  const level = useGameStore((s) => s.character.level);
  const hotbar = useGameStore((s) => s.combat.hotbar);
  const allocateTalent = useGameStore((s) => s.allocateTalent);
  const respecTalents = useGameStore((s) => s.respecTalents);
  const setHotbar = useGameStore((s) => s.setHotbar);
  const learned = unlockedSkills(ranks);
  const cost = respecCost(level);

  return (
    <div className="flex flex-col gap-4">
      <div className="rp-card space-y-3 p-4">
        <RpHead
          icon={GitBranch}
          title="Дерево билда"
          meta={
            <>
              <span className="font-mono text-[#fbbf24]">{points}</span> очков
              {gold < cost ? ` · на сброс нужно ${cost} зол.` : ` · сброс ${cost} зол.`}
            </>
          }
          action={
            <button type="button" onClick={() => respecTalents()} className="es-btn es-btn-danger rp-btn">
              <RotateCcw className="h-3.5 w-3.5" />
              Сброс
            </button>
          }
        />
        <BuildPresetBar mode="classic" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {TALENT_TREES.map((tree) => {
          const TreeIcon = TREE_ICON[tree.id];
          return (
            <div key={tree.id} className="rp-card p-3.5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rp-icon !h-9 !w-9" style={{ color: tree.accent }}>
                  <TreeIcon className="h-4 w-4" />
                </span>
                <span className="font-display text-[15px] font-semibold" style={{ color: tree.accent }}>
                  {tree.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 15 }).map((_, i) => {
                  const row = Math.floor(i / 3);
                  const col = i % 3;
                  const node = TALENTS.find((n) => n.tree === tree.id && n.row === row && n.col === col);
                  if (!node) return <div key={i} />;
                  const rank = ranks[node.id] ?? 0;
                  const can = canAllocateTalent(ranks, node.id, points);
                  const learnedNode = rank > 0;
                  const onBar = !!node.skillId && hotbar.includes(node.skillId);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      disabled={!can && !learnedNode}
                      onClick={() => can && allocateTalent(node.id)}
                      title={node.description}
                      className={cn(
                        "es-slot relative min-h-[72px] overflow-visible px-2 py-2 text-left",
                        can && "is-selected",
                        !can && !learnedNode && "opacity-40",
                        learnedNode && "ring-1",
                        onBar && "ring-2 ring-[var(--accent)]/70",
                      )}
                      style={
                        learnedNode
                          ? {
                              borderColor: `${tree.accent}99`,
                              boxShadow: onBar
                                ? `0 0 0 1px ${tree.accent}, 0 0 14px ${tree.accent}44`
                                : `inset 0 0 0 1px ${tree.accent}55`,
                            }
                          : undefined
                      }
                    >
                      {onBar ? (
                        <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[8px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                          Q{(hotbar.indexOf(node.skillId!) + 1)}
                        </span>
                      ) : null}
                      <div className="text-[11px] font-medium leading-tight text-white">{node.name}</div>
                      <div className="mt-1.5 font-mono text-[10px] text-[#8aa0b4]">
                        {rank}/{node.maxRank}
                        {node.skillId ? " · акт." : " · пасс."}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rp-card p-4">
        <RpHead icon={Sword} title="Ротация" meta="до 4 слотов · клик ставит или снимает" />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {learned.map((id) => {
            const skill = SKILL_BY_ID[id] ?? SKILLS.find((s) => s.id === id);
            if (!skill) return null;
            const slot = hotbar.indexOf(id);
            const KindIcon = KIND_ICON[skill.kind];
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (slot >= 0) {
                    setHotbar(slot, null);
                    return;
                  }
                  const empty = hotbar.findIndex((x) => x === null);
                  if (empty >= 0) setHotbar(empty, id);
                }}
                className={cn(
                  "rp-card flex items-start gap-3 p-3 text-left transition hover:-translate-y-0.5",
                  slot >= 0 && "border-[var(--accent)]/45 shadow-[0_0_0_1px_rgba(46,229,157,0.25)]",
                )}
              >
                <span
                  className={cn(
                    "rp-icon !h-9 !w-9",
                    slot >= 0 ? "text-[var(--accent)]" : "text-[#c4b5fd]",
                  )}
                >
                  <KindIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <span className="truncate">{skill.name}</span>
                    {slot >= 0 ? <RpChip className="text-[var(--accent)]">Q{slot + 1}</RpChip> : null}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-[#8aa0b4]">
                    {skill.cooldown}с · {skill.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {learned.length === 0 && <p className="mt-3 text-[12px] text-[#8aa0b4]">Возьмите корневой навык в ветке.</p>}
      </div>
    </div>
  );
}
