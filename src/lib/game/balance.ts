import type { AffixStat, Rarity, SpotTier } from "./types";

/**
 * Single source of truth for game math.
 *
 * Design targets (at-level, commons, floor 1, uncommon-ish gear):
 *   trash TTK        5–8 s
 *   player survival  22–30 s  (death is possible on hot/apex/boss, rare on commons)
 *   apex HP / kill   25–35 %  (consistent with trash TTK × modest danger soak)
 *   boss TTK         28–42 s — longer, harder-hitting phase than trash (not a soft sponge)
 *   equal-BM PvP     TTK 10–16 s, survival 25–40 s, duel cost 25–40 %
 *   hit chance       ~93% same-level commons, floor 72%
 *
 * Level pacing (active farm, ~7 s / trash):
 *   1–10   ~3–5 min / level
 *   11–30  ~6–10 min
 *   31–60  ~10–16 min
 *   61–100 ~16–22 min
 * Total to 100 ≈ 18–22 h — interesting, not a brick wall.
 *
 * Combat power (БМ) is a first-class axis alongside level (Lineage-style):
 *   expectedBm(L) === combatPowerScore of an *invested* hunter at L
 *     (at-level kit, solid rarity, enhance-in-band — see investedGearProfile)
 *   spots require a slice of that curve (commons 82% … apex 138%)
 *   occupants / PvP rivals sit on the same numbers
 * Early game (≈1–10) stays approachable; the curve ramps hard after.
 */

/**
 * The design targets above, in machine-readable form. `scripts/report.ts` checks
 * the live tick loop against these, so drift shows up as a failing number
 * instead of a stale comment.
 */
/**
 * Survivability targets are per tier, because the tiers exist to mean different
 * things. Commons is the tier you can leave running; apex is the one that kills
 * you if you overreach. A single global "seconds to die" number was checked
 * against commons, where by design nothing threatens you — which made armour,
 * endurance and every heal look worthless while apex was in fact tuned fine.
 *
 * The two survivability numbers are linked, not independent: at a trash TTK of
 * `t` seconds, surviving `s` seconds means a kill costs roughly `t / s` of the
 * HP pool. Moving one without the other produces a pair of targets that no set
 * of constants can satisfy at once.
 *
 * Apex consistency with trash: danger HP mult is kept near ~1.4–1.6× (not 2×+),
 * so an apex pull lasts ~7–11 s when trash is 5–8 s. At survival 22–30 s that
 * lands HP cost near 25–35% — the three numbers must move together.
 */
export const TARGETS = {
  trashTtkSec: [5, 8] as const,
  bossTtkSec: [28, 42] as const,
  /**
   * Seconds of uninterrupted apex pressure before an unattended player dies.
   * Deliberately short: apex squares are contested and meant to be watched.
   */
  playerSurviveSec: [22, 30] as const,
  /**
   * Fraction of max HP a pull costs, counting passive regen but *not* lifesteal
   * or heals — i.e. the pressure a build is required to answer with its kit.
   * Commons sits above pure-regen break-even on purpose, so that lifesteal and
   * heal affixes have something to do; it is still far from lethal.
   */
  commonsHpCostPerKill: [0.04, 0.12] as const,
  /**
   * Soften from the old 40%+ floor: with trash at 5–8 s and apex only modestly
   * longer, a 22–30 s survival window spends ~25–35% of the pool per kill.
   * Apex is still a burst tier — just not a near-wipe per pull.
   */
  apexHpCostPerKill: [0.25, 0.35] as const,
  /**
   * Equal-BM duel (player vs generateRival at the same powerScore). Measured
   * duel-only — no PvE spawn after the kill/death, or the window pollutes TTK.
   */
  pvpTtkSec: [10, 16] as const,
  pvpSurviveSec: [25, 40] as const,
  pvpHpCostPerKill: [0.25, 0.4] as const,
  hitChancePct: 93,
  hoursToLevel100: [18, 22] as const,
} as const;

/**
 * Passive HP regen, as a fraction of max HP per second.
 *
 * In combat this has to stay far below incoming DPS, otherwise the player heals
 * through every hit and death becomes impossible — which in turn makes END,
 * armour, lifesteal, wards and every heal skill worthless. Idle regen is
 * generous on purpose: recovering between pulls should not be a waiting game.
 */
/** Seconds of downtime after a pack dies before the next spawn (autobattle pacing). */
export const PULL_DELAY_SEC = 0.55;

/**
 * Hidden combat index for open-world floor bosses. UI BM stays at location BM,
 * but HP (and a mild ATK bump) scale so the fight lasts ~5× longer than trash.
 */
export const LOCATION_BOSS_COMBAT_INDEX = {
  hp: 5,
  atk: 1.35,
  def: 1.15,
} as const;

export const REGEN = {
  inCombat: 0.0035,
  idle: 0.06,
} as const;

