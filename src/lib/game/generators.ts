import {
  estimateLevelFromPower,
  itemImplicits,
  monsterAttack,
  monsterDefense,
  monsterGoldReward,
  monsterHp,
  monsterLevelOf,
  monsterShardReward,
  monsterXpReward,
  MONSTER,
} from "./balance";
import { CLASS_DEFS, HUNTER_CLASSES } from "./classes";
import {
  AFFIX_POOL,
  BOSS_DROP_CHANCE,
  BOSS_RARITY_BONUS,
  DROP_CHANCE_CAP,
  DROP_WEIGHTS,
  KILLS_FOR_BOSS,
  LOCATION_BY_ID,
  LOCATIONS,
  NAME_PREFIX,
  PVP_DROP_CHANCE,
  PVP_RARITY_BONUS,
  SLOT_BASE_NAME,
  TRASH_DROP_CHANCE,
} from "./constants";
import { affixRange, irand, pick, rand, uid } from "./formulas";
import type {
  Affix,
  AffixStat,
  EquipSlot,
  HunterClass,
  Item,
  LocationProgress,
  Monster,
  Rarity,
} from "./types";
import { GEAR_SLOTS, RARITIES, isArtifactSlot } from "./types";

export function rollRarity(dropBonus: number): Rarity {
  const boost = 1 + Math.max(0, dropBonus);
  const weights = RARITIES.map((r, i) => {
    const base = DROP_WEIGHTS[r];
    const rarityLift = 1 + i * 0.18 * (boost - 1);
    return r === "common" ? base / boost : base * rarityLift;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITIES.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return RARITIES[i]!;
  }
  return "common";
}

export function affixCount(rarity: Rarity) {
  const map: Record<Rarity, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 6,
  };
  return map[rarity];
}

function rollAffixes(itemLevel: number, rarity: Rarity, slot: EquipSlot): Affix[] {
  const count = affixCount(rarity);
  const pool = [...AFFIX_POOL];
  if (slot === "weapon") {
    // weapons bias toward offense
  }
  const result: Affix[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = irand(0, pool.length - 1);
    const stat = pool.splice(idx, 1)[0] as AffixStat;
    const { min, max } = affixRange(stat, itemLevel, rarity);
    const raw = rand(min, max);
    const value =
      stat === "critChance" || stat === "critDamage" || stat === "accuracy"
        ? Math.round(raw * 10) / 10
        : Math.round(raw);
    result.push({
      stat,
      value: Math.max(stat === "critChance" || stat === "accuracy" ? 0.2 : 1, value),
    });
  }
  return result;
}

function implicits(slot: EquipSlot, itemLevel: number, rarity: Rarity) {
  return itemImplicits(slot, itemLevel, rarity);
}

function rollClassLock(preferred?: HunterClass | null): HunterClass {
  if (preferred && Math.random() < 0.62) return preferred;
  return pick(HUNTER_CLASSES);
}

export function generateItem(opts: {
  itemLevel: number;
  rarity?: Rarity;
  slot?: EquipSlot;
  dropBonus?: number;
  preferredClass?: HunterClass | null;
  classLock?: HunterClass;
}): Item {
  const rarity = opts.rarity ?? rollRarity(opts.dropBonus ?? 0);
  const slot = opts.slot ?? pick([...GEAR_SLOTS]);
  const itemLevel = Math.max(1, opts.itemLevel);
  const prefix = pick(NAME_PREFIX[rarity]);
  const classLock =
    slot === "weapon" || slot === "offhand"
      ? (opts.classLock ?? rollClassLock(opts.preferredClass))
      : undefined;
  const def = classLock ? CLASS_DEFS[classLock] : null;
  const base = def
    ? pick(slot === "weapon" ? def.weaponBases : def.offhandBases)
    : pick(SLOT_BASE_NAME[slot]);
  const impl = implicits(slot, itemLevel, rarity);
  // Artifacts lean slightly stronger on implicits — they can break on enhance.
  const artMult = isArtifactSlot(slot) ? 1.18 : 1;
  return {
    id: uid(),
    name: isArtifactSlot(slot) ? `${prefix} ${pick(["Реликт", "Печать", "Осколок власти", "Талисман бездны"])}` : `${prefix} ${base}`,
    slot,
    rarity,
    itemLevel,
    enhanceLevel: 0,
    affixes: rollAffixes(itemLevel, rarity, slot),
    implicitAttack: Math.round(impl.attack * artMult),
    implicitDefense: Math.round(impl.defense * artMult),
    implicitHealth: Math.round(impl.health * artMult),
    classLock,
  };
}

/** Rare boss/trash chance to drop an artifact piece for one of the three slots. */
export function maybeRollArtifactSlot(kind: LootKind): EquipSlot | null {
  const chance = kind === "boss" ? 0.08 : kind === "pvp" ? 0.03 : 0.012;
  if (Math.random() >= chance) return null;
  return pick(["artifact1", "artifact2", "artifact3"] as const);
}

