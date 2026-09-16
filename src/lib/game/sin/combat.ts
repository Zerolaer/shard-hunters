import { bmOffenseMult, expectedBm, gcdLength, SIN_SKILL_SCALE } from "../balance";
import { healPlayer, pushFloater, pushLog, registerMiss } from "../combatFx";
import { rollAccuracyHit, rollHit, statsOf } from "../formulas";
import { FARM_SPOT_BY_ID } from "../spots";
import type { DerivedStats, GameData, SinSkillId } from "../types";
import { resolveSinSkill, resolveSinOpts } from "./resolve";
import type { ResolvedSinSkill } from "./types";
import { isSinSkillId } from "./skills";
import { comboCap, emptySinBuild, emptySinCombat, poisonCap, resetSinOnNewTarget, shadeCap } from "./state";
import { detectSinSynergies, hasSynergy } from "./synergy";
import { hasSinKeystone, isSinSkillUnlocked } from "./tree";

type Draft = GameData;

const POISON_TICK = 1.15;
const PHANTOM_RUPTURE_POISON_MIN = 4;
const PHANTOM_EXECUTE_SHADE = 2;
const PHANTOM_EXECUTE_DUMP_MULT = 1.15;
const CLONE_ECHO_SCALE = 0.4;

function currentDanger(state: Draft, monster: { isBoss: boolean; isPvp: boolean }) {
  if (monster.isPvp || monster.isBoss) return 1;
  return FARM_SPOT_BY_ID[state.combat.spotId]?.danger ?? 1;
}

function sinDealtMult(state: Draft, derived: DerivedStats) {
  const monster = state.combat.monster;
  if (!monster || monster.isPvp || state.combat.mode === "pvp") return 1;
  const required = FARM_SPOT_BY_ID[state.combat.spotId]?.requiredBm ?? expectedBm(state.character.level);
  return bmOffenseMult(derived.powerScore, required);
}

export function ensureSin(state: Draft) {
  if (!state.combat.sin) state.combat.sin = emptySinCombat();
  else {
    if (typeof state.combat.sin.poisonTtl !== "number") state.combat.sin.poisonTtl = 0;
    if (typeof state.combat.sin.bleedAcc !== "number") state.combat.sin.bleedAcc = 0;
  }
  if (!state.sinBuild) {
    state.sinBuild = emptySinBuild();
  }
}

function sinSyns(state: Draft) {
  return detectSinSynergies(state.combat.hotbar, state.sinBuild.path);
}

function phantomRuptureDetonatesShade(path: Draft["sinBuild"]["path"], poison: number, shade: number) {
  return path === "phantom" && poison < PHANTOM_RUPTURE_POISON_MIN && shade >= 1;
}

export function isPlayingSin(state: Draft) {
  return state.character.classId === "assassin";
}

function keystones(state: Draft) {
  const ranks = state.sinBuild.ranks;
  const path = state.sinBuild.path;
  return {
    silentHeart: hasSinKeystone(ranks, path, "silent-heart"),
    bottomless: hasSinKeystone(ranks, path, "bottomless-cup"),
    echoBody: hasSinKeystone(ranks, path, "echo-body"),
  };
}

function clampResource(n: number, max: number) {
  return Math.max(0, Math.min(max, n));
}

function resolved(state: Draft, skillId: SinSkillId) {
  return resolveSinSkill(
    skillId,
    state.sinBuild.path,
    state.sinBuild.arts[skillId],
    state.combat.hotbar,
    resolveSinOpts(state.sinBuild, skillId),
  );
}

function skillReady(state: Draft, skillId: SinSkillId) {
  if (!isSinSkillUnlocked(state.sinBuild.ranks, skillId)) return false;
  if ((state.combat.skillCd[skillId] ?? 0) > 0) return false;
  return true;
}

function applyCooldown(state: Draft, skillId: string, baseCd: number, derived: DerivedStats) {
  state.combat.skillCd[skillId] = baseCd / (1 + derived.skillHaste);
}

function gcdFor(skill: ResolvedSinSkill, derived: DerivedStats) {
  const kind = skill.role === "defensive" || skill.role === "maintain" ? "utility" : "offensive";
  return gcdLength(kind, derived.skillHaste);
}