/**
 * Global cooldown. Without one, a hotbar of four ready skills fires all four in
 * the same 50 ms frame, which both trivialises fights and makes cooldown length
 * meaningless. Utility gets a shorter lockout so defensives still feel reactive.
 */
export const GCD = {
  offensive: 0.7,
  utility: 0.42,
  /** Skill haste shortens the GCD, but only partially — it should never vanish. */
  hasteScale: 0.4,
  min: 0.28,
} as const;

export function gcdLength(kind: "offensive" | "utility", skillHaste: number) {
  return Math.max(GCD.min, GCD[kind] / (1 + Math.max(0, skillHaste) * GCD.hasteScale));
}

/**
 * Single dial for the Assassin's ability damage.
 *
 * The Sin kit has ~50 interlocking multipliers across three transfiguration
 * paths, all carefully tuned relative to each other. Scaling that whole block
 * here keeps those relationships intact and leaves one honest number to tune
 * when the class drifts off parity with the other three.
 * Check parity with `npm run balance:parity`, which averages several runs —
 * a single run swings 30% on gear rolls alone and will lie to you.
 */
export const SIN_SKILL_SCALE = 0.4;

/**
 * Armour soft-cap target vs an *invested* same-level kit.
 *
 * The old flat `88 + 11.5×L` constant stopped tracking gear defense around
 * level 25, so mid/late kits were mitigating 55–78% of every hit. Death,
 * endurance and every heal became decorative — which is exactly the
 * "unkillable at 100k BM" failure mode. Anchoring K to reference invested
 * defense keeps same-level mitigation inside TARGETS' 15–28% band for the
 * whole 1–100 curve; heavier tanks still climb toward ~40%, glass sits ~12%.
 */
export const ARMOR_TARGET_MITIGATION = 0.22;

/**
 * Effective armour constant against an attacker of the given level.
 * Computed from the invested reference defense at that level so the curve
 * cannot drift away from gear again when affixes/enhance change.
 */
export function armorConstant(attackerLevel: number) {
  const def = referenceInvestedDefense(Math.max(1, attackerLevel));
  const t = ARMOR_TARGET_MITIGATION;
  return Math.max(1, def * ((1 - t) / t));
}

/** Same-level mitigation stays ~15–28% as the game grows. */
export function armorMitigation(defense: number, attackerLevel = 1) {
  const k = armorConstant(attackerLevel);
  return defense / (defense + k);
}

/**
 * The exponent, not the coefficient, is what shapes the journey: raising it
 * back-loads the grind so early levels still fly by while the last stretch to
 * TARGETS.hoursToLevel100 actually costs something. Verify with
 * `npm run balance:pace` after any change to XP rewards or monster HP.
 */
export function xpToNext(level: number) {
  const L = Math.max(1, level);
  return Math.round(58 * Math.pow(L, 1.74) + 36 * L);
}

export function guildXpToNext(level: number) {
  const L = Math.max(1, level);
  return Math.round(220 * Math.pow(L, 1.62) + 80 * L);
}

/**
 * Farming down is still useful gold/loot, but XP dries up after a 2-level cushion.
 * Pulling a bit above your level is a small XP bonus (the real prize is item level).
 */
export function xpLevelGapMult(playerLevel: number, monsterLevel: number) {
  const down = playerLevel - monsterLevel;
  if (down > 2) {
    return Math.max(0.28, 1 - 0.09 * (down - 2));
  }
  const up = monsterLevel - playerLevel;
  if (up > 0) return Math.min(1.12, 1 + up * 0.025);
  return 1;
}

export const PLAYER = {
  hpBase: 145,
  hpPerLevel: 20,
  hpPerEnd: 10.5,
  atkBase: 8,
  /**
   * Raised against agility's haste term. Agility was the best stat for all four
   * classes because attack speed is multiplicative and, unlike crit, had no cap
   * short of `intervalMin` — so a point of agility bought more than a point of
   * anything else no matter what you were playing. Verify with
   * `npm run balance:splits`: no split should dominate on every class.
   */
  atkPerStr: 2.2,
  atkPerLevel: 1.15,
  defPerEnd: 1.85,
  defPerLevel: 0.55,
  critBase: 5,
  /**
   * Agility feeds crit chance, crit damage, attack speed and accuracy at once,
   * so its coefficients have to stay small or it multiplies against itself.
   * Calibrated so the 50/30/15/5 reference hunter lands near 45% crit and a
   * ~0.9 s swing at level 100, while a dedicated 60% agility build reaches the
   * crit cap — the cap should be a build goal, not a default.
   */
  critPerAgi: 0.15,
  critCap: 72,
  critDmgBase: 150,
  /**
   * Nearly off agility on purpose. Crit damage is the fourth thing agility was
   * buying, and four multiplicative channels off one stat will always beat
   * strength's single linear one. Crit damage now comes mostly from affixes and
   * talents, which is also a more interesting thing to chase.
   */
  critDmgPerAgi: 0.03,
  intervalBase: 1.58,
  intervalPerAgi: 0.0017,
  intervalMin: 0.52,
  intervalMax: 1.72,
  /**
   * Intelligence used to do nothing at all unless you held a magic skill or the
   * heal, which made it dead weight for three of the four classes. It now buys
   * ability damage for everyone, so the stat is a real trade against strength
   * rather than a tax on the recommended 50/30/15/5 split.
   */
  skillDmgPerInt: 0.004,
  accBase: 88,
  accPerAgi: 0.32,
  accMin: 30,
  /**
   * The cap has to grow with level. A flat one was hit by the reference build
   * around level 60, which silently deleted every accuracy source above it —
   * the affix, the talent and the whole agility-for-accuracy build.
   */
  accCapBase: 104,
  accCapPerLevel: 1.7,
  hitFloor: 72,
  hitCeil: 98,
  dmgVarianceMin: 0.92,
  dmgVarianceMax: 1.08,
} as const;

