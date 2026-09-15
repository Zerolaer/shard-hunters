import type { SinArtId, SinBuildState, SinSkillId } from "../types";
import {
  canAllocateSinNode,
  isSinSkillUnlocked,
  SIN_NODE_BY_ID,
  unlockedSinArts,
  unlockedSinSkills,
} from "./tree";

/** Soft cap for skill and support-art power ranks. Tree unlock is separate. */
export const SIN_RANK_CAP = 20;

/**
 * Skill rank 1 is baseline (current power).
 * Each step n → n+1 multiplies THAT skill’s damage by `1 + 0.028 * 0.88^(n-1)`.
 * Rank 1→20 totals ~+24% (product), not a double.
 *
 * Cooldown each step: `cd *= 1 - 0.012 * 0.90^(n-1)`, floored at 0.62 × transfig base.
 *
 * Resource (combo / poison / shade grant): +1 at rank 5, +2 at rank 10+ (never every rank).
 */
const SKILL_DMG_STEP = 0.028;
const SKILL_DMG_DECAY = 0.88;
const SKILL_CD_STEP = 0.012;
const SKILL_CD_DECAY = 0.9;
export const SKILL_CD_FLOOR = 0.62;

/** Art numeric effects use the same diminishing product (~+24% at rank 20). */
export function skillRankStepBonus(fromRank: number): number {
  if (fromRank < 1 || fromRank >= SIN_RANK_CAP) return 0;
  return SKILL_DMG_STEP * SKILL_DMG_DECAY ** (fromRank - 1);
}

export function skillRankCdStep(fromRank: number): number {
  if (fromRank < 1 || fromRank >= SIN_RANK_CAP) return 0;
  return SKILL_CD_STEP * SKILL_CD_DECAY ** (fromRank - 1);
}

export function skillRankDamageMult(rank: number): number {
  const r = clampRank(rank);
  let m = 1;
  for (let n = 1; n < r; n++) m *= 1 + skillRankStepBonus(n);
  return m;
}

export function skillRankCooldown(base: number, rank: number): number {
  const r = clampRank(rank);
  let cd = base;
  for (let n = 1; n < r; n++) cd *= 1 - skillRankCdStep(n);
  return Math.max(base * SKILL_CD_FLOOR, cd);
}

export function skillRankResourceExtra(rank: number): number {
  if (rank < 5) return 0;
  return Math.min(2, Math.floor(rank / 5));
}

export function artRankScale(rank: number): number {
  return skillRankDamageMult(rank);
}

const MASTERY_CRIT = 0.35;
const MASTERY_SKILL = 0.007;
const MASTERY_DECAY = 0.82;

export function sinMasteryStep(fromMastery: number) {
  const k = Math.max(0, fromMastery);
  return {
    critChance: MASTERY_CRIT * MASTERY_DECAY ** k,
    skillDamage: MASTERY_SKILL * MASTERY_DECAY ** k,
  };
}

export function sinMasteryBonuses(mastery: number) {
  const m = Math.max(0, Math.floor(mastery));
  let critChance = 0;
  let skillDamage = 0;
  for (let k = 0; k < m; k++) {
    const s = sinMasteryStep(k);
    critChance += s.critChance;
    skillDamage += s.skillDamage;
  }
  return { critChance, skillDamage };
}

export interface ArtRankMods {
  cooldownMult: number;
  critBonus: number;
  extraHits: number;
  hitScale: number | null;
  poisonGain: number;
  durationMod: number;
  executeArtBonus: number;
  economy: number;
  fortifyHits: number;
  dmgVsPoisoned: number;
  dmgVsMarked: number;
  comboGain: number;
  echoChance: number;
}

function emptyArtMods(): ArtRankMods {
  return {
    cooldownMult: 1,
    critBonus: 0,
    extraHits: 0,
    hitScale: null,
    poisonGain: 0,
    durationMod: 0,
    executeArtBonus: 0,
    economy: 0,
    fortifyHits: 0,
    dmgVsPoisoned: 0,
    dmgVsMarked: 0,
    comboGain: 0,
    echoChance: 0,
  };
}