function agilityBase(_state: Draft, derived: DerivedStats, skill: ResolvedSinSkill) {
  const agi = derived.agility;
  let base = (derived.attack * 0.72 + agi * 2.4) * skill.multiplier * SIN_SKILL_SCALE;
  base *= 1 + derived.skillDamageBonus;
  base *= skill.synergyMult;
  return base;
}

/** Duration art on a poison-tagged hotbar skill slows stack decay; never freezes it. */
function poisonDecayNeed(state: Draft) {
  let best = 1;
  for (const slot of state.combat.hotbar) {
    if (!isSinSkillId(slot)) continue;
    const skill = resolved(state, slot);
    if (!skill?.tags.includes("poison")) continue;
    if (skill.durationMod > best) best = skill.durationMod;
  }
  return Math.max(1, best);
}

function cloneEchoHit(state: Draft, derived: DerivedStats) {
  const fallback = derived.attack * 0.42 * SIN_SKILL_SCALE * (1 + derived.skillDamageBonus);
  const lastId = state.combat.sin.lastSkillId;
  if (!isSinSkillId(lastId) || lastId === "sin-clone") {
    return { amount: fallback, label: "Эхо" };
  }
  const skill = resolved(state, lastId);
  if (!skill || skill.multiplier <= 0 || skill.cloneGrant > 0) {
    return { amount: fallback, label: "Эхо" };
  }
  return { amount: agilityBase(state, derived, skill) * CLONE_ECHO_SCALE, label: `Эхо · ${skill.name}` };
}

export function pickSinCast(state: Draft): SinSkillId | null {
  ensureSin(state);
  if (state.combat.sin.gcd > 0) return null;
  const monster = state.combat.monster;
  if (!monster) return null;
  const derived = statsOf(state);
  const hp = monster.maxHp > 0 ? monster.hp / monster.maxHp : 1;
  const php = derived.maxHp > 0 ? state.character.hp / derived.maxHp : 1;
  const sin = state.combat.sin;
  const ks = keystones(state);
  const syn = sinSyns(state);
  const path = state.sinBuild.path;

  let best: { id: SinSkillId; score: number } | null = null;

  for (const slot of state.combat.hotbar) {
    if (!isSinSkillId(slot)) continue;
    if (!skillReady(state, slot)) continue;
    const skill = resolved(state, slot);
    if (!skill) continue;
    if (skill.requiresStealth && sin.stealth <= 0) continue;

    let comboCost = skill.comboCost;
    if (comboCost > 0) comboCost = Math.max(0, comboCost - skill.economy);
    if (comboCost > 0 && sin.combo < comboCost) continue;
    if (skill.shadeCost > 0 && sin.shade < Math.max(0, skill.shadeCost - skill.economy)) continue;

    let score = 8;

    if (skill.role === "maintain" && skill.nightbladeGrant > 0) {
      score += sin.nightblade <= 0.6 ? 55 : -25;
    }
    if (skill.role === "maintain" && skill.markGrant > 0) {
      score += sin.marked <= 0.8 ? 42 : -20;
    }
    if (skill.role === "defensive") {
      score += php < 0.42 ? 70 : php < 0.62 ? 18 : -28;
    }
    if (skill.role === "setup" && skill.stealthGrant > 0) {
      score += sin.stealth <= 0.2 ? 36 : -30;
    }
    if (skill.role === "opener") {
      score += sin.stealth > 0 ? 90 : -80;
    }
    if (skill.role === "generator") {
      score += sin.combo < 4 ? 22 : sin.combo >= (ks.silentHeart ? 5 : 4) ? -18 : 8;
    }
    if (skill.role === "spender" && skill.comboCost === -1) {
      score += sin.combo >= 4 ? 28 + sin.combo * 6 : sin.combo >= 3 ? 10 : -45;
    }
    if (skill.poisonConsume) {
      if (phantomRuptureDetonatesShade(path, sin.poison, sin.shade)) {
        score += sin.shade >= 2 ? 22 + sin.shade * 4 : 10;
      } else {
        score += sin.poison >= 6 ? 35 + sin.poison * 2 : sin.poison >= 4 ? 8 : -40;
      }
    }
    if (skill.role === "apply") {
      score += sin.poison < 4 ? 26 : sin.poison > 10 ? -12 : 6;
      if (skill.bleedGrant > 0) score += sin.bleed <= 0.5 ? 16 : -8;
    }
    if (skill.cloneGrant > 0) {
      score += sin.clone <= 0.8 ? 32 : -22;
    }
    if (skill.executeThreshold > 0) {
      let thr = skill.executeThreshold;
      if (hasSynergy(syn, "sentence") && sin.marked > 0) thr = Math.max(thr, 0.5);
      if (path === "blade" && sin.combo >= 3) thr = Math.max(thr, 0.55);
      if (hp <= thr) score += 62;
      else if (path === "phantom" && sin.shade >= PHANTOM_EXECUTE_SHADE) score += 10;
      else score -= 35;
    }

    if (sin.lastSkillId && hasSynergy(syn, "stab-rip") && slot === "sin-eviscerate" && sin.lastSkillId === "sin-backstab") {
      score += 14;
    }
    if (sin.stealth > 0 && (skill.role === "opener" || skill.tags.includes("stealth"))) score += 10;

    if (!best || score > best.score) best = { id: slot, score };
  }

  if (!best || best.score < -20) return null;
  return best.id;
}