/**
 * To-hit. The requirement has to climb with the target's level at roughly the
 * same rate accuracy does, otherwise every build pins itself to `hitCeil` by
 * level 8 and accuracy, the accuracy affix and Точность talent all stop
 * existing. Tuned so the reference hunter sits near TARGETS.hitChancePct on
 * same-level commons, with danger, bosses and level gaps eating into it, and
 * deliberate accuracy investment buying the rest of the way to the ceiling.
 */
export const HIT = {
  /**
   * Re-fit after softening the Точность talent and the accuracy affix — mid
   * levels were pinning both builds to hitCeil. `npm run balance:acc`.
   */
  base: 92.7,
  perLevelGap: 3.2,
  perTargetLevel: 0.73,
  perTargetDefense: 0.012,
  perDanger: 7,
  boss: 5,
  pvp: 3,
} as const;

export function accuracyCap(level: number) {
  return PLAYER.accCapBase + Math.max(1, level) * PLAYER.accCapPerLevel;
}

export const MONSTER = {
  /**
   * Fitted against measured player DPS so trash TTK stays inside
   * TARGETS.trashTtkSec across the whole 1–100 range. Player power compounds
   * (attack × haste × crit × skills) while HP used to be near-linear, which is
   * what collapsed late-game TTK to ~3 s. The linear and power terms trade off
   * against each other: raise `hpPerLevel` and lower `hpPowCoef` to lift early
   * levels without touching level 100. Re-fit with `npm run balance:parity`
   * whenever a player-side multiplier changes.
   *
   * Re-fit 2026-09: invested (matchSpotBm≈1) kits were melting trash in 2–4 s
   * once armour stopped deleting monster damage. Raised the HP curve so
   * equal-BM commons land in the 5–8 s target again; power term carries late.
   */
  hpFlat: 140,
  hpPerLevel: 100,
  hpPow: 1.82,
  hpPowCoef: 13.5,
  /**
   * Early attack kept soft on commons (danger≈1) so HP cost lands in TARGETS
   * at 1–16. Contested tiers skip the softener — apex pressure is dangerAtkExp.
   */
  atkFlat: 3.4,
  atkPerLevel: 3.85,
  /** Softens commons below this level toward `atkEarlyFloor`. */
  atkEarlyUntil: 40,
  atkEarlyFloor: 0.22,
  defFlat: 6,
  defPerLevel: 2.05,
  /**
   * XP: ~15% above the old curve so mid levels stay inside TARGETS pacing
   * (31–60 ≈ 10–16 min) instead of drifting toward ~17 min/level.
   */
  trashXpFlat: 20,
  trashXpPerLevel: 6.2,
  /**
   * Gold faucet. Old flat+perLevel left L40 trash at ~53/kill — auto-sell
   * lines of 80–180 drowned the combat log and field farm felt dead. Tuned
   * so same-level commons kill gold is the dominant income (~10× expected
   * sell/kill) and gold dungeons (×3.2) clearly outpace open world.
   */
  goldFlat: 16,
  goldPerLevel: 4.2,
  /** Mild lift with the gold curve — shards share spot/dungeon goldMult. */
  shardFlat: 1.4,
  shardPerLevel: 0.32,
  floorPower: 0.07,
  floorLevel: 1,
  floorXp: 0.08,
  bossLevelBonus: 3,
  /**
   * Boss identity: a real phase, not a fat trash pack.
   * HP × bossHp × (level/pivot)^exp lands TTK in TARGETS.bossTtkSec (~5–6× trash).
   * Steep level exp counters invested-gear DPS so endgame bosses stay long.
   * Attack is ABOVE trash (bossAtk > 1); bosses skip the commons early softener.
   */
  bossHp: 4.0,
  bossHpPivot: 32,
  bossHpLevelExp: 0.85,
  bossAtk: 1.32,
  bossDef: 1.24,
  bossXp: 8,
  bossGold: 9,
  bossShards: 8,
  bossInterval: 1.9,
  trashIntervalMin: 1.62,
  trashIntervalMax: 1.95,
  /**
   * attack *= danger ^ effectiveExp. Base is soft so early apex is contested
   * rather than a wipe; the level slope restores late equal-BM apex to the
   * 22–30 s / 25–35% kill-cost band after the armour fix.
   */
  dangerAtkExp: 2.5,
  dangerAtkPivot: 24,
  dangerAtkLevelSlope: 0.82,
  /**
   * HP *= danger ^ effectiveExp. Mild base + shallow level slope so early apex
   * does not soak forever while mid/late cost can still reach 25–35%.
   */
  dangerHpExp: 0.42,
  dangerHpPivot: 28,
  dangerHpLevelSlope: 0.85,
  /** Equal-BM rival stretch on top of the trash curve (see generateRival). */
  pvpHp: 1.65,
  pvpAtk: 1.48,
  pvpDef: 1.1,
  pvpInterval: 1.35,
} as const;

