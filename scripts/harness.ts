/**
 * Live balance harness. Builds a real GameData and drives the real tickGame loop,
 * so every number here comes from the shipping code — no duplicated constants.
 */
import { expectedBm, REGEN, spotRequiredBm } from "../src/lib/game/balance";
import { emptyEquipment, INVENTORY_SIZE, LOCATIONS, SKILLS } from "../src/lib/game/constants";
import { createInitialState } from "../src/lib/game/createInitialState";
import { statsOf } from "../src/lib/game/formulas";
import { generateItem, generateMonster, emptyLocationProgress } from "../src/lib/game/generators";
import { FARM_SPOT_BY_ID, FARM_SPOTS } from "../src/lib/game/spots";
import { canAllocateTalent, TALENTS } from "../src/lib/game/talents";
import { applyClassChoice } from "../src/lib/game/classKit";
import { canAllocateSinNode, SIN_NODES } from "../src/lib/game/sin/tree";
import { canRankSinSkill, syncUnlockedSinRanks } from "../src/lib/game/sin/ranks";
import { unlockedSinSkills } from "../src/lib/game/sin/tree";
import { tickGame } from "../src/lib/game/tick";
import { EQUIP_SLOTS } from "../src/lib/game/types";
import type {
  CoreStat,
  EquipSlot,
  GameData,
  HunterClass,
  Rarity,
  SinPathId,
  SinSkillId,
  SkillId,
} from "../src/lib/game/types";

export type Split = Partial<Record<CoreStat, number>>;

export interface BuildOpts {
  level: number;
  cls: HunterClass;
  split: Split;
  ilvl?: number;
  rarity?: Rarity;
  enhance?: number;
  /** Farm square tier + location to sit on. */
  locationId?: string;
  tier?: "commons" | "rich" | "hot" | "apex";
  floor?: number;
  guildLevel?: number;
  hotbar?: (SkillId | null)[];
  /** Trade one damage slot for a defensive skill, as a player does on bosses. */
  defensiveSlot?: boolean;
  /**
   * Upgrade gear until combat power reaches this fraction of the square's
   * `requiredBm`, overriding `rarity`/`enhance`.
   *
   * Fixed soft gear (uncommon +0) sits well below invested expectedBm after
   * early game, so measuring apex without this reports undergear punishment,
   * not whether the tier is tuned.
   */
  matchSpotBm?: number;
  sinPath?: SinPathId;
  /** Leave talents unspent (simulates a player who ignored the tree). */
  noTalents?: boolean;
}

const CORE: CoreStat[] = ["strength", "agility", "endurance", "intelligence"];

function spendStats(state: GameData, split: Split) {
  const total = state.character.unspentPoints;
  const weights = CORE.map((s) => split[s] ?? 0);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let spent = 0;
  CORE.forEach((stat, i) => {
    const n = i === CORE.length - 1 ? total - spent : Math.floor((total * weights[i]!) / sum);
    state.character[stat] += n;
    spent += n;
  });
  state.character.unspentPoints = 0;
}

function spendTalents(state: GameData) {
  let guard = 500;
  while (state.talents.points > 0 && guard-- > 0) {
    const node = TALENTS.find((n) => canAllocateTalent(state.talents.ranks, n.id, state.talents.points));
    if (!node) break;
    state.talents.points -= 1;
    state.talents.ranks[node.id] = (state.talents.ranks[node.id] ?? 0) + 1;
  }
}