export function generateMonster(opts: {
  locationId: string;
  floor: number;
  isBoss: boolean;
  danger?: number;
  /** Override location base level (arena bosses, special encounters). */
  baseLevel?: number;
  threat?: number;
  bmScale?: number;
}): Monster {
  const loc = LOCATION_BY_ID[opts.locationId] ?? LOCATIONS[0]!;
  const danger = opts.danger ?? 1;
  const threat = opts.threat ?? loc.threat ?? 1;
  const level = monsterLevelOf(opts.baseLevel ?? loc.baseLevel, opts.floor, opts.isBoss);
  /**
   * `bmScale` raises the zone's required BM without changing level. If combat
   * stats ignore it, a 100k-BM hunter walks into a 140k-BM square and farms
   * level-curve trash — the classic "required BM is a lie" failure. Scale HP
   * and attack with the budget; defense climbs slower so armour stays a choice.
   */
  const bmScale = Math.max(1, opts.bmScale ?? loc.bmScale ?? 1);
  // ATK scales a bit under the BM gate so threat+danger don't double-count;
  // HP tracks the gate so equal-BM pulls still last a real fight.
  const atkScale = Math.pow(bmScale, 0.82);
  const defScale = Math.pow(bmScale, 0.5);
  const hp = Math.round(monsterHp(level, opts.floor, opts.isBoss, danger, threat) * bmScale);
  const attack = Math.round(monsterAttack(level, opts.floor, opts.isBoss, danger, threat) * atkScale);
  const defense = Math.round(monsterDefense(level, opts.floor, opts.isBoss) * defScale);
  const xp = monsterXpReward(level, opts.floor, opts.isBoss);
  const gold = monsterGoldReward(level, opts.isBoss, rand(0.88, 1.14));
  const shards = monsterShardReward(level, opts.isBoss, rand(0.85, 1.18));
  return {
    id: uid(),
    name: opts.isBoss ? loc.bossName : pick(loc.mobNames),
    isBoss: opts.isBoss,
    isPvp: false,
    level,
    hp,
    maxHp: hp,
    attack,
    defense,
    attackInterval: opts.isBoss ? MONSTER.bossInterval : rand(MONSTER.trashIntervalMin, MONSTER.trashIntervalMax),
    xp,
    gold,
    shards,
  };
}

export function generateRival(opts: {
  name: string;
  power: number;
}): Monster {
  const p = Math.max(80, opts.power);
  const level = estimateLevelFromPower(p);
  // Tuned for TARGETS.pvp*: equal-BM duels should last ~10–16 s and cost
  // ~25–40% of the pool. Danger 1 keeps early-attack softener and trash curve,
  // then the PVP mults stretch soak/pressure independently of farm tiers.
  const hp = Math.round(monsterHp(level, 1, false, 1, 1) * MONSTER.pvpHp);
  const attack = Math.round(monsterAttack(level, 1, false, 1, 1) * MONSTER.pvpAtk);
  const defense = Math.round(monsterDefense(level, 1, false) * MONSTER.pvpDef);
  return {
    id: uid(),
    name: opts.name,
    isBoss: false,
    isPvp: true,
    level,
    hp,
    maxHp: hp,
    attack,
    defense,
    attackInterval: MONSTER.pvpInterval,
    xp: Math.round(monsterXpReward(level, 1, false) * 1.35),
    gold: monsterGoldReward(level, false, rand(1.1, 1.35)),
    shards: monsterShardReward(level, false, rand(1.05, 1.3)),
  };
}

export type LootKind = "trash" | "boss" | "pvp";

export function dropChanceFor(kind: LootKind): number {
  if (kind === "boss") return BOSS_DROP_CHANCE;
  if (kind === "pvp") return PVP_DROP_CHANCE;
  return TRASH_DROP_CHANCE;
}

export function rarityBonusFor(kind: LootKind): number {
  if (kind === "boss") return BOSS_RARITY_BONUS;
  if (kind === "pvp") return PVP_RARITY_BONUS;
  return 0;
}

/** Final per-roll chance after guild/talent dropBonus and farm-spot multiplier. */
export function finalDropChance(kind: LootKind, dropBonus: number, spotMult = 1) {
  const scaled = dropChanceFor(kind) * (1 + Math.max(0, dropBonus)) * spotMult;
  return Math.min(DROP_CHANCE_CAP, scaled);
}

export function emptyLocationProgress(): LocationProgress {
  return { floor: 1, killsOnFloor: 0, bossReady: false, cleared: false };
}

export function shouldUnlockBoss(kills: number) {
  return kills > 0 && kills % KILLS_FOR_BOSS === 0;
}
