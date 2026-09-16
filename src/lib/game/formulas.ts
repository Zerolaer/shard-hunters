import {
  accuracyCap,
  affixRangeFor,
  armorMitigation as armorMitigationAt,
  combatPowerScore,
  enhanceMultiplier as enhanceMultiplierOf,
  guildXpToNext as guildXpToNextOf,
  HIT,
  PLAYER,
  TARGETS,
  typicalMonsterDefense,
  xpLevelGapMult as xpLevelGapMultOf,
  xpToNext as xpToNextOf,
} from "./balance";
import { CLASS_DEFS } from "./classes";
import { guildCombatBonuses } from "./guild";
import { SKILLS } from "./constants";
import { itemGemStat, socketedGems } from "./gems";
import { rand } from "./rng";
import { BLESSING } from "./workshop";
import { isMaterialItem, echoQty } from "./echoCraft";
import { collectSinBonuses } from "./sin/tree";
import { sinMasteryBonuses } from "./sin/ranks";
import { collectTalentBonuses } from "./talents";
import type {
  AffixStat,
  Character,
  DerivedStats,
  EquipSlot,
  GuildState,
  Item,
  Rarity,
} from "./types";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export { irand, pick, rand, uid } from "./rng";

export const xpToNext = xpToNextOf;
export const guildXpToNext = guildXpToNextOf;
export const enhanceMultiplier = enhanceMultiplierOf;
export const xpLevelGapMult = xpLevelGapMultOf;

/**
 * Everything printed on the item scales by this: enhancement, then blessing.
 * Socketed gems deliberately sit outside it — they are a parallel axis and
 * compounding the two would make a blessed item worth more gem than gem.
 */
export function itemStatMultiplier(item: Item) {
  return enhanceMultiplier(item.enhanceLevel) * (item.blessed ? BLESSING.statMult : 1);
}

function statWeight(stat: AffixStat) {
  if (stat === "critChance") return 8;
  if (stat === "accuracy") return 6;
  if (stat === "critDamage") return 3;
  if (stat === "health") return 0.12;
  return 1;
}

export function itemPower(item: Item) {
  if (isMaterialItem(item)) return 0;
  const m = itemStatMultiplier(item);
  const affix = item.affixes.reduce((s, a) => s + a.value * statWeight(a.stat), 0);
  const gems = socketedGems(item).reduce(
    (s, gem) => s + gem.affixes.reduce((g, a) => g + a.value * statWeight(a.stat), 0),
    0,
  );
  return Math.round(
    (item.implicitAttack * 1.4 + item.implicitDefense + item.implicitHealth * 0.08 + affix) * m +
      gems,
  );
}

export function affixRange(stat: AffixStat, itemLevel: number, rarity: Rarity) {
  return affixRangeFor(stat, itemLevel, rarity);
}

export function isPercentAffix(stat: AffixStat) {
  return stat === "critChance" || stat === "critDamage" || stat === "accuracy";
}

export function formatAffix(stat: AffixStat, value: number) {
  if (isPercentAffix(stat)) {
    return `+${value.toFixed(1)}%`;
  }
  return `+${Math.round(value)}`;
}

export function armorMitigation(defense: number, attackerLevel = 1) {
  return armorMitigationAt(defense, attackerLevel);
}

export function rollHit(
  attack: number,
  defense: number,
  critChance: number,
  critDamage: number,
  attackerLevel = 1,
) {
  const mitigated = attack * (1 - armorMitigation(defense, attackerLevel));
  const variance = rand(PLAYER.dmgVarianceMin, PLAYER.dmgVarianceMax);
  let value = Math.max(1, mitigated * variance);
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) value *= critDamage / 100;
  return { value: Math.round(value), isCrit };
}

export function getItemAffixTotal(item: Item | null, stat: AffixStat) {
  if (!item) return 0;
  const fromAffix = item.affixes
    .filter((a) => a.stat === stat)
    .reduce((s, a) => s + a.value, 0);
  return fromAffix * itemStatMultiplier(item) + itemGemStat(item, stat);
}

