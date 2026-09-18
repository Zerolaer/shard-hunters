"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  artEffectLine,
  artPowerRank,
  artRankNextPreview,
  artSupports,
  canAllocateSinNode,
  canRankSinArt,
  detectSinSynergies,
  iconForArt,
  iconForNode,
  iconForPath,
  iconForSkill,
  masteryNextPreview,
  nextSinSpend,
  resolveSinOpts,
  resolveSinSkill,
  SIN_ART_BY_ID,
  SIN_KIND_LABEL,
  SIN_NODES,
  SIN_NODE_BY_ID,
  SIN_PATHS,
  SIN_PATH_BY_ID,
  SIN_RANK_CAP,
  SIN_ROLE_LABEL,
  SIN_SKILL_BY_ID,
  skillPowerRank,
  skillRankNextPreview,
  sinNodeKind,
  unlockedSinArts,
  unlockedSinSkills,
} from "@/lib/game/sin";
import { respecCost } from "@/lib/game/talents";
import type { SinArtId, SinPathId, SinSkillId } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { SinArtHoverTooltip } from "./sin/SinArtTooltip";
import { SinGem } from "./sin/SinGem";
import { SinTreeCanvas } from "./sin/SinTreeCanvas";
import { BuildPresetBar } from "./BuildPresetBar";

const STAT_RU: Record<string, string> = {
  strength: "сила",
  agility: "ловк.",
  intelligence: "инт.",
  endurance: "вын.",
  attack: "атака",
  defense: "защита",
  health: "HP",
  critChance: "крит %",
  critDamage: "крит.ур.",
  skillHaste: "скорость",
  skillDamage: "ур.навыков",
  lifesteal: "вампиризм",
  dropBonus: "дроп",
  xpBonus: "опыт",
  accuracy: "точность",
};

function skillNameUsingArt(
  arts: Record<string, SinArtId | null | undefined>,
  artId: SinArtId,
  except: SinSkillId,
) {
  for (const [sid, a] of Object.entries(arts)) {
    if (a === artId && sid !== except) return SIN_SKILL_BY_ID[sid as SinSkillId]?.name ?? null;
  }
  return null;
}