/**
 * Early-game attack softener for safe tiers only. Contested squares (danger>1)
 * keep the full level curve so apex survival is not accidentally softened.
 */
export function monsterAtkEarlyMult(level: number, danger = 1) {
  if (danger > 1.02) return 1;
  const L = Math.max(1, level);
  const until = MONSTER.atkEarlyUntil;
  if (L >= until) return 1;
  const t = (L - 1) / Math.max(1, until - 1);
  return MONSTER.atkEarlyFloor + (1 - MONSTER.atkEarlyFloor) * t;
}

/** Contested-tier HP exponent: soft early apex, firmer mid/late. */
export function dangerHpExponent(level: number) {
  const L = Math.max(1, level);
  return Math.max(
    0.05,
    MONSTER.dangerHpExp + (MONSTER.dangerHpLevelSlope * (L - MONSTER.dangerHpPivot)) / 70,
  );
}

/** Contested-tier attack exponent: soft early apex, firmer mid/late. */
export function dangerAtkExponent(level: number) {
  const L = Math.max(1, level);
  return Math.max(
    1.2,
    MONSTER.dangerAtkExp + (MONSTER.dangerAtkLevelSlope * (L - MONSTER.dangerAtkPivot)) / 70,
  );
}

/** Level-scaled boss HP multiplier on top of the flat bossHp dial. */
export function bossHpLevelMult(level: number) {
  const L = Math.max(1, level);
  return Math.pow(L / MONSTER.bossHpPivot, MONSTER.bossHpLevelExp);
}

export function monsterLevelOf(baseLevel: number, floor: number, isBoss: boolean) {
  return Math.max(
    1,
    Math.round(baseLevel + (Math.max(1, floor) - 1) * MONSTER.floorLevel + (isBoss ? MONSTER.bossLevelBonus : 0)),
  );
}

export function floorPowerMult(floor: number) {
  return 1 + (Math.max(1, floor) - 1) * MONSTER.floorPower;
}

export function monsterHp(level: number, floor: number, isBoss: boolean, danger: number, threat: number) {
  const L = Math.max(1, level);
  const base = MONSTER.hpFlat + L * MONSTER.hpPerLevel + Math.pow(L, MONSTER.hpPow) * MONSTER.hpPowCoef;
  const d = Math.max(0.5, danger);
  const bossMult = isBoss ? MONSTER.bossHp * bossHpLevelMult(L) : 1;
  return Math.round(
    base * floorPowerMult(floor) * Math.pow(d, dangerHpExponent(L)) * Math.max(0.5, threat) * bossMult,
  );
}

export function monsterAttack(level: number, floor: number, isBoss: boolean, danger: number, threat: number) {
  const L = Math.max(1, level);
  const d = Math.max(0.5, danger);
  const atkDanger = Math.pow(d, dangerAtkExponent(L));
  // Bosses never take the commons early softener — their pressure is the point.
  const early = isBoss ? 1 : monsterAtkEarlyMult(L, d);
  const base = (MONSTER.atkFlat + L * MONSTER.atkPerLevel) * early;
  return Math.round(
    base * floorPowerMult(floor) * atkDanger * Math.max(0.5, threat) * (isBoss ? MONSTER.bossAtk : 1),
  );
}

export function monsterDefense(level: number, floor: number, isBoss: boolean) {
  const L = Math.max(1, level);
  return Math.round((MONSTER.defFlat + L * MONSTER.defPerLevel) * floorPowerMult(floor) * (isBoss ? MONSTER.bossDef : 1));
}

export function monsterXpReward(level: number, floor: number, isBoss: boolean) {
  const L = Math.max(1, level);
  const floorXp = 1 + (Math.max(1, floor) - 1) * MONSTER.floorXp;
  return Math.round((MONSTER.trashXpFlat + L * MONSTER.trashXpPerLevel) * floorXp * (isBoss ? MONSTER.bossXp : 1));
}

