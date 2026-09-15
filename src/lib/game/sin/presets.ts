import { artSupports, SIN_ART_BY_ID } from "./arts";
import { SIN_PATH_BY_ID } from "./paths";
import {
  canDumpSinMastery,
  canRankSinArt,
  canRankSinSkill,
  SIN_RANK_CAP,
  spentSinPowerRanks,
  syncUnlockedSinRanks,
} from "./ranks";
import { SIN_SKILL_BY_ID } from "./skills";
import { sinResolvedTags } from "./synergy";
import {
  canAllocateSinNode,
  isSinSkillUnlocked,
  SIN_NODE_BY_ID,
  SIN_NODES,
  spentSinRanks,
  unlockedSinArts,
} from "./tree";
import type { AffixStat, SinArtId, SinBuildState, SinPathId, SinSkillId, SkillId } from "../types";

export interface SinPresetDef {
  id: string;
  path: SinPathId;
  name: string;
  description: string;
  /** Preferred tree spend order (node ids). Applied until points run out. */
  nodeOrder: string[];
  /** Recommended hotbar (slot order). Equipped when unlocked. */
  hotbar: SkillId[];
  /**
   * Recommended support-art sockets: skill → art.
   * Applied when both the skill and art are unlocked and tags match.
   */
  arts: Partial<Record<SinSkillId, SinArtId>>;
  /**
   * Greedy power-rank order: fully pump skill[0] toward cap before skill[1], etc.
   * This is what makes presets feel different instead of flattening everything.
   */
  skillRankPriority: SinSkillId[];
  /** Same greedy rule for arts. */
  artRankPriority: SinArtId[];
  /**
   * Preferred item-gem affix stats when filling empty sockets on equipped gear.
   * Only uses gems already in the bag; does not unsocket existing gems.
   */
  gemStatPriority: AffixStat[];
}

export interface SinPresetPlan {
  path: SinPathId;
  ranks: Record<string, number>;
  arts: Partial<Record<SinSkillId, SinArtId>>;
  skillRanks: Partial<Record<SinSkillId, number>>;
  artRanks: Partial<Record<SinArtId, number>>;
  mastery: number;
  hotbar: Array<SkillId | null>;
  spent: number;
  leftover: number;
  trimmed: boolean;
  treeSpent: number;
  powerSpent: number;
}

function pathNodes(path: SinPathId) {
  return SIN_NODES.filter((n) => n.path === path);
}