function spendSin(state: GameData, path: SinPathId) {
  state.sinBuild.path = path;
  state.sinBuild.ranks["sin-starter"] = 1;
  syncUnlockedSinRanks(state.sinBuild);
  let guard = 2000;
  // tree first, own path only, then dump leftovers into power ranks
  while (state.talents.points > 0 && guard-- > 0) {
    const node = SIN_NODES.find(
      (n) => n.path === path && canAllocateSinNode(state.sinBuild.ranks, n.id, state.talents.points, path),
    );
    if (!node) break;
    state.talents.points -= 1;
    state.sinBuild.ranks[node.id] = (state.sinBuild.ranks[node.id] ?? 0) + 1;
    syncUnlockedSinRanks(state.sinBuild);
  }
  guard = 2000;
  while (state.talents.points > 0 && guard-- > 0) {
    const id = unlockedSinSkills(state.sinBuild.ranks).find((s) =>
      canRankSinSkill(state.sinBuild, state.talents.points, s),
    );
    if (!id) break;
    state.talents.points -= 1;
    state.sinBuild.skillRanks[id] = (state.sinBuild.skillRanks[id] ?? 1) + 1;
  }
}

/**
 * Four damage skills by default, which is what a player runs on trash — nobody
 * dies there, so nobody gives up a slot. Pass `defensiveSlot` for boss work,
 * where a player trades one slot for survivability.
 *
 * Measuring bosses with a pure-throughput bar is what made the Assassin look
 * unable to fight them at all: its three defensive skills sit at positions
 * 12–15 of the damage order and never made the bar.
 */
function autoHotbar(state: GameData, opts: { defensiveSlot?: boolean } = {}): (SkillId | null)[] {
  const take = (order: readonly string[], have: readonly string[], n: number) =>
    order.filter((id) => have.includes(id)).slice(0, n);

  if (state.character.classId === "assassin") {
    const ids = unlockedSinSkills(state.sinBuild.ranks);
    const damage: SinSkillId[] = [
      "sin-backstab", "sin-eviscerate", "sin-flurry", "sin-execute",
      "sin-venom", "sin-rupture", "sin-fan", "sin-ambush", "sin-garrote",
      "sin-mark", "sin-nightblade", "sin-shadowstep",
    ];
    const defensive: SinSkillId[] = ["sin-veil", "sin-clone", "sin-vanish"];
    const slots = opts.defensiveSlot
      ? [...take(defensive, ids, 1), ...take(damage, ids, 3)]
      : take(damage, ids, 4);
    return [slots[0] ?? null, slots[1] ?? null, slots[2] ?? null, slots[3] ?? null] as (SkillId | null)[];
  }

  const unlocked = TALENTS.filter((n) => n.skillId && (state.talents.ranks[n.id] ?? 0) > 0).map((n) => n.skillId!);
  const damage: SkillId[] = ["power-strike", "backstab", "flurry", "execute", "arcane-bolt", "cleave", "venom", "shield-bash", "meteor", "shatter"];
  const defensive: SkillId[] = ["mend", "essence-ward", "bloodlust"];
  const slots = opts.defensiveSlot
    ? [...take(defensive, unlocked, 1), ...take(damage, unlocked, 3)]
    : take(damage, unlocked, 4);
  return [slots[0] ?? null, slots[1] ?? null, slots[2] ?? null, slots[3] ?? null] as (SkillId | null)[];
}