export function SinBuildPanel() {
  const path = useGameStore((s) => s.sinBuild?.path ?? null);
  const ranks = useGameStore((s) => s.sinBuild?.ranks ?? {});
  const arts = useGameStore((s) => s.sinBuild?.arts ?? {});
  const mastery = useGameStore((s) => s.sinBuild?.mastery ?? 0);
  const sinBuild = useGameStore((s) => s.sinBuild);
  const points = useGameStore((s) => s.talents.points);
  const gold = useGameStore((s) => s.resources.gold);
  const level = useGameStore((s) => s.character.level);
  const hotbar = useGameStore((s) => s.combat.hotbar);
  const chooseSinPath = useGameStore((s) => s.chooseSinPath);
  const allocateSinNode = useGameStore((s) => s.allocateSinNode);
  const rankSinSkill = useGameStore((s) => s.rankSinSkill);
  const rankSinArt = useGameStore((s) => s.rankSinArt);
  const rankSinMastery = useGameStore((s) => s.rankSinMastery);
  const respecTalents = useGameStore((s) => s.respecTalents);
  const setHotbar = useGameStore((s) => s.setHotbar);
  const setSinArt = useGameStore((s) => s.setSinArt);

  const [view, setView] = useState<SinPathId>(path ?? "blade");
  const [selectedId, setSelectedId] = useState<string | null>(path ? SIN_PATH_BY_ID[path].starterNode : null);
  const [armed, setArmed] = useState<number | null>(null);
  const [focusSkill, setFocusSkill] = useState<SinSkillId | null>(null);
  const [inspectArtId, setInspectArtId] = useState<SinArtId | null>(null);
  const [artHover, setArtHover] = useState<{ artId: SinArtId; rect: DOMRect } | null>(null);

  const cost = respecCost(level);
  const learned = unlockedSinSkills(ranks);
  const artIds = unlockedSinArts(ranks);
  const synergies = detectSinSynergies(hotbar, path);
  const pathDef = path ? SIN_PATH_BY_ID[path] : null;
  const viewDef = SIN_PATH_BY_ID[view];
  const node = selectedId ? SIN_NODE_BY_ID[selectedId] : null;
  const inspectSkillId = (focusSkill ?? node?.skillId ?? null) as SinSkillId | null;
  const inspectSkill = inspectSkillId
    ? resolveSinSkill(inspectSkillId, path, arts[inspectSkillId], hotbar, resolveSinOpts(sinBuild, inspectSkillId))
    : null;
  const skillRank = inspectSkillId ? skillPowerRank(sinBuild, inspectSkillId) : 0;
  const spend = nextSinSpend(sinBuild, points, selectedId, inspectSkillId, inspectArtId);

  useEffect(() => {
    setArtHover(null);
    setInspectArtId(null);
  }, [inspectSkillId]);

  const resolvedLearned = useMemo(
    () =>
      learned.map((id) => ({
        id,
        skill: resolveSinSkill(id, path, arts[id], hotbar, resolveSinOpts(sinBuild, id)),
        rank: skillPowerRank(sinBuild, id),
      })),
    [learned, path, arts, hotbar, sinBuild],
  );

  function spendInspected() {
    if (!spend) return;
    if (spend.kind === "tree") allocateSinNode(spend.nodeId);
    else if (spend.kind === "skill") rankSinSkill(spend.id);
    else if (spend.kind === "art") rankSinArt(spend.id);
    else rankSinMastery();
  }

  function spendLabel() {
    if (spend?.kind === "tree" && node) {
      if (points <= 0) return "Нет очков";
      return `Вложить очко  ${(ranks[node.id] ?? 0) + 1}/${node.maxRank}`;
    }
    if (spend?.kind === "skill") {
      const r = skillPowerRank(sinBuild, spend.id);
      const name = spend.id !== inspectSkillId ? `${SIN_SKILL_BY_ID[spend.id]?.name ?? ""} · ` : "";
      return `Ранг ${name}${r} → ${r + 1}`;
    }
    if (spend?.kind === "art") {
      const r = artPowerRank(sinBuild, spend.id);
      return `${SIN_ART_BY_ID[spend.id]?.name ?? "Сокет"} ${r} → ${r + 1}`;
    }
    if (spend?.kind === "mastery") return "Мастерство тени";
    if (node && (ranks[node.id] ?? 0) >= node.maxRank) {
      if (skillRank >= SIN_RANK_CAP) return "Максимум";
      return "Максимум";
    }
    return points <= 0 ? "Нет очков" : "Максимум";
  }

  function spendPreview() {
    if (spend?.kind === "skill") return skillRankNextPreview(skillPowerRank(sinBuild, spend.id));
    if (spend?.kind === "art") return artRankNextPreview(spend.id, artPowerRank(sinBuild, spend.id));
    if (spend?.kind === "mastery") return masteryNextPreview(mastery);
    return null;
  }

  function pickPath(id: SinPathId) {
    chooseSinPath(id);
    setView(id);
    setSelectedId(SIN_PATH_BY_ID[id].starterNode);
    setFocusSkill(null);
  }

  function pickView(id: SinPathId) {
    setView(id);
    setSelectedId(SIN_PATH_BY_ID[id].starterNode);
    setFocusSkill(null);
  }

  function socketSkill(id: SinSkillId) {
    const slot = hotbar.indexOf(id);
    if (armed !== null) {
      if (slot >= 0 && slot !== armed) setHotbar(slot, null);
      setHotbar(armed, id);
      setArmed(null);
      setFocusSkill(id);
      return;
    }
    if (slot >= 0) {
      setHotbar(slot, null);
      return;
    }
    const empty = hotbar.findIndex((x) => x === null);
    if (empty >= 0) setHotbar(empty, id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="rp-card flex shrink-0 items-center gap-3 p-3">
        <div className="flex items-center gap-1.5">
          {SIN_PATHS.map((p) => {
            const chosen = path === p.id;
            const looking = view === p.id;
            return (
              <SinGem
                key={p.id}
                icon={iconForPath(p.id)}
                kind="path"
                accent={p.accent}
                size="sm"
                owned={chosen}
                selected={looking}
                title={chosen ? p.name : path ? `${p.name} · дип` : p.name}
                onClick={() => (path ? pickView(p.id) : pickPath(p.id))}
              />
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm text-white">
            {pathDef ? pathDef.name : "Выберите путь"}
          </div>
        </div>
        <div className="sin-points shrink-0">
          <span className="font-mono text-base leading-none text-white">{points}</span>
          <span>очков</span>
          {mastery > 0 ? <span className="text-[9px] text-[#8aa0b4]">тень {mastery}</span> : null}
        </div>
        <button type="button" onClick={() => respecTalents()} className="es-btn es-btn-danger rp-btn" title={`Сброс пути (${cost} зол., есть ${gold})`}>
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="shrink-0 px-0.5">
        <BuildPresetBar mode="sin" />
      </div>

      {!path ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          {SIN_PATHS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPath(p.id)}
              className="sin-path-card rp-card flex flex-col items-center justify-center gap-3 p-5 text-center"
              style={{ ["--gem" as string]: p.accent }}
            >
              <SinGem icon={iconForPath(p.id)} kind="path" accent={p.accent} size="lg" owned />
              <div>
                <div className="font-display text-base" style={{ color: p.accent }}>
                  {p.name}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-[#8aa0b4]">{p.epithet}</div>
              </div>
              <p className="text-[11px] leading-4 text-[#8aa0b4]">{p.blurb}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(132px,auto)] gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:grid-rows-1">
            <SinTreeCanvas
              view={view}
              accent={viewDef.accent}
              path={path}
              ranks={ranks}
              points={points}
              selectedId={selectedId}
              hotbar={hotbar}
              arts={arts}
              onSelect={(id) => {
                setSelectedId(id);
                setFocusSkill(SIN_NODE_BY_ID[id]?.skillId ?? null);
              }}
              onAllocate={(id) => {
                const res = allocateSinNode(id);
                if (res.ok) return;
                const n = SIN_NODE_BY_ID[id];
                if (n?.skillId) rankSinSkill(n.skillId);
                else if (n?.artId) rankSinArt(n.artId);
              }}
            />
            <aside className="rp-card flex min-h-0 flex-col overflow-visible p-3.5">
              {node || inspectSkill ? (
                <>
                  <div className="flex items-start gap-2">
                    <SinGem
                      icon={node ? iconForNode(node) : iconForSkill(inspectSkillId!)}
                      kind={node ? sinNodeKind(node) : "skill"}
                      accent={node?.keystone && node.path !== path ? "#6b7280" : viewDef.accent}
                      size="md"
                      rank={
                        skillRank > 0
                          ? skillRank
                          : node?.artId && artPowerRank(sinBuild, node.artId) > 0
                            ? artPowerRank(sinBuild, node.artId)
                            : node
                              ? (ranks[node.id] ?? 0)
                              : undefined
                      }
                      maxRank={
                        skillRank > 0 || (node?.artId && artPowerRank(sinBuild, node.artId) > 0)
                          ? undefined
                          : node?.maxRank
                      }
                      owned={node ? (ranks[node.id] ?? 0) > 0 : true}
                      available={node ? canAllocateSinNode(ranks, node.id, points, path) : Boolean(spend)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-widest text-[#6a7c8c]">
                        {node ? SIN_KIND_LABEL[sinNodeKind(node)] : "Навык"}
                        {node && node.path !== path ? " · дип" : ""}
                        {skillRank > 0 ? ` · ранг ${skillRank}/${SIN_RANK_CAP}` : ""}
                        {!skillRank && node?.artId && artPowerRank(sinBuild, node.artId) > 0
                          ? ` · ранг ${artPowerRank(sinBuild, node.artId)}/${SIN_RANK_CAP}`
                          : ""}
                      </div>
                      <div className="font-display text-sm leading-tight text-white">{inspectSkill?.name ?? node?.name}</div>
                    </div>
                  </div>
                  <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-[11px] leading-4 text-[#8aa0b4]">
                    {inspectSkill?.description ?? node?.description}
                  </p>
                  {inspectSkill && (
                    <div className="mt-1 text-[10px] text-[#6a7c8c]">
                      {SIN_ROLE_LABEL[inspectSkill.role]} · {inspectSkill.cooldown.toFixed(1)}с · ×
                      {(inspectSkill.multiplier * inspectSkill.synergyMult).toFixed(2)}
                    </div>
                  )}
                  {node && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-[#8aa0b4]">
                      {Object.entries(node.perRank).map(([k, v]) =>
                        v ? (
                          <span key={k} className="es-chip px-1.5 py-0 text-[9px]">
                            +{v} {STAT_RU[k] ?? k}
                          </span>
                        ) : null,
                      )}
                    </div>
                  )}
                  {node?.keystone && node.path !== path && (
                    <p className="mt-1 text-[10px] text-rose-300/80">Капстоун чужого пути не работает.</p>
                  )}
                  {node && (
                    <>
                      <button
                        type="button"
                        disabled={!spend}
                        onClick={() => spendInspected()}
                        className="es-btn es-btn-cyan rp-btn mt-3 w-full"
                      >
                        {spendLabel()}
                      </button>
                      {spendPreview() ? (
                        <p className="mt-1 text-center text-[9px] leading-3 text-[#3ee0a0]">{spendPreview()}</p>
                      ) : (
                        <p className="mt-1 text-center text-[10px] text-[#6a7c8c]">Двойной клик тоже вкладывает</p>
                      )}
                    </>
                  )}
                  {!node && inspectSkill && (
                    <>
                      <button
                        type="button"
                        disabled={!spend}
                        onClick={() => spendInspected()}
                        className="es-btn es-btn-cyan rp-btn mt-3 w-full"
                      >
                        {spendLabel()}
                      </button>
                      {spendPreview() ? (
                        <p className="mt-1 text-center text-[9px] leading-3 text-[#3ee0a0]">{spendPreview()}</p>
                      ) : null}
                    </>
                  )}
                  {inspectSkillId && learned.includes(inspectSkillId) && (
                    <button
                      type="button"
                      onClick={() => socketSkill(inspectSkillId)}
                      className="es-btn rp-btn mt-2 w-full"
                    >
                      {hotbar.includes(inspectSkillId) ? "Снять с панели" : armed !== null ? `В слот Q${armed + 1}` : "На панель"}
                    </button>
                  )}
                  {inspectSkillId && hotbar.includes(inspectSkillId) && artIds.length > 0 && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <div className="mb-1.5 text-[9px] uppercase tracking-widest text-[#6a7c8c]">Сокет поддержки</div>
                      <div className="flex flex-wrap gap-1.5">
                        {artIds.map((artId) => {
                          const art = SIN_ART_BY_ID[artId];
                          const ok = inspectSkill ? artSupports(art, inspectSkill.tags) : false;
                          const on = arts[inspectSkillId] === artId;
                          const occupiedId = Object.entries(arts).find(
                            ([sid, a]) => a === artId && sid !== inspectSkillId,
                          )?.[0] as SinSkillId | undefined;
                          const usedElse = Boolean(occupiedId);
                          const aRank = artPowerRank(sinBuild, artId);
                          const selectedArt = inspectArtId === artId || on;
                          const canPlus = canRankSinArt(sinBuild, points, artId);
                          return (
                            <div key={artId} className="relative">
                              <SinGem
                                icon={iconForArt(artId)}
                                kind="art"
                                accent={viewDef.accent}
                                size="sm"
                                rank={aRank > 0 ? aRank : undefined}
                                selected={selectedArt}
                                owned={on}
                                locked={!ok || (usedElse && !on)}
                                ariaLabel={art.name}
                                onHoverAnchor={(rect) => {
                                  if (!rect) {
                                    setArtHover((cur) => (cur?.artId === artId ? null : cur));
                                    return;
                                  }
                                  setArtHover({ artId, rect });
                                }}
                                onClick={() => {
                                  setInspectArtId(artId);
                                  if (!ok) return;
                                  setSinArt(inspectSkillId, on ? null : (artId as SinArtId));
                                }}
                              />
                              {selectedArt && canPlus && (
                                <button
                                  type="button"
                                  className="sin-gem-plus"
                                  title={`Ранг ${aRank} → ${aRank + 1}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rankSinArt(artId);
                                  }}
                                >
                                  +
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {artHover && inspectSkillId && (
                        <SinArtHoverTooltip
                          art={SIN_ART_BY_ID[artHover.artId]}
                          compatible={
                            inspectSkill
                              ? artSupports(SIN_ART_BY_ID[artHover.artId], inspectSkill.tags)
                              : false
                          }
                          occupiedOn={skillNameUsingArt(arts, artHover.artId, inspectSkillId)}
                          equipped={arts[inspectSkillId] === artHover.artId}
                          accent={viewDef.accent}
                          anchor={artHover.rect}
                          rank={artPowerRank(sinBuild, artHover.artId)}
                          nextPreview={
                            canRankSinArt(sinBuild, points, artHover.artId)
                              ? artRankNextPreview(artHover.artId, artPowerRank(sinBuild, artHover.artId))
                              : artEffectLine(artHover.artId, artPowerRank(sinBuild, artHover.artId))
                          }
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[12px] leading-5 text-[#8aa0b4]">Выберите самоцвет на полотне.</p>
              )}
            </aside>
          </div>

          <div className="rp-card shrink-0 space-y-2 p-3">
            <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-visible py-1.5">
              {resolvedLearned.map(({ id, skill, rank }) => {
                if (!skill) return null;
                const slot = hotbar.indexOf(id);
                return (
                  <SinGem
                    key={id}
                    icon={iconForSkill(id)}
                    kind="skill"
                    accent={pathDef?.accent ?? viewDef.accent}
                    size="sm"
                    rank={rank > 0 ? rank : undefined}
                    selected={focusSkill === id || inspectSkillId === id}
                    owned={slot >= 0}
                    className={slot >= 0 ? "ring-2 ring-[var(--accent)]/70" : undefined}
                    title={`${skill.name} · r${rank}${slot >= 0 ? ` · Q${slot + 1}` : ""}\n${skill.description}${skillRankNextPreview(rank) ? `\n${skillRankNextPreview(rank)}` : ""}`}
                    onClick={() => {
                      setFocusSkill(id);
                      setSelectedId(SIN_NODES.find((n) => n.skillId === id)?.id ?? null);
                      if (armed !== null) socketSkill(id);
                    }}
                  />
                );
              })}
              {learned.length === 0 && (
                <span className="text-[10px] text-[#6a7c8c]">Открытые искусства появятся здесь</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 overflow-visible">
              {hotbar.map((id, i) => {
                const skill = id
                  ? resolveSinSkill(
                      id as SinSkillId,
                      path,
                      arts[id as SinSkillId],
                      hotbar,
                      resolveSinOpts(sinBuild, id as SinSkillId),
                    )
                  : null;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!id) {
                        setArmed(armed === i ? null : i);
                        return;
                      }
                      setArmed(null);
                      setFocusSkill(id as SinSkillId);
                      setSelectedId(SIN_NODES.find((n) => n.skillId === id)?.id ?? null);
                    }}
                    className={cn(
                      "sin-hot-slot relative overflow-visible",
                      skill && "is-filled",
                      armed === i && "is-armed",
                      skill && "ring-1 ring-[var(--accent)]/35",
                    )}
                  >
                    {skill ? (
                      <SinGem
                        icon={iconForSkill(id as SinSkillId)}
                        kind="skill"
                        accent={pathDef?.accent ?? viewDef.accent}
                        size="sm"
                        rank={skillPowerRank(sinBuild, id as SinSkillId) || undefined}
                        owned
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-[#6a7c8c]">Q{i + 1}</span>
                    )}
                    <span className="min-w-0 truncate text-[10px] text-[#c5d4e0]">
                      {skill?.name ?? (armed === i ? "выберите" : "пусто")}
                    </span>
                  </button>
                );
              })}
            </div>

            {synergies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {synergies.map((s) => (
                  <span key={s.id} className="es-chip px-2 py-0.5 text-[10px] text-amber" title={s.description}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
