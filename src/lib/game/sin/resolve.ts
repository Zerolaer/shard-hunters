import type { SinArtId, SinBuildState, SinPathId, SinSkillId } from "../types";
import { artSupports, SIN_ART_BY_ID } from "./arts";
import { SIN_PATH_BY_ID } from "./paths";
import {
  artPowerRank,
  artRankMods,
  skillPowerRank,
  skillRankCooldown,
  skillRankDamageMult,
  skillRankResourceExtra,
} from "./ranks";
import { SIN_SKILL_BY_ID, SIN_TRANSFIG } from "./skills";
import { detectSinSynergies, hasSynergy } from "./synergy";
import type { ResolvedSinSkill, SinSkillDef, SinTransfig } from "./types";

function applyTransfig(base: SinSkillDef, t: SinTransfig | undefined): SinSkillDef {
  if (!t) return { ...base, tags: [...base.tags] };
  return {
    ...base,
    name: t.name,
    description: t.description,
    tags: [...new Set([...base.tags, ...(t.tags ?? [])])],
    cooldown: t.cooldown ?? base.cooldown,
    multiplier: t.multiplier ?? base.multiplier,
    comboGain: t.comboGain ?? base.comboGain,
    comboCost: t.comboCost ?? base.comboCost,
    poisonGain: t.poisonGain ?? base.poisonGain,
    poisonConsume: t.poisonConsume ?? base.poisonConsume,
    shadeGain: t.shadeGain ?? base.shadeGain,
    shadeCost: t.shadeCost ?? base.shadeCost,
    critBonus: t.critBonus ?? base.critBonus,
    extraHits: t.extraHits ?? base.extraHits,
    hitScale: t.hitScale ?? base.hitScale,
    stealthGrant: t.stealthGrant ?? base.stealthGrant,
    markGrant: t.markGrant ?? base.markGrant,
    nightbladeGrant: t.nightbladeGrant ?? base.nightbladeGrant,
    veilHits: t.veilHits ?? base.veilHits,
    cloneGrant: t.cloneGrant ?? base.cloneGrant,
    bleedGrant: t.bleedGrant ?? base.bleedGrant,
    requiresStealth: t.requiresStealth ?? base.requiresStealth,
    executeThreshold: t.executeThreshold ?? base.executeThreshold,
  };
}