export function monsterGoldReward(level: number, isBoss: boolean, roll: number) {
  const L = Math.max(1, level);
  return Math.round((MONSTER.goldFlat + L * MONSTER.goldPerLevel) * (isBoss ? MONSTER.bossGold : 1) * roll);
}

export function monsterShardReward(level: number, isBoss: boolean, roll: number) {
  const L = Math.max(1, level);
  return Math.round((MONSTER.shardFlat + L * MONSTER.shardPerLevel) * (isBoss ? MONSTER.bossShards : 1) * roll);
}

export function typicalMonsterDefense(level: number) {
  return monsterDefense(level, 1, false);
}

export const RARITY_IMPLICIT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.16,
  rare: 1.36,
  epic: 1.62,
  legendary: 1.95,
  mythic: 2.4,
};

export const RARITY_AFFIX: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.12,
  rare: 1.28,
  epic: 1.48,
  legendary: 1.75,
  mythic: 2.1,
};

export const AFFIX_COUNT: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
};

/** Affixes roll uniformly from this pool, which is what makes the average kit predictable. */
export const AFFIX_POOL: AffixStat[] = [
  "strength",
  "agility",
  "intelligence",
  "endurance",
  "critChance",
  "critDamage",
  "defense",
  "health",
  "attack",
  "accuracy",
];

export function affixRangeFor(stat: AffixStat, itemLevel: number, rarity: Rarity) {
  const rs = RARITY_AFFIX[rarity];
  const lv = Math.max(1, itemLevel);
  switch (stat) {
    case "strength":
    case "agility":
    case "intelligence":
    case "endurance":
      return { min: Math.max(1, lv * 0.22 * rs), max: lv * 0.55 * rs };
    case "attack":
      return { min: Math.max(1, lv * 0.28 * rs), max: lv * 0.72 * rs };
    case "defense":
      return { min: Math.max(1, lv * 0.3 * rs), max: lv * 0.75 * rs };
    case "health":
      return { min: 4 * lv * rs, max: 10 * lv * rs };
    case "critChance":
      return { min: 0.35 * rs, max: 0.85 * rs + lv * 0.025 };
    case "critDamage":
      return { min: 2.2 * rs, max: 5.5 * rs + lv * 0.1 };
    case "accuracy":
      // Level slope kept shallow so mid-game kits do not bury the to-hit curve
      // under hitCeil before agility investment has anywhere to go.
      return { min: 0.4 * rs, max: 0.9 * rs + lv * 0.022 };
    default:
      return { min: 1, max: 3 };
  }
}

export function itemImplicits(slot: string, itemLevel: number, rarity: Rarity) {
  const r = RARITY_IMPLICIT[rarity];
  const lv = Math.max(1, itemLevel);
  if (slot === "weapon") {
    return { attack: Math.round((5 + lv * 1.25) * r), defense: 0, health: 0 };
  }
  if (slot === "offhand") {
    return {
      attack: Math.round((1.5 + lv * 0.32) * r),
      defense: Math.round((3.5 + lv * 0.95) * r),
      health: Math.round(lv * 1.8 * r),
    };
  }
  if (slot === "ring" || slot === "amulet") {
    return { attack: Math.round(lv * 0.18 * r), defense: 0, health: Math.round(lv * 2.6 * r) };
  }
  return {
    attack: 0,
    defense: Math.round((2.5 + lv * 0.92) * r),
    health: Math.round((7 + lv * 3.8) * r),
  };
}

/** +15 ≈ ×1.61 — upgrades by item level stay better than slamming an old piece. */
export function enhanceMultiplier(level: number) {
  let m = 1 + level * 0.028;
  if (level >= 5) m += 0.03;
  if (level >= 10) m += 0.06;
  if (level >= 15) m += 0.1;
  return m;
}

export const DROP = {
  trashChance: 0.22,
  /**
   * Boss loot is a distinct payday: near-guaranteed first item, frequent second
   * item, and a real rarity bias — trash pity cannot compete on a single kill.
   */
  bossChance: 0.92,
  pvpChance: 0.32,
  chanceCap: 0.95,
  bossBonusItem: 0.48,
  bossRarity: 0.4,
  pvpRarity: 0.07,
  weights: {
    common: 64,
    uncommon: 24,
    rare: 8.5,
    epic: 2.6,
    legendary: 0.72,
    mythic: 0.18,
  } as Record<Rarity, number>,
} as const;

/**
 * `danger` multiplies monster HP (via dangerHpExp), so a kill on apex takes
 * modestly longer than commons — not a double soak. XP per kill therefore has
 * to clear that factor before the tier earns anything at all — otherwise the
 * contested, occupant-guarded squares pay *less* per hour than open commons.
 * Each xpMult clears danger plus a small premium; goldMult sits above that so
 * contested squares are visibly better gold/hour (shards share goldMult).
 */
