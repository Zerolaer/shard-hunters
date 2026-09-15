import type { SinBuildState, SinCombatState } from "../types";

export function emptySinCombat(): SinCombatState {
  return {
    combo: 0,
    poison: 0,
    poisonAcc: 0,
    poisonTtl: 0,
    bleed: 0,
    bleedPower: 0,
    bleedAcc: 0,
    shade: 0,
    marked: 0,
    stealth: 0,
    nightblade: 0,
    veilHits: 0,
    clone: 0,
    gcd: 0,
    lastSkillId: null,
    empowerHits: 0,
    cloneAbsorb: 0,
    slow: 0,
    ruptureAmp: 0,
    backstabAmp: 0,
    cloneAcc: 0,
  };
}

export function emptySinBuild(): SinBuildState {
  return { path: null, ranks: {}, arts: {}, skillRanks: {}, artRanks: {}, mastery: 0 };
}

/**
 * New pack: drop target-bound afflictions, amps, and shade so the next mob
 * does not spawn pre-slowed / pre-shaded. Combo persists as assassin identity.
 */
export function resetSinOnNewTarget(sin: SinCombatState) {
  sin.poison = 0;
  sin.poisonAcc = 0;
  sin.poisonTtl = 0;
  sin.bleed = 0;
  sin.bleedPower = 0;
  sin.bleedAcc = 0;
  sin.marked = 0;
  sin.empowerHits = 0;
  sin.shade = 0;
  sin.slow = 0;
  sin.ruptureAmp = 0;
  sin.backstabAmp = 0;
}

export function comboCap(hasSilentHeart: boolean) {
  return hasSilentHeart ? 6 : 5;
}

export function poisonCap(hasBottomless: boolean, plagueCircuit: boolean) {
  return (hasBottomless ? 16 : 12) + (plagueCircuit ? 2 : 0);
}

export function shadeCap(hasEchoBody: boolean) {
  return hasEchoBody ? 4 : 3;
}