export function resolveSinSkill(
  skillId: SinSkillId,
  path: SinPathId | null,
  artId: SinArtId | null | undefined,
  hotbar: Array<string | null>,
  opts?: { skillRank?: number; artRank?: number },
): ResolvedSinSkill | null {
  const base = SIN_SKILL_BY_ID[skillId];
  if (!base) return null;
  const transfig = path ? SIN_TRANSFIG[path][skillId] : undefined;
  const merged = applyTransfig(base, transfig);
  const synergies = detectSinSynergies(hotbar, path);
  const art = artId ? SIN_ART_BY_ID[artId] : undefined;
  const artOk = art ? artSupports(art, merged.tags) : false;
  const skillRank = Math.max(1, opts?.skillRank ?? 1);
  const artRank = Math.max(1, opts?.artRank ?? 1);

  const rankBaseCd = merged.cooldown;
  let cooldown = skillRankCooldown(rankBaseCd, skillRank);
  let extraHits = merged.extraHits;
  let hitScale = merged.hitScale;
  const resExtra = skillRankResourceExtra(skillRank);
  let comboGain = merged.comboGain + (merged.comboGain > 0 ? resExtra : 0);
  let poisonGain = merged.poisonGain + (merged.poisonGain > 0 ? resExtra : 0);
  const shadeGain = merged.shadeGain + (merged.shadeGain > 0 ? resExtra : 0);
  let durationMod = 1;
  let synergyMult = skillRankDamageMult(skillRank);
  const synergyNames: string[] = [];
  let economy = 0;
  let echoChance = 0;
  let fortifyHits = 0;
  let critBonus = merged.critBonus;
  let dmgVsPoisoned = 0;
  let dmgVsMarked = 0;
  let executeArtBonus = 0;

  if (art && artOk) {
    const mods = artRankMods(art.id, artRank);
    cooldown *= mods.cooldownMult;
    critBonus += mods.critBonus;
    extraHits += mods.extraHits;
    if (mods.hitScale != null) hitScale = Math.min(hitScale, mods.hitScale);
    poisonGain += mods.poisonGain;
    durationMod += mods.durationMod;
    executeArtBonus += mods.executeArtBonus;
    economy += mods.economy;
    fortifyHits += mods.fortifyHits;
    dmgVsPoisoned += mods.dmgVsPoisoned;
    dmgVsMarked += mods.dmgVsMarked;
    comboGain += mods.comboGain;
    echoChance += mods.echoChance;
  }

  if (hasSynergy(synergies, "blade-dance") && skillId === "sin-flurry") {
    cooldown *= 0.8;
    synergyNames.push("Танец клинков");
  }
  if (hasSynergy(synergies, "steel-storm") && (skillId === "sin-flurry" || skillId === "sin-fan")) {
    comboGain += 1;
    synergyNames.push("Стальной шторм");
  }
  if (hasSynergy(synergies, "plague-fan") && skillId === "sin-fan") {
    poisonGain += 2;
    synergyNames.push("Чумной веер");
  }
  if (hasSynergy(synergies, "poisoned-blade") && skillId === "sin-backstab") {
    poisonGain += 2;
    synergyNames.push("Отравленный клинок");
  }
  if (hasSynergy(synergies, "blink-open") && skillId === "sin-shadowstep") {
    merged.stealthGrant = Math.max(merged.stealthGrant, 1);
    synergyNames.push("Шаг-засада");
  }
  if (hasSynergy(synergies, "set-combo-2") && merged.role === "generator") {
    synergyMult *= 1.08;
    synergyNames.push("Цепь клинков");
  }
  if (hasSynergy(synergies, "set-combo-3") && merged.role === "spender") {
    synergyMult *= 1.1;
    synergyNames.push("Ритм убийцы");
  }
  if (hasSynergy(synergies, "set-pure-blade") && merged.kind !== "buff") {
    synergyMult *= 1.08;
    synergyNames.push("Чистое лезвие");
  }
  if (hasSynergy(synergies, "set-shade-2")) {
    durationMod += merged.stealthGrant > 0 ? 0.2 : 0;
  }

  const uniqueNames = [...new Set(synergyNames)];
  const pathName = path ? SIN_PATH_BY_ID[path].name : "Без пути";

  return {
    ...merged,
    shadeGain,
    cooldown,
    extraHits,
    hitScale,
    comboGain,
    poisonGain,
    critBonus,
    artId: artOk && art ? art.id : artId && !artOk ? artId : art?.id ?? null,
    artName: artOk && art ? art.name : null,
    pathName,
    synergyMult,
    synergyNames: uniqueNames,
    durationMod,
    economy,
    echoChance,
    fortifyHits,
    dmgVsPoisoned,
    dmgVsMarked,
    executeArtBonus,
    skillRank,
    artRank: artOk ? artRank : 0,
  };
}

export function resolveSinOpts(build: SinBuildState, skillId: SinSkillId) {
  const artId = build.arts[skillId];
  return {
    skillRank: skillPowerRank(build, skillId) || 1,
    artRank: artId ? artPowerRank(build, artId) || 1 : 1,
  };
}

export function resolveHotbarSkills(build: SinBuildState, hotbar: Array<string | null>) {
  return hotbar.map((id) => {
    if (!id || !(id in SIN_SKILL_BY_ID)) return null;
    const skillId = id as SinSkillId;
    return resolveSinSkill(skillId, build.path, build.arts[skillId], hotbar, resolveSinOpts(build, skillId));
  });
}