export const SPOT_BALANCE: Record<
  SpotTier,
  {
    dropChanceMult: number;
    rarityBias: number;
    xpMult: number;
    goldMult: number;
    danger: number;
    pityKills: number;
  }
> = {
  commons: { dropChanceMult: 1, rarityBias: 0, xpMult: 1, goldMult: 1, danger: 1, pityKills: 7 },
  rich: { dropChanceMult: 1.42, rarityBias: 0.1, xpMult: 1.32, goldMult: 1.5, danger: 1.2, pityKills: 5 },
  hot: { dropChanceMult: 1.88, rarityBias: 0.2, xpMult: 1.68, goldMult: 2.0, danger: 1.42, pityKills: 4 },
  apex: { dropChanceMult: 2.28, rarityBias: 0.36, xpMult: 2.1, goldMult: 2.55, danger: 1.7, pityKills: 3 },
};

export const LOCATION_THREAT = {
  normal: 1,
  elite: 1.14,
  boss: 1.24,
} as const;

/**
 * Combat power (БМ) is a first-class axis, Lineage-style / mobile MMO harsh.
 *
 * Content BM tracks an *invested* player at level L — full at-level kit, solid
 * rarity for the bracket, enhance "вкруг" (see investedGearProfile). Soft
 * uncommon+0 builds sit well below same-level recommended BM after the early
 * game; that is intentional.
 *
 * Rough invested targets (expectedBm; live kits roll ≈+10–25% luck):
 *   L10 ≈ 2.5k   L40 ≈ 11k   L60 ≈ 20k   L80 ≈ 29k   L100 ≈ 41k
 * Open-world commons ask ~82% of that; dungeon halls use rich-tier × threat
 * (≈1.3–1.6× open commons). L100 content needs ~3.5–4× the BM of L40.
 *
 * Live powerScore uses the same weights, so the number you see IS the curve.
 *
 * Armour K tracks referenceInvestedDefense so same-level mitigation stays
 * ~22% across 1–100. BM-gated zones (`bmScale`) multiply monster HP/ATK in
 * generateMonster — required BM is no longer an empty gate.
 */
export const BM = {
  /**
   * Top of the band above the invested reference: mythic +15 / blessing / gems
   * (the "donate dump" ceiling), not mere epic+0.
   */
  high: 2.35,
  weights: {
    flat: 120,
    attack: 6.2,
    hp: 0.42,
    defense: 2.6,
    dps: 2,
    crit: 10,
    critDmg: 3.5,
    accuracy: 1.2,
    talent: 7,
    guild: 10,
  },
  /** Spot required BM vs expected BM of the zone's base level. */
  tierNeed: {
    commons: 0.82,
    rich: 1,
    hot: 1.18,
    apex: 1.38,
  } as Record<SpotTier, number>,
  kindNeed: {
    normal: 1,
    elite: 1.06,
    boss: 1.12,
  },
  /** Occupants sit slightly above the requirement so contest is a BM check. */
  occupantSit: {
    commons: 0.96,
    rich: 1,
    hot: 1.05,
    apex: 1.08,
  } as Record<SpotTier, number>,
} as const;

/**
 * Gear band a competitive player is expected to hold at level L.
 *
 * L1–10 stay soft (uncommon, little/no enhance). After that rarity and enhance
 * climb so L100 content needs many times the BM of L40 — not ~20% more.
 */
export function investedGearProfile(level: number): { rarity: Rarity; enhance: number } {
  const L = Math.max(1, level);
  if (L <= 8) return { rarity: "uncommon", enhance: 0 };
  if (L <= 14) return { rarity: "uncommon", enhance: Math.min(3, L - 8) };
  if (L <= 28) return { rarity: "rare", enhance: Math.min(7, 4 + Math.floor((L - 15) / 4)) };
  if (L <= 48) return { rarity: "rare", enhance: Math.min(11, 8 + Math.floor((L - 29) / 5)) };
  if (L <= 72) return { rarity: "epic", enhance: Math.min(13, 9 + Math.floor((L - 49) / 8)) };
  return { rarity: "epic", enhance: Math.min(15, 12 + Math.floor((L - 73) / 9)) };
}

export function expectedBm(level: number) {
  return typicalCore(level, true);
}

export function expectedBmBand(level: number) {
  const expected = expectedBm(level);
  return {
    low: typicalCore(level, false),
    expected,
    high: Math.round(expected * BM.high),
  };
}

export function spotRequiredBm(
  zoneLevel: number,
  tier: SpotTier,
  kind: "normal" | "elite" | "boss" = "normal",
) {
  return Math.max(1, Math.round(expectedBm(zoneLevel) * BM.tierNeed[tier] * (BM.kindNeed[kind] ?? 1)));
}

export function occupantBmBudget(
  zoneLevel: number,
  tier: SpotTier,
  kind: "normal" | "elite" | "boss" = "normal",
) {
  return Math.round(spotRequiredBm(zoneLevel, tier, kind) * BM.occupantSit[tier]);
}