export function collectGear(equipment: Record<EquipSlot, Item | null>) {
  const items = Object.values(equipment).filter(Boolean) as Item[];
  const mStat = (stat: AffixStat) =>
    items.reduce((s, it) => s + getItemAffixTotal(it, stat), 0);

  const implAtk = items.reduce((s, it) => s + it.implicitAttack * itemStatMultiplier(it), 0);
  const implDef = items.reduce((s, it) => s + it.implicitDefense * itemStatMultiplier(it), 0);
  const implHp = items.reduce((s, it) => s + it.implicitHealth * itemStatMultiplier(it), 0);

  return {
    strength: mStat("strength"),
    agility: mStat("agility"),
    intelligence: mStat("intelligence"),
    endurance: mStat("endurance"),
    critChance: mStat("critChance"),
    critDamage: mStat("critDamage"),
    defense: mStat("defense") + implDef,
    health: mStat("health") + implHp,
    attack: mStat("attack") + implAtk,
    accuracy: mStat("accuracy"),
    itemPower: items.reduce((s, it) => s + itemPower(it), 0),
  };
}

export function hitRequirement(opts: {
  playerLevel: number;
  monsterLevel: number;
  monsterDefense: number;
  danger: number;
  isBoss?: boolean;
  isPvp?: boolean;
}) {
  const levelDelta = opts.monsterLevel - opts.playerLevel;
  return (
    HIT.base +
    levelDelta * HIT.perLevelGap +
    Math.max(1, opts.monsterLevel) * HIT.perTargetLevel +
    (opts.danger - 1) * HIT.perDanger +
    opts.monsterDefense * HIT.perTargetDefense +
    (opts.isBoss ? HIT.boss : 0) +
    (opts.isPvp ? HIT.pvp : 0)
  );
}

/**
 * HIT is calibrated so the reference hunter's accuracy equals `required` on
 * same-level commons, which is why the target sits here as the offset: zero
 * gap means exactly TARGETS.hitChancePct, and every point above it is earned.
 */
export function hitChancePercent(accuracy: number, required: number) {
  return clamp(TARGETS.hitChancePct + accuracy - required, PLAYER.hitFloor, PLAYER.hitCeil);
}

export function hitChanceVsMonster(
  accuracy: number,
  playerLevel: number,
  monster: { level: number; defense: number; isBoss: boolean; isPvp: boolean },
  danger: number,
) {
  const required = hitRequirement({
    playerLevel,
    monsterLevel: monster.level,
    monsterDefense: monster.defense,
    danger,
    isBoss: monster.isBoss,
    isPvp: monster.isPvp,
  });
  return hitChancePercent(accuracy, required);
}

export function rollAccuracyHit(
  accuracy: number,
  playerLevel: number,
  monster: { level: number; defense: number; isBoss: boolean; isPvp: boolean },
  danger: number,
) {
  const chance = hitChanceVsMonster(accuracy, playerLevel, monster, danger);
  return { hit: Math.random() * 100 < chance, chance };
}

export function statsOf(state: {
  character: Character;
  equipment: Record<EquipSlot, Item | null>;
  guild: GuildState;
  talents: { ranks: Record<string, number> };
  sinBuild?: {
    ranks: Record<string, number>;
    mastery?: number;
    skillRanks?: Partial<Record<string, number>>;
    artRanks?: Partial<Record<string, number>>;
  };
}) {
  const sum = (r?: Partial<Record<string, number>>) =>
    Object.values(r ?? {}).reduce<number>((s, n) => s + (n ?? 0), 0);
  return deriveStats(
    state.character,
    state.equipment,
    state.guild,
    state.talents.ranks,
    state.sinBuild?.ranks,
    state.sinBuild?.mastery ?? 0,
    sum(state.sinBuild?.skillRanks) + sum(state.sinBuild?.artRanks),
  );
}