function dealHit(
  state: Draft,
  derived: DerivedStats,
  amount: number,
  critChance: number,
  label: string,
) {
  const monster = state.combat.monster;
  if (!monster || monster.hp <= 0) return { killed: false, value: 0, isCrit: false };
  const hit = rollHit(
    amount * sinDealtMult(state, derived),
    monster.defense,
    critChance,
    derived.critDamage,
    state.character.level,
  );
  monster.hp = Math.max(0, monster.hp - hit.value);
  state.combat.hitFlash = 0.28;
  pushFloater(state, {
    value: hit.value,
    isCrit: hit.isCrit,
    isHeal: false,
    isPlayerTarget: false,
  });
  pushLog(
    state,
    hit.isCrit ? "crit" : "skill",
    `${label}: ${hit.value}${hit.isCrit ? " (крит)" : ""}`,
  );
  if (derived.lifesteal > 0) {
    // Matches the 0.6 the classic skill path uses. The old 0.55 offset how
    // often Sin skills could fire, which the global cooldown now handles.
    healPlayer(state, Math.round(hit.value * derived.lifesteal * 0.6), derived.maxHp);
  }
  return { killed: monster.hp <= 0, value: hit.value, isCrit: hit.isCrit };
}

export function tryCastSin(state: Draft, skillId: SinSkillId): boolean {
  ensureSin(state);
  if (!isPlayingSin(state)) return false;
  if (!skillReady(state, skillId)) return false;
  if (state.combat.sin.gcd > 0) return false;

  const skill = resolved(state, skillId);
  if (!skill) return false;
  const sin = state.combat.sin;
  const derived = statsOf(state);
  const ks = keystones(state);
  const syn = sinSyns(state);
  const path = state.sinBuild.path;
  const cCap = comboCap(ks.silentHeart);
  const pCap = poisonCap(ks.bottomless, hasSynergy(syn, "set-poison-3"));
  const sCap = shadeCap(ks.echoBody);

  if (skill.requiresStealth && sin.stealth <= 0) return false;

  let comboCost = skill.comboCost === -1 ? sin.combo : skill.comboCost;
  if (comboCost > 0) comboCost = Math.max(0, comboCost - skill.economy);
  const shadeCost = Math.max(0, skill.shadeCost - skill.economy);
  if (skill.comboCost > 0 && sin.combo < comboCost) return false;
  if (shadeCost > 0 && sin.shade < shadeCost) return false;

  const duration = skill.durationMod;
  let stealthDur = skill.stealthGrant * duration;
  if (hasSynergy(syn, "set-shade-2")) stealthDur += skill.stealthGrant > 0 ? 0.6 : 0;
  if (hasSynergy(syn, "set-shade-3")) stealthDur += skill.stealthGrant > 0 ? 0.8 : 0;
  let cloneDur = skill.cloneGrant * duration;
  if (hasSynergy(syn, "set-shade-3") && cloneDur > 0) cloneDur += 2;
  if (hasSynergy(syn, "split-shadow") && skillId === "sin-vanish") {
    cloneDur = Math.max(cloneDur, 3);
  }

  if (skill.kind === "buff" || skill.multiplier <= 0) {
    if (skill.markGrant > 0) sin.marked = Math.max(sin.marked, skill.markGrant * duration);
    if (stealthDur > 0) sin.stealth = Math.max(sin.stealth, stealthDur);
    if (skill.nightbladeGrant > 0) {
      sin.nightblade = Math.max(sin.nightblade, skill.nightbladeGrant * duration);
    }
    if (skill.veilHits > 0) {
      sin.veilHits = Math.max(sin.veilHits, skill.veilHits);
      if (ks.echoBody) sin.shade = clampResource(sin.shade + 1, sCap);
      if (hasSynergy(syn, "double-veil") && sin.stealth > 0) sin.stealth += 1.2;
    }
    if (cloneDur > 0) {
      sin.clone = Math.max(sin.clone, cloneDur);
      if (hasSynergy(syn, "ghost-guard")) sin.cloneAbsorb = Math.max(sin.cloneAbsorb, 1);
    }
    if (skill.poisonGain > 0) sin.poison = clampResource(sin.poison + skill.poisonGain, pCap);
    if (skill.shadeGain > 0) sin.shade = clampResource(sin.shade + skill.shadeGain, sCap);
    if (skill.fortifyHits > 0) sin.veilHits = Math.max(sin.veilHits, skill.fortifyHits);

    applyCooldown(state, skillId, skill.cooldown, derived);
    sin.gcd = gcdFor(skill, derived);
    if (skillId !== "sin-clone") sin.lastSkillId = skillId;
    pushLog(state, "skill", `${skill.name}`);
    return false;
  }

  const monster = state.combat.monster;
  if (!monster) return false;
  const danger = currentDanger(state, monster);
  const accRoll = rollAccuracyHit(derived.accuracy, state.character.level, monster, danger);
  if (!accRoll.hit) {
    applyCooldown(state, skillId, skill.cooldown, derived);
    sin.gcd = gcdFor(skill, derived);
    registerMiss(state, `${skill.name}: промах (${accRoll.chance.toFixed(0)}%)`);
    return false;
  }

  const hpRatio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 1;
  let spentCombo = 0;
  if (skill.comboCost === -1) {
    spentCombo = sin.combo;
    if (hasSynergy(syn, "open-spend") && sin.lastSkillId === "sin-ambush") {
      spentCombo = Math.max(spentCombo, 3);
    }
  } else if (comboCost > 0) {
    spentCombo = comboCost;
  }

  let amount = agilityBase(state, derived, skill);
  if (skill.comboCost === -1) {
    amount *= 1 + 0.52 * Math.max(0, spentCombo);
  }
  if (hasSynergy(syn, "rising-tempo") && skillId === "sin-eviscerate") {
    amount *= 1 + 0.1 * Math.max(0, spentCombo - 2);
  }
  if (hasSynergy(syn, "stab-rip") && skillId === "sin-eviscerate" && sin.lastSkillId === "sin-backstab") {
    amount *= 1.18;
  }
  const shadeRupture = skill.poisonConsume && phantomRuptureDetonatesShade(path, sin.poison, sin.shade);
  if (skill.poisonConsume) {
    const stacks = Math.max(1, shadeRupture ? sin.shade : sin.poison);
    amount *= 1 + 0.42 * stacks;
    if (!shadeRupture && hasSynergy(syn, "set-poison-3")) amount *= 1.2;
    if (sin.ruptureAmp > 0) {
      amount *= 1 + sin.ruptureAmp;
      sin.ruptureAmp = 0;
    }
    if (hasSynergy(syn, "open-wound") && sin.bleed > 0) {
      amount *= 1.22;
      sin.bleed = 0;
    }
  }
  if (skillId === "sin-backstab" && sin.backstabAmp > 0) {
    amount *= 1.28;
    sin.backstabAmp = 0;
  }
  if (path === "phantom" && skillId === "sin-backstab" && (sin.stealth > 0 || sin.shade > 0)) {
    amount *= 1.35;
  }
  let phantomExecuteDump = false;
  if (skill.executeThreshold > 0) {
    let thr = skill.executeThreshold;
    if (hasSynergy(syn, "sentence") && sin.marked > 0) thr = Math.max(thr, 0.5);
    if (path === "blade" && sin.combo >= 3) thr = Math.max(thr, 0.55);
    const inWindow = hpRatio <= thr;
    phantomExecuteDump = path === "phantom" && !inWindow && sin.shade >= PHANTOM_EXECUTE_SHADE;
    if (inWindow) amount *= 2.15;
    else if (phantomExecuteDump) amount *= PHANTOM_EXECUTE_DUMP_MULT;
    if (skill.executeArtBonus > 0 && hpRatio < 0.4) amount *= 1 + skill.executeArtBonus;
    if (hasSynergy(syn, "moon-sentence") && sin.nightblade > 0) {
      skill.critBonus += 14;
    }
    if (hasSynergy(syn, "toxic-end") && sin.lastSkillId === "sin-rupture") amount *= 1.2;
    if (path === "venom" && sin.poison > 0) {
      amount += agilityBase(state, derived, skill) * 0.08 * sin.poison;
      sin.poison = Math.floor(sin.poison * 0.4);
    }
  }
  if (skill.executeArtBonus > 0 && skill.executeThreshold <= 0 && hpRatio < 0.4) {
    amount *= 1 + skill.executeArtBonus;
  }
  if (sin.marked > 0) {
    amount *= 1.12 + skill.dmgVsMarked;
    if (hasSynergy(syn, "marked-prey") && skillId === "sin-ambush") amount *= 1.22;
  }
  if ((sin.poison > 0 || sin.bleed > 0) && skill.dmgVsPoisoned > 0) {
    amount *= 1 + skill.dmgVsPoisoned;
  }
  if (sin.empowerHits > 0 && skill.role === "generator") {
    amount *= 1.16;
    sin.empowerHits -= 1;
  }
  if (ks.echoBody && sin.stealth > 0) amount *= 1.22;
  if (hasSynergy(syn, "from-shadow") && skillId === "sin-ambush") {
    skill.critBonus = 100;
  }

  let critChance = derived.critChance * 0.9 + skill.critBonus;
  if (ks.silentHeart && sin.combo >= 5) critChance += 12;
  if (skillId === "sin-ambush" && path === "blade") critChance = 100;

  const hits = 1 + skill.extraHits;
  let killed = false;
  let lastCrit = false;
  for (let i = 0; i < hits; i++) {
    const scale = i === 0 ? 1 : skill.hitScale;
    const res = dealHit(state, derived, amount * scale, critChance, i === 0 ? skill.name : `${skill.name} · эхо`);
    killed = killed || res.killed;
    lastCrit = lastCrit || res.isCrit;
    if (killed) break;
  }

  if (!killed && skill.echoChance > 0 && Math.random() < skill.echoChance) {
    const res = dealHit(state, derived, amount * 0.5, critChance * 0.8, `${skill.name} · эхо тени`);
    killed = killed || res.killed;
  }
  if (!killed && hasSynergy(syn, "echo-fan") && skillId === "sin-fan" && sin.clone > 0) {
    const res = dealHit(state, derived, amount * 0.4, critChance * 0.7, "Эхо веера");
    killed = killed || res.killed;
  }

  if (skill.comboCost === -1) {
    sin.combo = ks.silentHeart && skillId === "sin-eviscerate" ? 1 : 0;
    if (path === "venom" && skillId === "sin-eviscerate") {
      sin.ruptureAmp = 0.12 * spentCombo;
    }
  } else if (comboCost > 0) {
    sin.combo = Math.max(0, sin.combo - comboCost);
  }
  if (shadeCost > 0) sin.shade = Math.max(0, sin.shade - shadeCost);
  if (phantomExecuteDump) sin.shade = Math.max(0, sin.shade - PHANTOM_EXECUTE_SHADE);
  if (shadeRupture) sin.shade = 0;

  let comboGain = skill.comboGain;
  if (hasSynergy(syn, "set-combo-3") && skill.role === "generator" && Math.random() < 0.35) {
    comboGain += 1;
  }
  sin.combo = clampResource(sin.combo + comboGain, cCap);
  if (hasSynergy(syn, "set-hybrid") && skill.role === "spender" && skill.poisonConsume) {
    sin.combo = clampResource(sin.combo + 1, cCap);
  }

  let poisonGain = skill.poisonGain;
  if (path === "venom" && skillId === "sin-backstab" && sin.combo >= 2) poisonGain += 2;
  if (hasSynergy(syn, "set-hybrid") && skill.role === "spender" && skill.comboCost === -1) {
    poisonGain += 1;
  }
  sin.poison = clampResource(sin.poison + poisonGain, pCap);
  if (skill.poisonConsume && skill.executeThreshold <= 0 && !shadeRupture) {
    sin.poison = 0;
  }

  sin.shade = clampResource(sin.shade + skill.shadeGain, sCap);
  if (stealthDur > 0) sin.stealth = Math.max(sin.stealth, stealthDur);
  if (skill.markGrant > 0) sin.marked = Math.max(sin.marked, skill.markGrant * duration);
  if (skill.nightbladeGrant > 0) sin.nightblade = Math.max(sin.nightblade, skill.nightbladeGrant * duration);
  if (cloneDur > 0) sin.clone = Math.max(sin.clone, cloneDur);
  if (skill.veilHits > 0) sin.veilHits = Math.max(sin.veilHits, skill.veilHits);
  if (skill.fortifyHits > 0) sin.veilHits = Math.max(sin.veilHits, skill.fortifyHits);
  if (skill.bleedGrant > 0) {
    sin.bleed = Math.max(sin.bleed, skill.bleedGrant * duration);
    sin.bleedPower = Math.max(sin.bleedPower, Math.round(derived.attack * 0.22));
    sin.slow = Math.max(sin.slow, 4);
  }
  if (path === "blade" && skillId === "sin-venom") sin.empowerHits = Math.max(sin.empowerHits, 2);
  if (path === "blade" && skillId === "sin-shadowstep") sin.backstabAmp = 1;
  if (path === "phantom" && skillId === "sin-garrote" && sin.stealth > 0) {
    sin.bleed += 2;
  }
  if (hasSynergy(syn, "from-nowhere") && skillId === "sin-shadowstep") sin.backstabAmp = 1;
  if (lastCrit && path === "phantom" && sin.nightblade > 0) {
    sin.shade = clampResource(sin.shade + 1, sCap);
  }
  if (sin.stealth > 0 && skill.role === "opener") {
    sin.stealth = 0;
  }

  applyCooldown(state, skillId, skill.cooldown, derived);
  sin.gcd = gcdFor(skill, derived);
  if (skillId !== "sin-clone") sin.lastSkillId = skillId;
  return killed;
}