export function build(opts: BuildOpts): GameData {
  const state = createInitialState({ name: "Sim" });
  applyClassChoice(state, opts.cls);

  const level = Math.max(1, opts.level);
  state.character.level = level;
  state.character.xp = 0;
  state.character.unspentPoints = (level - 1) * 5;
  state.talents.points = level - 1;
  spendStats(state, opts.split);

  if (!opts.noTalents) {
    if (opts.cls === "assassin") spendSin(state, opts.sinPath ?? "blade");
    else spendTalents(state);
  }

  const ilvl = opts.ilvl ?? level;
  state.inventory = Array.from({ length: INVENTORY_SIZE }, () => null);
  state.guild.level = opts.guildLevel ?? 1;

  const tier = opts.tier ?? "commons";
  const locId = opts.locationId ?? bestLocationFor(level, tier);
  const spot = pickSpot(locId, tier);

  const dress = (rarity: Rarity, enhance: number) => {
    state.equipment = emptyEquipment();
    for (const slot of EQUIP_SLOTS as readonly EquipSlot[]) {
      const item = generateItem({
        itemLevel: ilvl,
        rarity,
        slot,
        classLock: slot === "weapon" || slot === "offhand" ? opts.cls : undefined,
      });
      item.enhanceLevel = enhance;
      state.equipment[slot] = item;
    }
  };

  if (opts.matchSpotBm) {
    // Walk the gear ladder in ascending power and stop at the first rung that
    // clears the bar, so the build is geared *for* the square rather than past it.
    const target = (spot.requiredBm ?? expectedBm(level)) * opts.matchSpotBm;
    const rungs: [Rarity, number][] = [];
    for (const rarity of GEAR_LADDER) for (const enhance of [0, 4, 8, 12, 15]) rungs.push([rarity, enhance]);
    let cleared = false;
    for (const [rarity, enhance] of rungs) {
      dress(rarity, enhance);
      if (statsOf(state).powerScore >= target) {
        cleared = true;
        break;
      }
    }
    // Top rung reached without clearing: leave it dressed in the best available
    // and let the caller see the shortfall in the reported BM.
    if (!cleared) dress("mythic", 15);
  } else {
    dress(opts.rarity ?? "uncommon", opts.enhance ?? 0);
  }

  state.progression.unlockedLocationIds = LOCATIONS.map((l) => l.id);
  for (const l of LOCATIONS) state.progression.locations[l.id] = emptyLocationProgress();
  state.progression.locations[locId]!.floor = opts.floor ?? 1;
  state.combat.locationId = locId;
  state.combat.spotId = spot.id;
  state.farm[spot.id] = { occupant: { id: "player", name: "Sim", guild: "G", power: 1, isPlayer: true } };

  state.combat.hotbar = opts.hotbar ?? autoHotbar(state, { defensiveSlot: opts.defensiveSlot });
  state.combat.skillCd = Object.fromEntries(SKILLS.map((s) => [s.id, 0]));
  state.settings.autoBattle = true;
  state.settings.autoSell = { common: true, uncommon: true, rare: true, epic: true, legendary: true, mythic: true };
  state.character.hp = statsOf(state).maxHp;
  state.combat.monster = null;
  return state;
}

const TIER_ORDER = ["commons", "rich", "hot", "apex"] as const;

/** Ascending gear power, used to dress a build up to a square's requiredBm. */
const GEAR_LADDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

/**
 * Lowest rarity/enhance that puts a build at `matchSpotBm` of the square's
 * requirement. Callers that compare stat splits must share one rung — otherwise
 * a glass build climbs the ladder further (less END → less powerScore) and
 * out-tanks the tank on gear alone.
 */
export function gearRungForSpot(opts: BuildOpts & { matchSpotBm: number }): { rarity: Rarity; enhance: number } {
  const state = build(opts);
  const sample = state.equipment.weapon ?? state.equipment.armor;
  return {
    rarity: sample?.rarity ?? "uncommon",
    enhance: sample?.enhanceLevel ?? 0,
  };
}

/** Boss-kind locations have no commons squares at all; fall back within the location. */
export function pickSpot(locationId: string, tier: (typeof TIER_ORDER)[number]) {
  const here = FARM_SPOTS.filter((s) => s.locationId === locationId);
  const exact = here.find((s) => s.tier === tier);
  if (exact) return exact;
  const wanted = TIER_ORDER.indexOf(tier);
  const sorted = [...here].sort(
    (a, b) =>
      Math.abs(TIER_ORDER.indexOf(a.tier) - wanted) - Math.abs(TIER_ORDER.indexOf(b.tier) - wanted),
  );
  return sorted[0]!;
}

/**
 * The level-appropriate location, i.e. the unlocked one whose monsters are
 * closest to the player's own level.
 *
 * Not the deepest unlocked location: Unmade zones open at level 100 but spawn
 * above the player's level (`abyss-rift` base 104, `throne-eclipse` base 112).
 * Picking by depth put the reference level-100 build against level-114
 * monsters, which read as the *safe* tier being deadlier than apex.
 */