/** Rank 1 matches the pre-rank art numbers in resolve.ts. */
export function artRankMods(artId: SinArtId, rank: number): ArtRankMods {
  const r = clampRank(Math.max(1, rank));
  const t = artRankScale(r);
  const out = emptyArtMods();
  switch (artId) {
    case "art-haste":
      out.cooldownMult = 1 - 0.22 * t;
      break;
    case "art-crit":
      out.critBonus = 12 * t;
      break;
    case "art-multistrike":
      out.extraHits = 1;
      out.hitScale = Math.min(0.85, 0.62 * t);
      break;
    case "art-poison":
      out.poisonGain = 2 + (r >= 12 ? 1 : 0) + (r >= 20 ? 1 : 0);
      break;
    case "art-duration":
      out.durationMod = 0.4 * t;
      break;
    case "art-execute":
      out.executeArtBonus = 0.35 * t;
      break;
    case "art-economy":
      out.economy = 1;
      out.critBonus = 8 * (t - 1);
      break;
    case "art-fortify":
      out.fortifyHits = 2 + (r >= 16 ? 1 : 0);
      break;
    case "art-bloodlust":
      out.dmgVsPoisoned = 0.18 * t;
      break;
    case "art-mark":
      out.dmgVsMarked = 0.22 * t;
      break;
    case "art-combo":
      out.comboGain = 1 + (r >= 18 ? 1 : 0);
      break;
    case "art-echo":
      out.echoChance = 0.2 * t;
      break;
  }
  return out;
}

export function artEffectLine(artId: SinArtId, rank: number): string {
  const m = artRankMods(artId, rank);
  switch (artId) {
    case "art-haste":
      return `−${Math.round((1 - m.cooldownMult) * 100)}% перезарядки`;
    case "art-crit":
      return `+${m.critBonus.toFixed(1)}% крита этого навыка`;
    case "art-multistrike":
      return `второй удар на ${Math.round((m.hitScale ?? 0.62) * 100)}% силы`;
    case "art-poison":
      return `+${m.poisonGain} стака яда с попадания`;
    case "art-duration":
      return `+${Math.round(m.durationMod * 100)}% к длительностям`;
    case "art-execute":
      return `+${Math.round(m.executeArtBonus * 100)}% урона ниже 40% HP`;
    case "art-economy":
      return m.critBonus > 0.05
        ? `спендер −1 ресурс, +${m.critBonus.toFixed(1)}% крита`
        : "спендер тратит на 1 ресурс меньше";
    case "art-fortify":
      return `следующие ${m.fortifyHits} удара по вам ослаблены`;
    case "art-bloodlust":
      return `+${Math.round(m.dmgVsPoisoned * 100)}% по яду / кровотечению`;
    case "art-mark":
      return `+${Math.round(m.dmgVsMarked * 100)}% по меченой цели`;
    case "art-combo":
      return `генераторы дают +${m.comboGain} комбо`;
    case "art-echo":
      return `${Math.round(m.echoChance * 100)}% шанс повторить навык`;
  }
}

export function skillRankNextPreview(rank: number): string | null {
  if (rank < 1 || rank >= SIN_RANK_CAP) return null;
  const dmg = skillRankStepBonus(rank) * 100;
  const cd = skillRankCdStep(rank) * 100;
  const bits = [`+${dmg.toFixed(1)}% урона навыка`, `−${cd.toFixed(1)}% CD`];
  if (skillRankResourceExtra(rank + 1) > skillRankResourceExtra(rank)) {
    bits.push("+1 к генерации ресурса");
  }
  return `следующий ранг: ${bits.join(", ")}`;
}

export function artRankNextPreview(artId: SinArtId, rank: number): string | null {
  if (rank < 1 || rank >= SIN_RANK_CAP) return null;
  const now = artEffectLine(artId, rank);
  const next = artEffectLine(artId, rank + 1);
  if (now === next) {
    const a = artRankScale(rank);
    const b = artRankScale(rank + 1);
    return `следующий ранг: +${(((b / a) - 1) * 100).toFixed(1)}% к эффекту`;
  }
  return `следующий ранг: ${next}`;
}

export function masteryNextPreview(mastery: number): string {
  const s = sinMasteryStep(Math.max(0, mastery));
  return `следующий: +${s.critChance.toFixed(2)}% крита, +${(s.skillDamage * 100).toFixed(2)}% ур. навыков`;
}

function clampRank(rank: number) {
  const n = Math.floor(Number.isFinite(rank) ? rank : 1);
  return Math.max(1, Math.min(SIN_RANK_CAP, n));
}

export function ensureSinRankFields(build: SinBuildState) {
  if (!build.skillRanks) build.skillRanks = {};
  if (!build.artRanks) build.artRanks = {};
  if (typeof build.mastery !== "number" || !Number.isFinite(build.mastery) || build.mastery < 0) {
    build.mastery = 0;
  }
}