export function tickSinEffects(state: Draft, dt: number): boolean {
  ensureSin(state);
  if (!isPlayingSin(state)) return false;
  const sin = state.combat.sin;
  const derived = statsOf(state);
  const monster = state.combat.monster;
  const ks = keystones(state);
  const syn = sinSyns(state);

  sin.gcd = Math.max(0, sin.gcd - dt);
  sin.marked = Math.max(0, sin.marked - dt);
  sin.stealth = Math.max(0, sin.stealth - dt);
  sin.nightblade = Math.max(0, sin.nightblade - dt);
  sin.clone = Math.max(0, sin.clone - dt);
  sin.bleed = Math.max(0, sin.bleed - dt);
  sin.slow = Math.max(0, sin.slow - dt);
  if (sin.clone <= 0) {
    sin.cloneAcc = 0;
    sin.cloneAbsorb = 0;
  }

  if (!monster || monster.hp <= 0) return false;

  let killed = false;
  const poisonMult =
    (ks.bottomless ? 1.25 : 1) *
    (hasSynergy(syn, "set-poison-3") ? 1.25 : hasSynergy(syn, "set-poison-2") ? 1.12 : 1) *
    (sin.marked > 0 && hasSynergy(syn, "plague-mark") ? 1.3 : 1) *
    (sin.marked > 0 && state.sinBuild.path === "venom" ? 1.25 : 1);

  if (sin.poison > 0) {
    sin.poisonAcc += dt;
    let poisonSteps = 0;
    while (sin.poison > 0 && sin.poisonAcc >= POISON_TICK && poisonSteps < 16) {
      sin.poisonAcc -= POISON_TICK;
      poisonSteps += 1;
      const tick = Math.max(
        1,
        Math.round(
          derived.attack *
            0.09 *
            SIN_SKILL_SCALE *
            sin.poison *
            (1 + derived.skillDamageBonus) *
            poisonMult *
            sinDealtMult(state, derived),
        ),
      );
      monster.hp = Math.max(0, monster.hp - tick);
      pushFloater(state, { value: tick, isCrit: false, isHeal: false, isPlayerTarget: false });
      pushLog(state, "skill", `Яд (${sin.poison}): ${tick}`);
      if (ks.bottomless) {
        healPlayer(state, Math.round(tick * 0.2), derived.maxHp);
      }
      const decayNeed = poisonDecayNeed(state);
      sin.poisonTtl += 1;
      if (sin.poisonTtl + 1e-6 >= decayNeed) {
        sin.poisonTtl -= decayNeed;
        sin.poison = Math.max(0, sin.poison - 1);
      }
      if (sin.poison <= 0) {
        sin.poisonTtl = 0;
        sin.poisonAcc = 0;
      }
      if (monster.hp <= 0) {
        killed = true;
        break;
      }
    }
  } else {
    sin.poisonAcc = 0;
    sin.poisonTtl = 0;
  }

  if (!killed && sin.bleed > 0 && sin.bleedPower > 0) {
    // Accumulate fractional damage instead of rounding every tick: rounding a
    // small bleed up to 1 per 50 ms frame turned every bleed into a 20 DPS
    // floor and made the total depend on the frame rate.
    sin.bleedAcc += sin.bleedPower * dt * sinDealtMult(state, derived);
    const tick = Math.floor(sin.bleedAcc);
    if (tick > 0) {
      sin.bleedAcc -= tick;
      monster.hp = Math.max(0, monster.hp - tick);
      pushFloater(state, { value: tick, isCrit: false, isHeal: false, isPlayerTarget: false });
      if (monster.hp <= 0) killed = true;
    }
  } else {
    sin.bleedAcc = 0;
  }

  if (!killed && sin.clone > 0) {
    sin.cloneAcc += dt;
    let cloneSteps = 0;
    while (sin.clone > 0 && sin.cloneAcc >= 2 && cloneSteps < 8) {
      sin.cloneAcc -= 2;
      cloneSteps += 1;
      const echo = cloneEchoHit(state, derived);
      const res = dealHit(state, derived, echo.amount, derived.critChance * 0.7, echo.label);
      if (state.sinBuild.path === "venom") {
        sin.poison = clampResource(sin.poison + 1, poisonCap(ks.bottomless, hasSynergy(syn, "set-poison-3")));
      }
      if (res.killed) {
        killed = true;
        break;
      }
    }
  }

  return killed;
}