export function deriveStats(
  character: Character,
  equipment: Record<EquipSlot, Item | null>,
  guild: GuildState,
  talentRanks: Record<string, number> = {},
  sinRanks: Record<string, number> = {},
  sinMastery = 0,
  sinSkillRankSum = 0,
): DerivedStats {
  const gear = collectGear(equipment);
  const talents = collectTalentBonuses(talentRanks);
  const sin = collectSinBonuses(sinRanks);
  const mastery = sinMasteryBonuses(sinMastery);
  const bonus = {
    strength: talents.strength + sin.strength,
    agility: talents.agility + sin.agility,
    intelligence: talents.intelligence + sin.intelligence,
    endurance: talents.endurance + sin.endurance,
    attack: talents.attack + sin.attack,
    defense: talents.defense + sin.defense,
    health: talents.health + sin.health,
    critChance: talents.critChance + sin.critChance + mastery.critChance,
    critDamage: talents.critDamage + sin.critDamage,
    skillHaste: talents.skillHaste + sin.skillHaste,
    skillDamage: talents.skillDamage + sin.skillDamage + mastery.skillDamage,
    lifesteal: talents.lifesteal + sin.lifesteal,
    dropBonus: talents.dropBonus + sin.dropBonus,
    xpBonus: talents.xpBonus + sin.xpBonus,
    accuracy: talents.accuracy + sin.accuracy,
  };
  const cls = character.classId ? CLASS_DEFS[character.classId].passive : null;
  const guildB = guildCombatBonuses(guild);
  bonus.lifesteal += cls?.lifesteal ?? 0;
  bonus.attack += guildB.attack;
  bonus.health += guildB.health;
  bonus.defense += guildB.defense;
  bonus.skillHaste += guildB.skillHaste;
  const str = character.strength + gear.strength + bonus.strength;
  const agi = character.agility + gear.agility + bonus.agility + (cls?.agility ?? 0);
  const end = character.endurance + gear.endurance + bonus.endurance;
  const intel = character.intelligence + gear.intelligence + bonus.intelligence + (cls?.intelligence ?? 0);

  const maxHp = Math.round(
    PLAYER.hpBase +
      character.level * PLAYER.hpPerLevel +
      end * PLAYER.hpPerEnd +
      gear.health +
      bonus.health +
      (cls?.health ?? 0),
  );
  const attack = Math.round(
    PLAYER.atkBase +
      str * PLAYER.atkPerStr +
      character.level * PLAYER.atkPerLevel +
      gear.attack +
      bonus.attack +
      (cls?.attack ?? 0),
  );
  const defense = Math.round(
    end * PLAYER.defPerEnd +
      character.level * PLAYER.defPerLevel +
      gear.defense +
      bonus.defense +
      (cls?.defense ?? 0),
  );
  const critChance = clamp(
    PLAYER.critBase + agi * PLAYER.critPerAgi + gear.critChance + bonus.critChance + (cls?.critChance ?? 0),
    0,
    PLAYER.critCap,
  );
  const critDamage = PLAYER.critDmgBase + gear.critDamage + agi * PLAYER.critDmgPerAgi + bonus.critDamage + (cls?.critDamage ?? 0);
  const attackInterval = clamp(
    PLAYER.intervalBase / (1 + agi * PLAYER.intervalPerAgi + bonus.skillHaste * 0.35),
    PLAYER.intervalMin,
    PLAYER.intervalMax,
  );

  const skillDamageBonus = bonus.skillDamage + (cls?.skillDamage ?? 0) + intel * PLAYER.skillDmgPerInt;
  const typicalDef = typicalMonsterDefense(character.level);
  const avgHit =
    attack *
    (1 - armorMitigation(typicalDef, character.level)) *
    (1 + (critChance / 100) * (critDamage / 100 - 1));
  const dps = (avgHit / attackInterval) * (1 + skillDamageBonus * 0.35);

  const xpBonus = bonus.xpBonus + guildB.xpBonus;
  const dropBonus = bonus.dropBonus + guildB.dropBonus;

  const accuracy = clamp(
    PLAYER.accBase + agi * PLAYER.accPerAgi + gear.accuracy + bonus.accuracy + (cls?.accuracy ?? 0),
    PLAYER.accMin,
    accuracyCap(character.level),
  );

  // Every point the player spent has to land here. The assassin sinks most of
  // its points into skill ranks and mastery rather than the tree; leaving those
  // out made it read 15% weaker than it plays, which then fed bmDefenseMult and
  // charged it extra incoming damage for power it actually had.
  const talentRankSum =
    Object.values(talentRanks).reduce((s, n) => s + n, 0) +
    Object.values(sinRanks).reduce((s, n) => s + n, 0) +
    sinMastery +
    sinSkillRankSum;
  const powerScore = combatPowerScore({
    attack,
    maxHp,
    defense,
    dps,
    critChance,
    critDamage,
    accuracy,
    talentRankSum,
    guildLevel: guild.id ? guild.level : 1,
  });

  return {
    maxHp,
    attack,
    defense,
    critChance,
    critDamage,
    attackInterval,
    dps,
    powerScore,
    accuracy,
    xpBonus,
    dropBonus,
    skillHaste: bonus.skillHaste,
    skillDamageBonus,
    lifesteal: bonus.lifesteal,
    strength: str,
    agility: agi,
    intelligence: intel,
    endurance: end,
  };
}