export function bestLocationFor(level: number, tier?: (typeof TIER_ORDER)[number]) {
  const unlocked = LOCATIONS.filter((l) => l.minLevel <= level);
  if (!unlocked.length) return LOCATIONS[0]!.id;
  // Boss-kind locations carry no commons square at all, and at some levels the
  // closest location by level is one of them. Prefer somewhere the requested
  // tier exists so the measurement is of the tier it claims to be.
  const withTier = tier
    ? unlocked.filter((l) => FARM_SPOTS.some((s) => s.locationId === l.id && s.tier === tier))
    : unlocked;
  const pool = withTier.length ? withTier : unlocked;
  return pool.reduce((best, l) =>
    Math.abs(l.baseLevel - level) < Math.abs(best.baseLevel - level) ? l : best,
  ).id;
}

export interface RunResult {
  seconds: number;
  kills: number;
  bossKills: number;
  deaths: number;
  ttk: number;
  killsPerHour: number;
  xpPerSec: number;
  goldPerSec: number;
  minHpPct: number;
  avgHpPct: number;
  endLevel: number;
  bm: number;
  requiredBm: number;
  spotTier: string;
  dropsPerHour: number;
  /** Damage taken per second, as a fraction of max HP. */
  incomingPerSec: number;
  /** Regen + lifesteal + heals per second, as a fraction of max HP. */
  sustainPerSec: number;
  /** Net HP lost per kill, as a fraction of max HP. Negative = healing up while farming. */
  hpCostPerKill: number;
  /** Seconds of sustained pressure before death. Infinity = unkillable. */
  survivalSec: number;
  /** Mean seconds from boss spawn to boss death. NaN if none were killed. */
  bossTtk: number;
}