function coreOrder(path: SinPathId, prefer: string[]): string[] {
  const all = pathNodes(path);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of prefer) {
    if (SIN_NODE_BY_ID[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  const rest = [...all].sort((a, b) => a.row - b.row || a.col - b.col);
  for (const n of rest) {
    if (!seen.has(n.id)) out.push(n.id);
  }
  return out;
}

/**
 * Six distinct one-click builds — 2 per path — with different hotbars,
 * node priorities, art sockets, and greedy rank focuses.
 */
export const SIN_PRESETS: SinPresetDef[] = [
  {
    id: "sin-blade-finisher",
    path: "blade",
    name: "Потрошитель",
    description: "Метка → спина → потрошение → казнь. Финишеры в кап, крит на бэкстэбе.",
    nodeOrder: coreOrder("blade", [
      "blade-backstab",
      "blade-mark",
      "blade-eviscerate",
      "blade-execute",
      "blade-precision",
      "blade-edge",
      "blade-art-crit",
      "blade-art-combo",
      "blade-keystone",
      "blade-nightblade",
      "blade-fan",
      "blade-art-multi",
      "blade-veil",
      "blade-garrote",
    ]),
    hotbar: ["sin-mark", "sin-backstab", "sin-eviscerate", "sin-execute"],
    arts: {
      "sin-backstab": "art-crit",
      "sin-eviscerate": "art-economy",
      "sin-execute": "art-execute",
      "sin-flurry": "art-combo",
    },
    skillRankPriority: ["sin-eviscerate", "sin-execute", "sin-backstab", "sin-mark", "sin-nightblade"],
    artRankPriority: ["art-crit", "art-execute", "art-economy", "art-combo"],
    gemStatPriority: ["critDamage", "critChance", "agility", "attack", "accuracy"],
  },
  {
    id: "sin-blade-fan",
    path: "blade",
    name: "Стальной веер",
    description: "Шквал + веер. АоЕ и мультиудары в приоритете, комбо-темп.",
    nodeOrder: coreOrder("blade", [
      "blade-fan",
      "blade-art-multi",
      "blade-art-combo",
      "blade-edge",
      "blade-precision",
      "blade-backstab",
      "blade-mark",
      "blade-eviscerate",
      "blade-keystone",
      "blade-nightblade",
      "blade-execute",
      "blade-art-crit",
      "blade-veil",
      "blade-garrote",
    ]),
    hotbar: ["sin-flurry", "sin-fan", "sin-backstab", "sin-eviscerate"],
    arts: {
      "sin-fan": "art-multistrike",
      "sin-flurry": "art-combo",
      "sin-backstab": "art-crit",
      "sin-eviscerate": "art-economy",
    },
    skillRankPriority: ["sin-fan", "sin-flurry", "sin-backstab", "sin-eviscerate", "sin-nightblade"],
    artRankPriority: ["art-multistrike", "art-combo", "art-crit", "art-economy"],
    gemStatPriority: ["attack", "agility", "critChance", "accuracy", "critDamage"],
  },
  {
    id: "sin-venom-plague",
    path: "venom",
    name: "Чума",
    description: "Яд → гаррота → разрыв. Долгий DoT, длительность тиков.",
    nodeOrder: coreOrder("venom", [
      "venom-toxin",
      "venom-garrote",
      "venom-rupture",
      "venom-potency",
      "venom-art-poison",
      "venom-art-duration",
      "venom-keystone",
      "venom-nightblade",
      "venom-mark",
      "venom-sap",
      "venom-fan",
      "venom-execute",
      "venom-veil",
      "venom-art-blood",
    ]),
    hotbar: ["sin-venom", "sin-garrote", "sin-rupture", "sin-flurry"],
    arts: {
      "sin-venom": "art-poison",
      "sin-garrote": "art-duration",
      "sin-rupture": "art-bloodlust",
      "sin-flurry": "art-combo",
    },
    skillRankPriority: ["sin-venom", "sin-garrote", "sin-rupture", "sin-nightblade", "sin-flurry"],
    artRankPriority: ["art-poison", "art-duration", "art-bloodlust"],
    gemStatPriority: ["agility", "attack", "health", "endurance", "critChance"],
  },
  {
    id: "sin-venom-detonate",
    path: "venom",
    name: "Детонация",
    description: "Набрать яд и взорвать казнью. Короткие окна, берст, кровожадность.",
    nodeOrder: coreOrder("venom", [
      "venom-toxin",
      "venom-execute",
      "venom-art-blood",
      "venom-potency",
      "venom-garrote",
      "venom-mark",
      "venom-art-poison",
      "venom-keystone",
      "venom-rupture",
      "venom-nightblade",
      "venom-fan",
      "venom-veil",
      "venom-sap",
      "venom-art-duration",
    ]),
    hotbar: ["sin-venom", "sin-garrote", "sin-mark", "sin-execute"],
    arts: {
      "sin-venom": "art-poison",
      "sin-execute": "art-execute",
      "sin-garrote": "art-bloodlust",
      "sin-mark": "art-mark",
    },
    skillRankPriority: ["sin-execute", "sin-venom", "sin-garrote", "sin-mark", "sin-nightblade"],
    artRankPriority: ["art-execute", "art-poison", "art-bloodlust", "art-mark"],
    gemStatPriority: ["critDamage", "attack", "agility", "critChance", "accuracy"],
  },
  {
    id: "sin-phantom-ambush",
    path: "phantom",
    name: "Засада",
    description: "Исчезновение → шаг → засада → спина. Альфа из стелса.",
    nodeOrder: coreOrder("phantom", [
      "phantom-vanish",
      "phantom-step",
      "phantom-ambush",
      "phantom-backstab",
      "phantom-art-haste",
      "phantom-art-echo",
      "phantom-keystone",
      "phantom-mist",
      "phantom-mark",
      "phantom-veil",
      "phantom-clone",
      "phantom-execute",
      "phantom-nightblade",
      "phantom-art-fortify",
    ]),
    hotbar: ["sin-vanish", "sin-shadowstep", "sin-ambush", "sin-backstab"],
    arts: {
      "sin-ambush": "art-echo",
      "sin-backstab": "art-haste",
      "sin-vanish": "art-fortify",
      "sin-shadowstep": "art-mark",
    },
    skillRankPriority: ["sin-ambush", "sin-backstab", "sin-vanish", "sin-shadowstep", "sin-nightblade"],
    artRankPriority: ["art-echo", "art-haste", "art-fortify", "art-mark"],
    gemStatPriority: ["critChance", "critDamage", "agility", "accuracy", "attack"],
  },
  {
    id: "sin-phantom-echo",
    path: "phantom",
    name: "Эхо",
    description: "Клон + ночной клинок + засада. Постоянное давление и дубли.",
    nodeOrder: coreOrder("phantom", [
      "phantom-ambush",
      "phantom-backstab",
      "phantom-clone",
      "phantom-art-echo",
      "phantom-nightblade",
      "phantom-vanish",
      "phantom-step",
      "phantom-keystone",
      "phantom-art-haste",
      "phantom-veil",
      "phantom-mist",
      "phantom-mark",
      "phantom-execute",
      "phantom-art-fortify",
    ]),
    hotbar: ["sin-clone", "sin-ambush", "sin-nightblade", "sin-backstab"],
    arts: {
      "sin-ambush": "art-echo",
      "sin-clone": "art-haste",
      "sin-backstab": "art-crit",
      "sin-vanish": "art-fortify",
    },
    skillRankPriority: ["sin-clone", "sin-ambush", "sin-nightblade", "sin-backstab", "sin-vanish"],
    artRankPriority: ["art-echo", "art-crit", "art-haste", "art-fortify"],
    gemStatPriority: ["agility", "attack", "critChance", "critDamage", "accuracy"],
  },
];

/** Tree nodes only (path unlocks). */
export function sinPresetTreePoints(preset: SinPresetDef): number {
  let n = 0;
  for (const id of preset.nodeOrder) {
    const node = SIN_NODE_BY_ID[id];
    if (node) n += node.maxRank;
  }
  return n;
}

/**
 * Ideal endgame guide cost: full tree + greedy focus skills/arts to cap.
 * Mastery is an open sink and not quoted.
 */
export function sinPresetGuideCost(preset: SinPresetDef): number {
  const rankUps = SIN_RANK_CAP - 1;
  return (
    sinPresetTreePoints(preset) +
    preset.skillRankPriority.length * rankUps +
    preset.artRankPriority.length * rankUps
  );
}

/** @deprecated Use sinPresetTreePoints / sinPresetGuideCost / planSinPresetBuild. */
export function sinPresetPointsRequired(preset: SinPresetDef): number {
  return sinPresetGuideCost(preset);
}

function allocateTree(
  preset: SinPresetDef,
  availablePoints: number,
): { ranks: Record<string, number>; spent: number; leftover: number } {
  const ranks: Record<string, number> = { "sin-starter": 1 };
  let points = availablePoints;
  let spent = 0;

  const root = SIN_PATH_BY_ID[preset.path].starterNode;
  if ((ranks[root] ?? 0) < 1) {
    if (points > 0 && canAllocateSinNode(ranks, root, points, preset.path)) {
      ranks[root] = 1;
      points -= 1;
      spent += 1;
    } else {
      ranks[root] = 1;
    }
  }

  let progressed = true;
  while (points > 0 && progressed) {
    progressed = false;
    for (const id of preset.nodeOrder) {
      const node = SIN_NODE_BY_ID[id];
      if (!node || node.path !== preset.path) continue;
      while ((ranks[id] ?? 0) < node.maxRank) {
        if (!canAllocateSinNode(ranks, id, points, preset.path)) break;
        ranks[id] = (ranks[id] ?? 0) + 1;
        points -= 1;
        spent += 1;
        progressed = true;
      }
      if (points <= 0) break;
    }
  }

  return { ranks, spent, leftover: points };
}

function planArts(
  preset: SinPresetDef,
  ranks: Record<string, number>,
): Partial<Record<SinSkillId, SinArtId>> {
  const unlocked = new Set(unlockedSinArts(ranks));
  const arts: Partial<Record<SinSkillId, SinArtId>> = {};
  const used = new Set<SinArtId>();

  for (const [skillId, artId] of Object.entries(preset.arts) as [SinSkillId, SinArtId][]) {
    if (!artId || used.has(artId) || !unlocked.has(artId)) continue;
    if (!isSinSkillUnlocked(ranks, skillId)) continue;
    const art = SIN_ART_BY_ID[artId];
    if (!art) continue;
    const tags = sinResolvedTags(skillId, preset.path);
    if (!artSupports(art, tags)) continue;
    arts[skillId] = artId;
    used.add(artId);
  }

  for (const artId of unlocked) {
    if (used.has(artId)) continue;
    const art = SIN_ART_BY_ID[artId];
    if (!art) continue;
    for (const sid of [...preset.hotbar, ...preset.skillRankPriority]) {
      if (!SIN_SKILL_BY_ID[sid as SinSkillId]) continue;
      const skillId = sid as SinSkillId;
      if (arts[skillId]) continue;
      if (!isSinSkillUnlocked(ranks, skillId)) continue;
      if (!artSupports(art, sinResolvedTags(skillId, preset.path))) continue;
      arts[skillId] = artId;
      used.add(artId);
      break;
    }
  }

  return arts;
}

function planHotbar(preset: SinPresetDef, ranks: Record<string, number>): Array<SkillId | null> {
  const bar: Array<SkillId | null> = [null, null, null, null];
  let i = 0;
  for (const sid of preset.hotbar) {
    if (i > 3) break;
    if (isSinSkillUnlocked(ranks, sid as SinSkillId)) {
      bar[i] = sid;
      i += 1;
    }
  }
  // Only fill empties from priority — never force flurry over the preset identity.
  for (const sid of preset.skillRankPriority) {
    const empty = bar.findIndex((x) => x === null);
    if (empty < 0) break;
    if (bar.includes(sid)) continue;
    if (isSinSkillUnlocked(ranks, sid)) bar[empty] = sid;
  }
  return bar;
}

function skillOrderFor(preset: SinPresetDef, skillRanks: Partial<Record<SinSkillId, number>>) {
  return [
    ...preset.skillRankPriority,
    ...Object.keys(skillRanks).filter((id) => !preset.skillRankPriority.includes(id as SinSkillId)),
  ] as SinSkillId[];
}

function artOrderFor(preset: SinPresetDef, artRanks: Partial<Record<SinArtId, number>>) {
  return [
    ...preset.artRankPriority,
    ...Object.keys(artRanks).filter((id) => !preset.artRankPriority.includes(id as SinArtId)),
  ] as SinArtId[];
}

/**
 * Greedy staged dump so presets diverge:
 * 1) core skills (first 3) → cap
 * 2) core arts (first 2) → cap
 * 3) remaining focus skills → cap
 * 4) remaining focus arts → cap
 * 5) everything else → mastery
 */
function dumpPowerRanks(
  preset: SinPresetDef,
  build: {
    ranks: Record<string, number>;
    skillRanks: Partial<Record<SinSkillId, number>>;
    artRanks: Partial<Record<SinArtId, number>>;
    mastery: number;
  },
  points: number,
): number {
  let left = points;
  const state = {
    path: preset.path,
    ranks: build.ranks,
    arts: {} as Partial<Record<SinSkillId, SinArtId>>,
    skillRanks: build.skillRanks,
    artRanks: build.artRanks,
    mastery: build.mastery,
  };
  syncUnlockedSinRanks(state);

  const focusSkills = preset.skillRankPriority;
  const focusArts = preset.artRankPriority;
  const coreSkills = focusSkills.slice(0, 3);
  const supportSkills = focusSkills.slice(3);
  const coreArts = focusArts.slice(0, 2);
  const supportArts = focusArts.slice(2);
  const restSkills = skillOrderFor(preset, state.skillRanks).filter((id) => !focusSkills.includes(id));
  const restArts = artOrderFor(preset, state.artRanks).filter((id) => !focusArts.includes(id));

  function pumpSkill(id: SinSkillId) {
    while (left > 0 && canRankSinSkill(state, left, id)) {
      state.skillRanks[id] = (state.skillRanks[id] ?? 1) + 1;
      left -= 1;
    }
  }
  function pumpArt(id: SinArtId) {
    while (left > 0 && canRankSinArt(state, left, id)) {
      state.artRanks[id] = (state.artRanks[id] ?? 1) + 1;
      left -= 1;
    }
  }

  for (const id of coreSkills) pumpSkill(id);
  for (const id of coreArts) pumpArt(id);
  for (const id of supportSkills) pumpSkill(id);
  for (const id of supportArts) pumpArt(id);
  for (const id of restSkills) pumpSkill(id);
  for (const id of restArts) pumpArt(id);

  while (left > 0 && canDumpSinMastery(state, left)) {
    state.mastery += 1;
    left -= 1;
  }

  let progressed = true;
  const anySkill = [...focusSkills, ...restSkills];
  const anyArt = [...focusArts, ...restArts];
  while (left > 0 && progressed) {
    progressed = false;
    for (const id of anySkill) {
      if (left <= 0) break;
      if (!canRankSinSkill(state, left, id)) continue;
      state.skillRanks[id] = (state.skillRanks[id] ?? 1) + 1;
      left -= 1;
      progressed = true;
      break;
    }
    if (progressed) continue;
    for (const id of anyArt) {
      if (left <= 0) break;
      if (!canRankSinArt(state, left, id)) continue;
      state.artRanks[id] = (state.artRanks[id] ?? 1) + 1;
      left -= 1;
      progressed = true;
      break;
    }
    if (!progressed && canDumpSinMastery(state, left)) {
      state.mastery += 1;
      left -= 1;
      progressed = true;
    }
  }

  build.skillRanks = state.skillRanks;
  build.artRanks = state.artRanks;
  build.mastery = state.mastery;
  return left;
}

/** Full one-click plan: path tree + arts + hotbar + maximize point spend. */
export function planSinPresetBuild(preset: SinPresetDef, availablePoints: number): SinPresetPlan {
  const budget = Math.max(0, availablePoints);
  const tree = allocateTree(preset, budget);
  const ranks = tree.ranks;
  const arts = planArts(preset, ranks);
  const hotbar = planHotbar(preset, ranks);

  const build = {
    ranks,
    skillRanks: { "sin-flurry": 1 } as Partial<Record<SinSkillId, number>>,
    artRanks: {} as Partial<Record<SinArtId, number>>,
    mastery: 0,
  };
  syncUnlockedSinRanks({
    path: preset.path,
    ranks,
    arts,
    skillRanks: build.skillRanks,
    artRanks: build.artRanks,
    mastery: 0,
  });

  const leftover = dumpPowerRanks(preset, build, tree.leftover);
  const treeSpent = spentSinRanks(ranks);
  const powerSpent = spentSinPowerRanks({
    path: preset.path,
    ranks,
    arts,
    skillRanks: build.skillRanks,
    artRanks: build.artRanks,
    mastery: build.mastery,
  });
  const treeFull = sinPresetTreePoints(preset);

  return {
    path: preset.path,
    ranks,
    arts,
    skillRanks: build.skillRanks,
    artRanks: build.artRanks,
    mastery: build.mastery,
    hotbar,
    spent: treeSpent + powerSpent,
    leftover,
    trimmed: treeSpent < treeFull,
    treeSpent,
    powerSpent,
  };
}

/** @deprecated Prefer planSinPresetBuild — kept for callers expecting ranks-only. */
export function planSinPresetRanks(
  preset: SinPresetDef,
  availablePoints: number,
): { ranks: Record<string, number>; spent: number; trimmed: boolean } {
  const plan = planSinPresetBuild(preset, availablePoints);
  return { ranks: plan.ranks, spent: plan.treeSpent, trimmed: plan.trimmed };
}

/** Public helpers so UI/store can refresh arts & hotbar from current ranks. */
export function sinPresetArtsForRanks(preset: SinPresetDef, ranks: Record<string, number>) {
  return planArts(preset, ranks);
}

export function sinPresetHotbarForRanks(preset: SinPresetDef, ranks: Record<string, number>) {
  return planHotbar(preset, ranks);
}

/**
 * Incremental fills: tree first, then greedy skill/art ranks matching dumpPowerRanks.
 */
export function remainingSinPresetFills(
  preset: SinPresetDef,
  currentRanks: Record<string, number>,
  availablePoints: number,
  current?: {
    skillRanks?: Partial<Record<SinSkillId, number>>;
    artRanks?: Partial<Record<SinArtId, number>>;
    mastery?: number;
  },
): string[] {
  const fills: string[] = [];
  let points = availablePoints;
  const ranks = { ...currentRanks };
  if ((ranks["sin-starter"] ?? 0) < 1) ranks["sin-starter"] = 1;

  let treeProgress = true;
  while (points > 0 && treeProgress) {
    treeProgress = false;
    for (const id of preset.nodeOrder) {
      const node = SIN_NODE_BY_ID[id];
      if (!node || node.path !== preset.path) continue;
      while ((ranks[id] ?? 0) < node.maxRank && points > 0) {
        if (!canAllocateSinNode(ranks, id, points, preset.path)) break;
        ranks[id] = (ranks[id] ?? 0) + 1;
        points -= 1;
        fills.push(`tree:${id}`);
        treeProgress = true;
      }
    }
  }

  const build = {
    path: preset.path,
    ranks,
    arts: {} as Partial<Record<SinSkillId, SinArtId>>,
    skillRanks: { ...(current?.skillRanks ?? {}), "sin-flurry": 1 },
    artRanks: { ...(current?.artRanks ?? {}) },
    mastery: current?.mastery ?? 0,
  };
  syncUnlockedSinRanks(build);

  const focusSkills = preset.skillRankPriority;
  const focusArts = preset.artRankPriority;
  const coreSkills = focusSkills.slice(0, 3);
  const supportSkills = focusSkills.slice(3);
  const coreArts = focusArts.slice(0, 2);
  const supportArts = focusArts.slice(2);
  const restSkills = skillOrderFor(preset, build.skillRanks).filter((id) => !focusSkills.includes(id));
  const restArts = artOrderFor(preset, build.artRanks).filter((id) => !focusArts.includes(id));

  function pumpSkillFills(id: SinSkillId) {
    while (points > 0 && canRankSinSkill(build, points, id)) {
      build.skillRanks[id] = (build.skillRanks[id] ?? 1) + 1;
      points -= 1;
      fills.push(`skill:${id}`);
    }
  }
  function pumpArtFills(id: SinArtId) {
    while (points > 0 && canRankSinArt(build, points, id)) {
      build.artRanks[id] = (build.artRanks[id] ?? 1) + 1;
      points -= 1;
      fills.push(`art:${id}`);
    }
  }

  for (const id of coreSkills) pumpSkillFills(id);
  for (const id of coreArts) pumpArtFills(id);
  for (const id of supportSkills) pumpSkillFills(id);
  for (const id of supportArts) pumpArtFills(id);
  for (const id of restSkills) pumpSkillFills(id);
  for (const id of restArts) pumpArtFills(id);

  while (points > 0 && canDumpSinMastery(build, points)) {
    build.mastery += 1;
    points -= 1;
    fills.push("mastery");
  }

  return fills;
}

export function applySinPresetFills(
  preset: SinPresetDef,
  build: SinBuildState,
  points: number,
): { applied: number; pointsLeft: number } {
  const fills = remainingSinPresetFills(preset, build.ranks, points, build);
  let left = points;
  let applied = 0;
  for (const fill of fills) {
    if (left <= 0) break;
    if (fill.startsWith("tree:")) {
      const id = fill.slice(5);
      if (!canAllocateSinNode(build.ranks, id, left, preset.path)) break;
      build.ranks[id] = (build.ranks[id] ?? 0) + 1;
      left -= 1;
      applied += 1;
      syncUnlockedSinRanks(build);
      continue;
    }
    if (fill.startsWith("skill:")) {
      const id = fill.slice(6) as SinSkillId;
      syncUnlockedSinRanks(build);
      if (!canRankSinSkill(build, left, id)) break;
      build.skillRanks[id] = (build.skillRanks[id] ?? 1) + 1;
      left -= 1;
      applied += 1;
      continue;
    }
    if (fill.startsWith("art:")) {
      const id = fill.slice(4) as SinArtId;
      syncUnlockedSinRanks(build);
      if (!canRankSinArt(build, left, id)) break;
      build.artRanks[id] = (build.artRanks[id] ?? 1) + 1;
      left -= 1;
      applied += 1;
      continue;
    }
    if (fill === "mastery") {
      syncUnlockedSinRanks(build);
      if (!canDumpSinMastery(build, left)) break;
      build.mastery += 1;
      left -= 1;
      applied += 1;
    }
  }
  return { applied, pointsLeft: left };
}