export function afterSinSwing(state: Draft, isCrit: boolean) {
  ensureSin(state);
  if (!isPlayingSin(state)) return;
  if (state.combat.sin.nightblade <= 0) return;
  const path = state.sinBuild.path;
  const ks = keystones(state);
  const syn = sinSyns(state);
  const sin = state.combat.sin;
  if (path === "blade" && Math.random() < 0.28) {
    sin.combo = clampResource(sin.combo + 1, comboCap(ks.silentHeart));
  }
  if (path === "venom") {
    sin.poison = clampResource(
      sin.poison + 1,
      poisonCap(ks.bottomless, hasSynergy(syn, "set-poison-3")),
    );
  }
  if (path === "phantom" && (isCrit || Math.random() < 0.18)) {
    sin.shade = clampResource(sin.shade + 1, shadeCap(ks.echoBody));
  }
}

export function sinIncomingMultiplier(state: Draft) {
  ensureSin(state);
  const sin = state.combat.sin;
  let m = 1;
  if (sin.veilHits > 0) m *= 0.6;
  if (sin.stealth > 0) m *= 0.85;
  return m;
}

export function sinOnPlayerHit(state: Draft) {
  ensureSin(state);
  const sin = state.combat.sin;
  if (sin.cloneAbsorb > 0) {
    sin.cloneAbsorb -= 1;
    return { absorbed: true };
  }
  if (sin.veilHits > 0) {
    sin.veilHits -= 1;
    if (state.sinBuild.path === "venom") {
      const ks = keystones(state);
      const syn = sinSyns(state);
      sin.poison = clampResource(
        sin.poison + 1,
        poisonCap(ks.bottomless, hasSynergy(syn, "set-poison-3")),
      );
    }
    if (state.sinBuild.path === "blade") sin.empowerHits = Math.max(sin.empowerHits, 1);
  }
  return { absorbed: false };
}

export function sinMonsterIntervalMult(state: Draft) {
  ensureSin(state);
  return state.combat.sin.slow > 0 ? 1.3 : 1;
}

export function onSinNewMonster(state: Draft) {
  ensureSin(state);
  resetSinOnNewTarget(state.combat.sin);
}

export { resetSinOnNewTarget };