export function mineOccupantBm(minLevel: number, index: number, slots: number) {
  const base = expectedBm(Math.max(1, minLevel));
  const t = slots <= 1 ? 1 : 0.88 + (index / Math.max(1, slots - 1)) * 0.24;
  return Math.round(base * t);
}

export function estimateLevelFromPower(power: number) {
  const p = Math.max(1, power);
  let lo = 1;
  let hi = 110;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (expectedBm(mid) < p) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export type BmFit = "weak" | "ok" | "good" | "over";

export function bmFit(playerBm: number, requiredBm: number): BmFit {
  const r = playerBm / Math.max(1, requiredBm);
  if (r < 0.82) return "weak";
  if (r < 1.02) return "ok";
  if (r < 1.28) return "good";
  return "over";
}

export const BM_FIT_LABEL: Record<BmFit, string> = {
  weak: "слабо",
  ok: "норма",
  good: "удобно",
  over: "фарм",
};

/** Damage you deal vs a spot's recommended BM. Ratio 1 → 1.0. */
export function bmOffenseMult(playerBm: number, requiredBm: number) {
  const r = playerBm / Math.max(1, requiredBm);
  // Undergeared hits harder of a brick wall; overgeared soft-caps sooner.
  return Math.max(0.38, Math.min(1.18, 0.42 + 0.58 * r));
}

/** Incoming damage vs a spot's recommended BM. Ratio 1 → 1.0. */
export function bmDefenseMult(playerBm: number, requiredBm: number) {
  const r = playerBm / Math.max(1, requiredBm);
  // Low BM vs recommended → die more; equal BM stays ~1.0.
  return Math.max(0.72, Math.min(1.85, 1.72 - 0.72 * r));
}

export function combatPowerScore(p: {
  attack: number;
  maxHp: number;
  defense: number;
  dps: number;
  critChance: number;
  critDamage: number;
  accuracy: number;
  talentRankSum: number;
  guildLevel: number;
}) {
  const w = BM.weights;
  return Math.round(
    w.flat +
      p.attack * w.attack +
      p.maxHp * w.hp +
      p.defense * w.defense +
      p.dps * w.dps +
      p.critChance * w.crit +
      Math.max(0, p.critDamage - 150) * w.critDmg +
      p.accuracy * w.accuracy +
      p.talentRankSum * w.talent +
      Math.max(0, p.guildLevel - 1) * w.guild,
  );
}

/** Display BM for a live monster from its combat stats (not spot gate). */
export function estimateMonsterBm(m: {
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackInterval: number;
}) {
  const dps = m.attack / Math.max(0.45, m.attackInterval);
  return Math.max(
    1,
    combatPowerScore({
      attack: m.attack,
      maxHp: m.maxHp,
      defense: m.defense,
      dps,
      critChance: 8,
      critDamage: 160,
      accuracy: 92,
      talentRankSum: Math.max(0, m.level - 1),
      guildLevel: 1,
    }),
  );
}

/** Stat points the reference hunter spends, matching the 50/30/15/5 split in the header. */
const TYPICAL_SPLIT = { strength: 0.5, agility: 0.3, endurance: 0.15, intelligence: 0.05 } as const;

const EQUIPPED_SLOTS = 8;
const ARMOUR_SLOTS = 4; // helmet, chest, gloves, boots
const TRINKET_SLOTS = 2; // ring, amulet

/**
 * Average affix payout of a full kit at a given rarity.
 *
 * Affixes are drawn uniformly from AFFIX_POOL, so each stat lands
 * `slots * affixCount / poolSize` times on average, at the midpoint of its range.
 * Modelling this explicitly is the whole reason expectedBm tracks live powerScore
 * instead of drifting a factor of 1.5 below it.
 */
function averageAffixes(L: number, rarity: Rarity) {
  const rolls = (EQUIPPED_SLOTS * AFFIX_COUNT[rarity]) / AFFIX_POOL.length;
  const mid = (stat: AffixStat) => {
    const { min, max } = affixRangeFor(stat, L, rarity);
    return ((min + max) / 2) * rolls;
  };
  return {
    strength: mid("strength"),
    agility: mid("agility"),
    endurance: mid("endurance"),
    intelligence: mid("intelligence"),
    attack: mid("attack"),
    defense: mid("defense"),
    health: mid("health"),
    critChance: mid("critChance"),
    critDamage: mid("critDamage"),
    accuracy: mid("accuracy"),
  };
}

/** Implicit payout of a full kit, summed straight from itemImplicits. */
function averageImplicits(L: number, rarity: Rarity) {
  const w = itemImplicits("weapon", L, rarity);
  const o = itemImplicits("offhand", L, rarity);
  const t = itemImplicits("ring", L, rarity);
  const a = itemImplicits("helmet", L, rarity);
  return {
    attack: w.attack + o.attack + t.attack * TRINKET_SLOTS + a.attack * ARMOUR_SLOTS,
    defense: w.defense + o.defense + t.defense * TRINKET_SLOTS + a.defense * ARMOUR_SLOTS,
    health: w.health + o.health + t.health * TRINKET_SLOTS + a.health * ARMOUR_SLOTS,
  };
}

/**
 * Defense of the invested reference hunter at level L. Shared by the BM curve
 * and the armour constant so the two cannot drift apart.
 */
export function referenceInvestedDefense(level: number) {
  const L = Math.max(1, level);
  const points = 5 * (L - 1);
  const { rarity, enhance } = investedGearProfile(L);
  const gearMult = enhanceMultiplier(enhance);
  const affix = averageAffixes(L, rarity);
  const impl = averageImplicits(L, rarity);
  const end = 8 + points * TYPICAL_SPLIT.endurance + affix.endurance * gearMult;
  return (
    end * PLAYER.defPerEnd +
    L * PLAYER.defPerLevel +
    impl.defense * gearMult +
    affix.defense * gearMult
  );
}

/**
 * Combat power of the invested reference hunter at a level. Mirrors deriveStats
 * term for term (including enhance on printed gear). If you change a stat
 * formula there, change it here too, then run `npm run balance:bm`.
 */
function typicalCore(level: number, withGear: boolean) {
  const L = Math.max(1, level);
  const points = 5 * (L - 1);
  const { rarity, enhance } = withGear
    ? investedGearProfile(L)
    : { rarity: "uncommon" as Rarity, enhance: 0 };
  const gearMult = withGear ? enhanceMultiplier(enhance) : 1;
  const affixRaw = withGear
    ? averageAffixes(L, rarity)
    : {
        strength: 0,
        agility: 0,
        endurance: 0,
        intelligence: 0,
        attack: 0,
        defense: 0,
        health: 0,
        critChance: 0,
        critDamage: 0,
        accuracy: 0,
      };
  const implRaw = withGear ? averageImplicits(L, rarity) : { attack: 0, defense: 0, health: 0 };
  const affix = {
    strength: affixRaw.strength * gearMult,
    agility: affixRaw.agility * gearMult,
    endurance: affixRaw.endurance * gearMult,
    intelligence: affixRaw.intelligence * gearMult,
    attack: affixRaw.attack * gearMult,
    defense: affixRaw.defense * gearMult,
    health: affixRaw.health * gearMult,
    critChance: affixRaw.critChance * gearMult,
    critDamage: affixRaw.critDamage * gearMult,
    accuracy: affixRaw.accuracy * gearMult,
  };
  const impl = {
    attack: implRaw.attack * gearMult,
    defense: implRaw.defense * gearMult,
    health: implRaw.health * gearMult,
  };

  const str = 8 + points * TYPICAL_SPLIT.strength + affix.strength;
  const agi = 4 + points * TYPICAL_SPLIT.agility + affix.agility;
  const end = 8 + points * TYPICAL_SPLIT.endurance + affix.endurance;

  // A level-L hunter has L-1 talent points; every one of them buys a rank.
  const talentRankSum = 1 + Math.max(0, L - 1);
  const talentStat = talentRankSum * TALENT_STAT_PER_RANK;

  const attack = PLAYER.atkBase + (str + talentStat) * PLAYER.atkPerStr + L * PLAYER.atkPerLevel + impl.attack + affix.attack;
  const maxHp = PLAYER.hpBase + L * PLAYER.hpPerLevel + end * PLAYER.hpPerEnd + impl.health + affix.health;
  const defense = withGear
    ? referenceInvestedDefense(L)
    : end * PLAYER.defPerEnd + L * PLAYER.defPerLevel + impl.defense + affix.defense;
  const critChance = Math.min(PLAYER.critCap, PLAYER.critBase + agi * PLAYER.critPerAgi + affix.critChance);
  const critDamage = PLAYER.critDmgBase + agi * PLAYER.critDmgPerAgi + affix.critDamage;
  const attackInterval = Math.max(
    PLAYER.intervalMin,
    PLAYER.intervalBase / (1 + agi * PLAYER.intervalPerAgi),
  );
  const typicalDef = typicalMonsterDefense(L);
  const avgHit =
    attack * (1 - armorMitigation(typicalDef, L)) * (1 + (critChance / 100) * (critDamage / 100 - 1));
  const dps = avgHit / attackInterval;
  const accuracy = Math.min(accuracyCap(L), PLAYER.accBase + agi * PLAYER.accPerAgi + affix.accuracy);
  return combatPowerScore({
    attack,
    maxHp,
    defense,
    dps,
    critChance,
    critDamage,
    accuracy,
    talentRankSum,
    guildLevel: 1,
  });
}

/** Rough stat value a talent rank is worth, used only by the reference curve. */
const TALENT_STAT_PER_RANK = 1.1;