/** Unlocked skills/arts start at power rank 1. Missing saves get filled here. */
export function syncUnlockedSinRanks(build: SinBuildState) {
  ensureSinRankFields(build);
  for (const id of unlockedSinSkills(build.ranks ?? {})) {
    const cur = build.skillRanks[id] ?? 0;
    if (cur < 1) build.skillRanks[id] = 1;
    else if (cur > SIN_RANK_CAP) build.skillRanks[id] = SIN_RANK_CAP;
  }
  for (const id of unlockedSinArts(build.ranks ?? {})) {
    const cur = build.artRanks[id] ?? 0;
    if (cur < 1) build.artRanks[id] = 1;
    else if (cur > SIN_RANK_CAP) build.artRanks[id] = SIN_RANK_CAP;
  }
}

export function skillPowerRank(build: SinBuildState | undefined, id: SinSkillId): number {
  if (!build?.ranks || !isSinSkillUnlocked(build.ranks, id)) return 0;
  return clampRank(build.skillRanks?.[id] ?? 1);
}

export function artPowerRank(build: SinBuildState | undefined, id: SinArtId): number {
  if (!build?.ranks || !unlockedSinArts(build.ranks).includes(id)) return 0;
  return clampRank(build.artRanks?.[id] ?? 1);
}

export function canRankSinSkill(build: SinBuildState, points: number, id: SinSkillId) {
  if (points <= 0) return false;
  const r = skillPowerRank(build, id);
  return r >= 1 && r < SIN_RANK_CAP;
}

export function canRankSinArt(build: SinBuildState, points: number, id: SinArtId) {
  if (points <= 0) return false;
  const r = artPowerRank(build, id);
  return r >= 1 && r < SIN_RANK_CAP;
}

export function canDumpSinMastery(build: SinBuildState, points: number) {
  if (points <= 0) return false;
  const skills = unlockedSinSkills(build.ranks ?? {});
  if (skills.length === 0) return false;
  for (const id of skills) {
    if ((build.skillRanks?.[id] ?? 1) < SIN_RANK_CAP) return false;
  }
  for (const id of unlockedSinArts(build.ranks ?? {})) {
    if ((build.artRanks?.[id] ?? 1) < SIN_RANK_CAP) return false;
  }
  return true;
}

/** Extra talent points sunk into ranks above 1, plus mastery. Tree unlocks are separate. */
export function spentSinPowerRanks(build: SinBuildState | undefined) {
  if (!build) return 0;
  let n = build.mastery ?? 0;
  for (const r of Object.values(build.skillRanks ?? {})) n += Math.max(0, r - 1);
  for (const r of Object.values(build.artRanks ?? {})) n += Math.max(0, r - 1);
  return n;
}

export type SinSpendTarget =
  | { kind: "tree"; nodeId: string }
  | { kind: "skill"; id: SinSkillId }
  | { kind: "art"; id: SinArtId }
  | { kind: "mastery" };

/**
 * Inspector CTA: tree allocate first, then rank the focused skill/art,
 * then any leftover sink so the player is never stuck on «Максимум».
 */
export function nextSinSpend(
  build: SinBuildState,
  points: number,
  nodeId: string | null,
  inspectSkillId: SinSkillId | null,
  inspectArtId: SinArtId | null,
): SinSpendTarget | null {
  if (nodeId && canAllocateSinNode(build.ranks, nodeId, points, build.path)) {
    return { kind: "tree", nodeId };
  }
  if (inspectSkillId && canRankSinSkill(build, points, inspectSkillId)) {
    return { kind: "skill", id: inspectSkillId };
  }
  const node = nodeId ? SIN_NODE_BY_ID[nodeId] : undefined;
  if (node?.artId && canRankSinArt(build, points, node.artId)) {
    return { kind: "art", id: node.artId };
  }
  if (inspectArtId && canRankSinArt(build, points, inspectArtId)) {
    return { kind: "art", id: inspectArtId };
  }
  if (points <= 0) return null;
  for (const id of unlockedSinSkills(build.ranks)) {
    if (canRankSinSkill(build, points, id)) return { kind: "skill", id };
  }
  for (const id of unlockedSinArts(build.ranks)) {
    if (canRankSinArt(build, points, id)) return { kind: "art", id };
  }
  if (canDumpSinMastery(build, points)) return { kind: "mastery" };
  return null;
}