export function skillDamage(
  skillId: string,
  character: Character,
  derived: DerivedStats,
  equipment: Record<EquipSlot, Item | null>,
  targetHpRatio = 1,
) {
  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) return 0;
  const str = derived.strength;
  const agi = derived.agility;
  const intel = derived.intelligence;

  if (skill.kind === "heal") {
    // skillDamageBonus already carries an intelligence term, so the explicit one
    // here is trimmed to keep total heal scaling near the original 1%/point.
    return Math.round(derived.maxHp * skill.multiplier * (1 + intel * 0.008 + derived.skillDamageBonus));
  }
  if (skill.kind === "buff") return 0;

  let base = derived.attack * skill.multiplier;
  if (skill.kind === "magic") base = (derived.attack * 0.5 + intel * 2.8) * skill.multiplier;
  if (skill.kind === "agility") base = (derived.attack * 0.72 + agi * 2.4) * skill.multiplier;
  if (skill.kind === "physical") base = (derived.attack + str * 0.9) * skill.multiplier;
  base *= 1 + derived.skillDamageBonus;
  if (skillId === "execute" && targetHpRatio < 0.35) base *= 2.2;
  if (skillId === "backstab") base *= 1.12;
  return Math.round(base);
}

export function goldFromSell(item: Item) {
  if (isMaterialItem(item)) return echoQty(item) * 2;
  const rarityGold: Record<Rarity, number> = {
    common: 4,
    uncommon: 10,
    rare: 22,
    epic: 55,
    legendary: 140,
    mythic: 380,
  };
  return Math.round(
    rarityGold[item.rarity] * (1 + item.itemLevel * 0.18) * (1 + item.enhanceLevel * 0.08),
  );
}

export function oreFromSalvage(item: Item) {
  const rarityOre: Record<Rarity, number> = {
    common: 1,
    uncommon: 2,
    rare: 4,
    epic: 8,
    legendary: 18,
    mythic: 40,
  };
  return Math.round(rarityOre[item.rarity] * (1 + item.itemLevel * 0.08) + item.enhanceLevel);
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return n.toLocaleString("ru-RU");
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Full digits with ru-RU grouping. Never abbreviate combat power (БМ). */
export function formatFullDigits(n: number) {
  return Math.round(n).toLocaleString("ru-RU");
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м`;
  return `${Math.max(1, Math.round(seconds))}с`;
}