/** Drive the shipping tick loop. `freezeLevel` keeps the character at a fixed level. */
export function run(
  state: GameData,
  seconds: number,
  opts: { dt?: number; freezeLevel?: boolean; autoBoss?: boolean; duelOnly?: boolean } = {},
): RunResult {
  const dt = opts.dt ?? 0.05;
  const startLevel = state.character.level;
  let xpTotal = 0;
  let kills = 0, bossKills = 0, deaths = 0, drops = 0;
  let hpSum = 0, hpN = 0, minHp = 1;
  const startGold = state.resources.gold;
  let damageTaken = 0;
  // Boss fights are timed from spawn to death rather than derived from a rate,
  // because a run usually contains only a handful of them.
  let bossStart = -1;
  const bossTimes: number[] = [];
  let elapsed = 0;
  let duelDone = false;
  let activeSec = 0;

  for (let t = 0; t < seconds; t += dt) {
    if (opts.duelOnly && duelDone) break;
    const bossUp = state.combat.monster?.isBoss === true;
    if (bossUp && bossStart < 0) bossStart = t;
    const beforeXp = state.character.xp;
    const beforeLevel = state.character.level;
    const beforeHp = state.character.hp;
    const beforeMax = statsOf(state).maxHp;
    const wasPvp = Boolean(state.combat.monster?.isPvp || state.combat.mode === "pvp");
    const inFight = Boolean(state.combat.monster);

    state.settings.autoBattle = true;
    if (opts.autoBoss) {
      const prog = state.progression.locations[state.combat.locationId];
      if (prog?.bossReady && !state.combat.monster?.isBoss) {
        state.combat.monster = null;
        spawnBossNow(state);
      }
    }

    tickGame(state, dt);
    elapsed = t + dt;

    let diedThisTick = false;
    for (const entry of state.combat.log) {
      if (entry.kind === "xp") kills++;
      else if (entry.kind === "boss" && (entry.text.includes("Этап") || entry.text.includes("зачищена"))) bossKills++;
      else if (entry.kind === "death") { deaths++; diedThisTick = true; }
      else if (entry.kind === "loot") drops++;
      else if (entry.kind === "pvp") kills++;
    }
    if (opts.duelOnly && wasPvp) {
      const stillPvp = Boolean(state.combat.monster?.isPvp || state.combat.mode === "pvp");
      if (!stillPvp || diedThisTick) duelDone = true;
    }
    if (bossStart >= 0 && state.combat.monster?.isBoss !== true) {
      // Only count bosses that actually died; a wipe resets without a kill.
      if (!diedThisTick) bossTimes.push(t + dt - bossStart);
      bossStart = -1;
    }
    state.combat.log.length = 0;
    state.combat.floatingTexts.length = 0;

    if (!diedThisTick) {
      const delta = (state.character.hp - beforeHp) / beforeMax;
      if (delta < 0) damageTaken -= delta;
      // Alive time in a fight only — death/respawn gaps used to inflate TTK and
      // HP-cost whenever apex killed often, which made the tier look 2× too dear.
      if (inFight) activeSec += dt;
    }

    const derived = statsOf(state);
    const pct = state.character.hp / derived.maxHp;
    hpSum += pct; hpN++;
    if (pct < minHp) minHp = pct;

    if (opts.freezeLevel && state.character.level > beforeLevel) {
      state.character.level = beforeLevel;
      state.character.xp = beforeXp;
      state.character.unspentPoints = 0;
      state.talents.points = 0;
    }
    xpTotal += Math.max(0, state.character.xp - beforeXp);
  }

  const derived = statsOf(state);
  const spot = FARM_SPOT_BY_ID[state.combat.spotId];
  const sampleSec = Math.max(dt, elapsed);
  const fightSec = Math.max(dt, activeSec || sampleSec);
  const incomingPerSec = damageTaken / fightSec;
  // Passive regen only; skill heals and lifesteal are deliberately excluded so
  // this reads as "pressure the build has to answer", not "pressure it survived".
  const sustainPerSec = REGEN.inCombat;
  const netDrain = incomingPerSec - sustainPerSec;
  return {
    seconds: sampleSec,
    kills,
    bossKills,
    deaths,
    ttk: kills ? fightSec / kills : Infinity,
    killsPerHour: (kills / sampleSec) * 3600,
    xpPerSec: xpTotal / sampleSec,
    goldPerSec: (state.resources.gold - startGold) / sampleSec,
    minHpPct: minHp,
    avgHpPct: hpN ? hpSum / hpN : 1,
    endLevel: state.character.level,
    bm: derived.powerScore,
    requiredBm: spot?.requiredBm ?? expectedBm(startLevel),
    spotTier: spot?.tier ?? "?",
    dropsPerHour: (drops / sampleSec) * 3600,
    incomingPerSec,
    sustainPerSec,
    hpCostPerKill: kills ? (netDrain * fightSec) / kills : Infinity,
    survivalSec: netDrain > 0 ? 1 / netDrain : Infinity,
    bossTtk: bossTimes.length ? bossTimes.reduce((s, x) => s + x, 0) / bossTimes.length : NaN,
  };
}

/** The UI gates bosses behind a button; the sim pulls the trigger itself. */
/** The UI gates bosses behind a button; the sim pulls the trigger itself. */
function spawnBossNow(state: GameData) {
  const prog = state.progression.locations[state.combat.locationId];
  if (!prog) return;
  state.combat.mode = "pve";
  state.combat.monster = generateMonster({ locationId: state.combat.locationId, floor: prog.floor, isBoss: true });
  state.combat.playerAtkAcc = 0;
  state.combat.monsterAtkAcc = 0;
}

export function table<T>(title: string, rows: T[], cols: { h: string; w: number; f: (r: T) => unknown }[]) {
  console.log(`\n=== ${title} ===`);
  const head = cols.map((c) => String(c.h).padStart(c.w)).join(" ");
  console.log(head);
  console.log("-".repeat(head.length));
  for (const r of rows) console.log(cols.map((c) => String(c.f(r)).padStart(c.w)).join(" "));
}

export { statsOf, expectedBm, spotRequiredBm };
