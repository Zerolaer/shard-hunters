import { bmDefenseMult, bmOffenseMult, expectedBm, gcdLength, REGEN } from "./balance";
import { syncCombatEffects } from "./combatEffects";
import { healPlayer, pushFloater, pushLog, registerMiss, withSuppressedCombatFx } from "./combatFx";
import {
  BOSS_BONUS_ITEM_CHANCE,
  KILLS_FOR_BOSS,
  LOCATION_BY_ID,
  LOCATIONS,
  MAX_FLOOR,
  MINES,
  OFFLINE_CAP_SECONDS,
  RARITY_LABEL,
  resolvedAutoSell,
  SKILL_BY_ID,
  STAT_POINTS_PER_LEVEL,
  TALENT_POINTS_PER_LEVEL,
} from "./constants";
import { createGem, GEM_NAME, GEM_RANK_LABEL } from "./gems";
import { irand } from "./rng";
import {
  BLESSING_MATERIAL_LABEL,
  endgameDropsFor,
  GEM_BAG_SIZE,
  gemDropChanceFor,
  WORKSHOP_BOSS_MULT,
  WORKSHOP_BOSS_ROLL_MULT,
} from "./workshop";
import {
  goldFromSell,
  itemPower,
  rollAccuracyHit,
  rollHit,
  skillDamage,
  statsOf,
  xpLevelGapMult,
  xpToNext,
} from "./formulas";
import {
  emptyLocationProgress,
  finalDropChance,
  generateItem,
  generateMonster,
  rarityBonusFor,
  rollRarity,
  type LootKind,
} from "./generators";
import {
  consumeEchoShards,
  countEchoShards,
  createEchoShardStack,
  echoChestRecipe,
  echoDropQty,
  echoQty,
  echoSpendFreesSlot,
  ECHO_SHARD_PLURAL,
  isEchoShard,
  isMaterialItem,
} from "./echoCraft";
import { migrateAssassinBuild } from "./classKit";
import {
  DUNGEON_HALL_BY_ID,
  dungeonOreOnKill,
  dungeonRemainingMs,
  emptyDungeonState,
  isDungeonLocationId,
  localDayKey,
  normalizeDungeonState,
  recommendedSafeLocationAfterDungeon,
} from "./dungeons";
import {
  isTowerLocationId,
  isTowerMilestone,
  normalizeTowerState,
  TOWER_LOCATION_ID,
  TOWER_SPOT_ID,
  towerBossName,
  towerClearBonus,
  towerCombatFloor,
  towerRecommendedBm,
  applyTowerGuardianPower,
  emptyTowerState,
} from "./tower";
import {
  applyBossArenaPower,
  BOSS_DEF_BY_ID,
  BOSS_LOCATION_ID,
  BOSS_SPOT_ID,
  bossClearBonus,
  bossCombatFloor,
  bossRecommendedBm,
  emptyBossesState,
  isBossLocationId,
  normalizeBossesState,
  personalBossForIndex,
  PERSONAL_BOSSES,
  type BossDef,
} from "./bosses";
import { ensureHunters, simulateHunters } from "./hunters";
import { ensureFarmState, FARM_SPOT_BY_ID, occupySpot, vacatePlayerSpots } from "./spots";
import type { BossSession } from "./types";
import {
  afterSinSwing,
  emptySinBuild,
  emptySinCombat,
  ensureSin,
  isPlayingSin,
  onSinNewMonster,
  pickSinCast,
  sinIncomingMultiplier,
  sinMonsterIntervalMult,
  sinOnPlayerHit,
  tickSinEffects,
  tryCastSin,
} from "./sin";
import { guildCombatBonuses, noteGuildKills, noteGuildOre, tickGuild, normalizeGuild } from "./guild";
import { isSkillUnlocked } from "./talents";
import {
  RARITIES,
  type CombatLogEntry,
  type DungeonType,
  type GameData,
  type Gem,
  type Item,
  type Rarity,
  type SkillId,
} from "./types";

type Draft = GameData;

/** Bounds catch-up work when a throttled or restored tab hands the loop a long dt. */
const MAX_SWINGS_PER_TICK = 8;
/** Live frames stay on one pass; anything larger is sliced so skills/DoTs keep up. */
const CATCHUP_DT = 0.12;
const CATCHUP_STEP_SHORT = 0.1;
const CATCHUP_STEP_LONG = 0.2;
const CATCHUP_LONG_AFTER = 120;
const OFFLINE_REPORT_SECONDS = 8;
/** Cap wall time per catch-up call so login/tab-restore cannot freeze the UI for seconds. */
const CATCHUP_WALL_MS = 12;

let catchupActive = false;
let catchupKills = 0;

function swingLimit(dt: number) {
  return Math.min(64, Math.max(MAX_SWINGS_PER_TICK, Math.ceil(dt * 50) + 2));
}

function catchupStep(dt: number) {
  if (dt > 30 * 60) return 0.5;
  if (dt > CATCHUP_LONG_AFTER) return CATCHUP_STEP_LONG;
  return CATCHUP_STEP_SHORT;
}

function lifetimeXp(level: number, xp: number) {
  let total = xp;
  for (let i = 1; i < level; i++) total += xpToNext(i);
  return total;
}

function finishFrame(state: Draft, skipEffects: boolean) {
  if (!skipEffects) syncCombatEffects(state);
}

function firstEmptyInv(state: Draft) {
  return state.inventory.findIndex((x) => x === null);
}

export function isAutoSellEnabled(state: Draft, rarity: Rarity) {
  if (state.settings?.autoSellEnabled === false) return false;
  return !!resolvedAutoSell(state.settings?.autoSell)[rarity];
}

export function syncAutoSellSettings(state: Draft) {
  if (!state.settings) {
    state.settings = { autoBattle: false, autoSellEnabled: true, autoSell: resolvedAutoSell() };
    return;
  }
  if (state.settings.autoSellEnabled == null) state.settings.autoSellEnabled = true;
  state.settings.autoSell = resolvedAutoSell(state.settings.autoSell);
}

/** Blessed or socketed gear is never disposed of automatically — it is hand-made. */
export function isWorkshopItem(item: Item) {
  return !!item.blessed || !!item.sockets?.length;
}

/** Sell inventory items of one rarity. Equipped gear is untouched; empty slots stay empty. */
export function flushAutoSellInventory(state: Draft, rarity: Rarity) {
  const sold: { name: string; gold: number }[] = [];
  for (let i = 0; i < state.inventory.length; i++) {
    const item = state.inventory[i];
    if (!item || item.rarity !== rarity || isWorkshopItem(item) || isMaterialItem(item)) continue;
    sold.push({ name: item.name, gold: goldFromSell(item) });
    state.inventory[i] = null;
  }
  if (sold.length === 0) return { sold: 0, gold: 0 };
  const gold = sold.reduce((sum, row) => sum + row.gold, 0);
  state.resources.gold += gold;
  if (sold.length <= 3) {
    for (const row of sold) {
      pushLog(state, "gold", `Автопродажа из сумки: ${row.name} → ${row.gold} золота`);
    }
  } else {
    pushLog(state, "gold", `Автопродажа из сумки: ${sold.length} предметов → ${gold} золота`);
  }
  return { sold: sold.length, gold };
}

export function receiveLootItem(state: Draft, item: Item, source: "normal" | "boss" = "normal") {
  const tag = source === "boss" ? "Трофей босса" : "Добыча";
  if (isMaterialItem(item)) {
    grantMaterialItem(state, item, tag);
    return;
  }
  if (isAutoSellEnabled(state, item.rarity)) {
    const gold = goldFromSell(item);
    state.resources.gold += gold;
    pushLog(state, "loot", `${tag} (автопродажа): ${item.name} → ${gold} золота`);
    return;
  }
  const slot = firstEmptyInv(state);
  if (slot === -1) {
    // A full bag used to sell whatever just dropped, so a mythic could vanish
    // into pocket change. Keep the better piece and sell the weakest instead.
    const worst = worstInventorySlot(state);
    if (worst && compareItemValue(item, worst.item) > 0) {
      const gold = goldFromSell(worst.item);
      state.resources.gold += gold;
      state.inventory[worst.index] = item;
      pushLog(
        state,
        "loot",
        `Сумка полна: ${worst.item.name} продан за ${gold} золота, ${item.name} [${item.rarity}] оставлен`,
      );
      return;
    }
    const gold = goldFromSell(item);
    state.resources.gold += gold;
    pushLog(state, "loot", `Сумка полна. ${item.name} продан за ${gold} золота`);
    return;
  }
  state.inventory[slot] = item;
  pushLog(state, "loot", `${tag}: ${item.name} [${item.rarity}]`);
}

/** Rarity first, then raw power — a mythic outranks a high-roll common. */
function compareItemValue(a: Item, b: Item) {
  const ra = RARITIES.indexOf(a.rarity);
  const rb = RARITIES.indexOf(b.rarity);
  if (ra !== rb) return ra - rb;
  return itemPower(a) - itemPower(b);
}

function worstInventorySlot(state: Draft) {
  let worst: { index: number; item: Item } | null = null;
  for (let i = 0; i < state.inventory.length; i++) {
    const item = state.inventory[i];
    if (!item || isWorkshopItem(item) || isMaterialItem(item)) continue;
    if (!worst || compareItemValue(item, worst.item) < 0) worst = { index: i, item };
  }
  return worst;
}

/** Pull socketed gems back into the bag before an item leaves the save. */
export function reclaimGems(state: Draft, item: Item) {
  if (!item.sockets?.length) return 0;
  if (!state.gems) state.gems = [];
  let kept = 0;
  for (let i = 0; i < item.sockets.length; i++) {
    const gem = item.sockets[i];
    if (!gem) continue;
    if (state.gems.length >= GEM_BAG_SIZE) break;
    state.gems.push(gem);
    item.sockets[i] = null;
    kept += 1;
  }
  if (kept > 0) pushLog(state, "system", `Камни возвращены в мешок: ${kept}`);
  return kept;
}

function currentSpot(state: Draft) {
  return FARM_SPOT_BY_ID[state.combat.spotId];
}

function activeBossDef(state: Draft): BossDef | null {
  const id = state.bosses?.active?.defId;
  if (!id) return null;
  return BOSS_DEF_BY_ID[id] ?? null;
}

function pveRequiredBm(state: Draft) {
  if (isTowerLocationId(state.combat.locationId)) {
    const floor = Math.max(1, state.tower?.floor ?? 1);
    return towerRecommendedBm(floor);
  }
  if (isBossLocationId(state.combat.locationId)) {
    const def = activeBossDef(state);
    if (def) return bossRecommendedBm(def);
  }
  return currentSpot(state)?.requiredBm ?? expectedBm(state.character.level);
}

function pveBmMults(state: Draft, derived: ReturnType<typeof statsOf>) {
  const monster = state.combat.monster;
  if (!monster || monster.isPvp || state.combat.mode === "pvp") {
    return { dealt: 1, taken: 1 };
  }
  const required = pveRequiredBm(state);
  return {
    dealt: bmOffenseMult(derived.powerScore, required),
    taken: bmDefenseMult(derived.powerScore, required),
  };
}

function unlockLocationsByLevel(state: Draft, announce: boolean) {
  for (const loc of LOCATIONS) {
    if (state.character.level < loc.minLevel) continue;
    if (state.progression.unlockedLocationIds.includes(loc.id)) continue;
    state.progression.unlockedLocationIds.push(loc.id);
    if (announce) pushLog(state, "system", `Открыта локация: ${loc.name}`);
  }
}

export function ensureWorld(state: Draft) {
  // Ensure dungeon locations/spots are registered (module side-effect + re-import safety).
  void DUNGEON_HALL_BY_ID;
  state.dungeon = normalizeDungeonState(state.dungeon);
  state.tower = normalizeTowerState(state.tower);
  state.bosses = normalizeBossesState(state.bosses);
  state.guild = normalizeGuild(state.guild);
  if (!state.mines) state.mines = {};
  for (const mine of MINES) {
    if (!state.mines[mine.id]) {
      const occupants = [];
      const filled = Math.max(1, mine.slots - 1);
      for (let i = 0; i < filled; i++) {
        occupants.push({
          id: `mine-${mine.id}-${i}`,
          name: `Охотник ${i + 1}`,
          guild: "—",
          power: Math.round(expectedBm(mine.bmLevel ?? mine.minLevel) * (0.88 + i * 0.06)),
          isPlayer: false,
        });
      }
      state.mines[mine.id] = { occupants };
    }
  }
  state.farm = ensureFarmState(state.farm);
  if (!state.gems) state.gems = [];
  if (state.resources.blessing == null) state.resources.blessing = 0;
  if (!state.progression.locations) state.progression.locations = {};
  for (const loc of LOCATIONS) {
    if (!state.progression.locations[loc.id]) {
      state.progression.locations[loc.id] = emptyLocationProgress();
    }
  }
  for (const id of Object.keys(DUNGEON_HALL_BY_ID)) {
    if (!state.progression.locations[id]) {
      state.progression.locations[id] = emptyLocationProgress();
    }
  }
  if (!state.progression.locations[TOWER_LOCATION_ID]) {
    state.progression.locations[TOWER_LOCATION_ID] = emptyLocationProgress();
  }
  if (!state.progression.locations[BOSS_LOCATION_ID]) {
    state.progression.locations[BOSS_LOCATION_ID] = emptyLocationProgress();
  }
  if (!state.progression.unlockedLocationIds?.length) {
    state.progression.unlockedLocationIds = ["woods"];
  }
  unlockLocationsByLevel(state, false);
  ensureHunters(state);
}

function tryPlaceLoot(state: Draft, dropBonus: number, monsterLevel: number, kind: LootKind) {
  const spot = currentSpot(state);
  const locDef = LOCATION_BY_ID[state.combat.locationId];
  const rarity = rollRarity(
    dropBonus + rarityBonusFor(kind) + (spot?.rarityBias ?? 0) + (locDef?.rarityBias ?? 0),
  );
  const item = generateItem({
    itemLevel: Math.max(1, monsterLevel + (kind === "boss" ? 2 : 0) + (spot?.tier === "apex" ? 2 : 0)),
    rarity,
    preferredClass: state.character.classId,
  });
  receiveLootItem(state, item, kind === "boss" ? "boss" : "normal");
}

export function receiveGem(state: Draft, gem: Gem, fromBoss = false) {
  if (!state.gems) state.gems = [];
  if (state.gems.length >= GEM_BAG_SIZE) {
    pushLog(state, "loot", `Мешок камней полон — ${GEM_NAME[gem.rank]} рассыпался.`);
    return false;
  }
  state.gems.push(gem);
  pushLog(
    state,
    "loot",
    fromBoss
      ? `Трофей босса · камень: ${GEM_NAME[gem.rank]} [${GEM_RANK_LABEL[gem.rank]}]`
      : `Камень: ${GEM_NAME[gem.rank]} [${GEM_RANK_LABEL[gem.rank]}]`,
  );
  return true;
}

/**
 * Blessing sparks and gems ride alongside normal loot rather than replacing a
 * roll, so adding the workshop does not quietly cut item drops in the zones
 * that feed it.
 */
function grantWorkshopLoot(state: Draft, dropBonus: number, monsterLevel: number, kind: LootKind) {
  if (kind === "pvp") return;
  const locId = state.combat.locationId;
  const isBoss = kind === "boss";
  const bundle = isBoss ? WORKSHOP_BOSS_MULT : 1;
  const rollMult = isBoss ? WORKSHOP_BOSS_ROLL_MULT : 1;

  const endgame = endgameDropsFor(locId);
  if (endgame && Math.random() < endgame.sparkChance * rollMult) {
    const sparks = irand(endgame.sparkMin, endgame.sparkMax) * bundle;
    state.resources.blessing = (state.resources.blessing ?? 0) + sparks;
    pushLog(
      state,
      "loot",
      isBoss
        ? `Трофей босса · ${BLESSING_MATERIAL_LABEL}: +${sparks}`
        : `${BLESSING_MATERIAL_LABEL}: +${sparks}`,
    );
  }

  const gemRoll = gemDropChanceFor(locId, monsterLevel);
  if (gemRoll.chance > 0 && Math.random() < gemRoll.chance * rollMult) {
    const rank = rollRarity(gemRoll.bias + Math.max(0, dropBonus));
    receiveGem(state, createGem(rank), isBoss);
  }
}

function grantLoot(state: Draft, dropBonus: number, monsterLevel: number, kind: LootKind) {
  const spot = currentSpot(state);
  const chance = finalDropChance(kind, dropBonus, spot?.dropChanceMult ?? 1);
  const pityAt = spot?.pityKills ?? 5;
  const lootless = state.combat.lootlessKills ?? 0;
  const pity = kind === "trash" && lootless >= pityAt;
  if (kind === "boss") {
    pushLog(state, "boss", "Награда за босса:");
  }
  if (pity || Math.random() < chance) {
    tryPlaceLoot(state, dropBonus, monsterLevel, kind);
    if (kind === "trash") state.combat.lootlessKills = 0;
  } else if (kind === "trash") {
    state.combat.lootlessKills = lootless + 1;
  }
  if (kind === "boss" && Math.random() < BOSS_BONUS_ITEM_CHANCE) {
    tryPlaceLoot(state, dropBonus, monsterLevel, kind);
  }
  grantWorkshopLoot(state, dropBonus, monsterLevel, kind);
  grantEchoShards(state, kind);
}

function grantMaterialItem(state: Draft, item: Item, tag: string) {
  if (isEchoShard(item)) {
    for (const existing of state.inventory) {
      if (isEchoShard(existing)) {
        existing.qty = echoQty(existing) + echoQty(item);
        if (!catchupActive) {
          pushLog(state, "loot", `${tag}: ${ECHO_SHARD_PLURAL} ×${echoQty(item)}`);
        }
        return;
      }
    }
  }
  const slot = firstEmptyInv(state);
  if (slot === -1) {
    const worst = worstInventorySlot(state);
    if (worst) {
      const gold = goldFromSell(worst.item);
      state.resources.gold += gold;
      state.inventory[worst.index] = item;
      if (!catchupActive) {
        pushLog(
          state,
          "loot",
          `Сумка полна: ${worst.item.name} продан за ${gold} золота, ${item.name} оставлен`,
        );
      }
      return;
    }
    if (!catchupActive) {
      pushLog(state, "loot", `Сумка полна — ${item.name} рассыпался.`);
    }
    return;
  }
  state.inventory[slot] = item;
  if (!catchupActive) {
    pushLog(state, "loot", `${tag}: ${item.name}${isEchoShard(item) ? ` ×${echoQty(item)}` : ""}`);
  }
}

function grantEchoShards(state: Draft, kind: LootKind) {
  const dropKind = kind === "boss" ? "boss" : kind === "pvp" ? "pvp" : "trash";
  grantMaterialItem(state, createEchoShardStack(echoDropQty(dropKind)), kind === "boss" ? "Трофей босса" : "Добыча");
}

export function craftEchoChest(state: Draft, rarity: Rarity): { ok: boolean; message: string } {
  const recipe = echoChestRecipe(rarity);
  if (!recipe) return { ok: false, message: "Нет такого сундука" };
  const have = countEchoShards(state.inventory);
  if (have < recipe.cost) {
    return {
      ok: false,
      message: `Нужно ${recipe.cost} ${ECHO_SHARD_PLURAL.toLowerCase()} (есть ${have})`,
    };
  }
  const empty = firstEmptyInv(state);
  if (empty === -1 && !echoSpendFreesSlot(state.inventory, recipe.cost)) {
    return { ok: false, message: "Сумка полна — освободите слот под предмет" };
  }
  if (!consumeEchoShards(state.inventory, recipe.cost)) {
    return { ok: false, message: `Не хватает ${ECHO_SHARD_PLURAL.toLowerCase()}` };
  }
  const item = generateItem({
    itemLevel: Math.max(1, state.character.level),
    rarity: recipe.rarity,
    preferredClass: state.character.classId,
  });
  const slot = firstEmptyInv(state);
  if (slot === -1) {
    grantMaterialItem(state, createEchoShardStack(recipe.cost), "Крафт");
    return { ok: false, message: "Сумка полна — освободите слот под предмет" };
  }
  state.inventory[slot] = item;
  const line = `Крафт: ${recipe.title} → ${item.name} [${RARITY_LABEL[item.rarity]}] ур. ${item.itemLevel}`;
  pushLog(state, "loot", line);
  return { ok: true, message: line };
}

function gainXp(state: Draft, amount: number) {
  state.character.xp += amount;
  let leveled = 0;
  while (state.character.xp >= xpToNext(state.character.level)) {
    state.character.xp -= xpToNext(state.character.level);
    state.character.level += 1;
    state.character.unspentPoints += STAT_POINTS_PER_LEVEL;
    state.talents.points += TALENT_POINTS_PER_LEVEL;
    leveled += 1;
  }
  if (leveled) {
    const derived = statsOf(state);
    state.character.hp = derived.maxHp;
    pushLog(
      state,
      "xp",
      `Уровень ${state.character.level}! +${leveled * STAT_POINTS_PER_LEVEL} хар-к, +${leveled} очко билда`,
    );
    unlockLocationsByLevel(state, true);
  }
}

function spawnTowerGuardian(state: Draft) {
  if (!state.tower) state.tower = emptyTowerState();
  const floor = Math.max(1, state.tower.floor);
  state.combat.mode = "pve";
  state.combat.monster = generateMonster({
    locationId: TOWER_LOCATION_ID,
    floor: towerCombatFloor(floor),
    isBoss: true,
    danger: 1.15,
  });
  applyTowerGuardianPower(state.combat.monster, floor);
  state.combat.monster.name = towerBossName(floor);
  state.combat.monsterAtkAcc = 0;
  state.combat.playerAtkAcc = 0;
  if (!state.progression.locations[TOWER_LOCATION_ID]) {
    state.progression.locations[TOWER_LOCATION_ID] = emptyLocationProgress();
  }
  state.progression.locations[TOWER_LOCATION_ID].floor = floor;
  onSinNewMonster(state);
}

function grantTowerClear(state: Draft, floor: number) {
  const bonus = towerClearBonus(floor);
  const milestone = isTowerMilestone(floor);
  state.resources.gold += bonus.gold;
  state.resources.shards += bonus.shards;
  if (bonus.ore > 0) {
    state.resources.ore += bonus.ore;
    noteGuildOre(state.guild, bonus.ore);
  }
  if (bonus.sparks > 0) {
    state.resources.blessing = (state.resources.blessing ?? 0) + bonus.sparks;
  }
  if (bonus.itemRarity) {
    const item = generateItem({
      itemLevel: Math.max(1, 6 + floor),
      rarity: bonus.itemRarity,
      preferredClass: state.character.classId,
    });
    receiveLootItem(state, item, "boss");
  }
  if (bonus.gemRank) {
    receiveGem(state, createGem(bonus.gemRank), true);
  }
  const extras = [`+${bonus.gold} золота`, `+${bonus.shards} осколков`];
  if (bonus.ore > 0) extras.push(`+${bonus.ore} руды`);
  if (bonus.sparks > 0) extras.push(`+${bonus.sparks} ${BLESSING_MATERIAL_LABEL.toLowerCase()}`);
  pushLog(
    state,
    milestone ? "boss" : "gold",
    milestone
      ? `Башня · этаж ${floor} пройден! Особая награда: ${extras.join(", ")}`
      : `Башня · этаж ${floor}: ${extras.join(", ")}`,
  );
}

export function beginTowerRun(state: Draft) {
  if (!state.tower) state.tower = emptyTowerState();
  state.tower = normalizeTowerState(state.tower);
  vacatePlayerSpots(state.farm);
  state.combat.locationId = TOWER_LOCATION_ID;
  state.combat.spotId = TOWER_SPOT_ID;
  state.combat.mode = "pve";
  state.combat.lootlessKills = 0;
  state.tower.active = true;
  spawnTowerGuardian(state);
  state.settings.autoBattle = true;
}

export function leaveTowerSession(state: Draft, reason: string) {
  if (state.tower) state.tower.active = false;
  evacuateFromDungeon(state, reason);
}

function spawnArenaBoss(state: Draft, def: BossDef) {
  state.combat.mode = "pve";
  // Soft profile at the boss's level; real power comes from applyBossArenaPower
  // (same pattern as tower guardians — avoids double-counting bmScale).
  state.combat.monster = generateMonster({
    locationId: BOSS_LOCATION_ID,
    floor: bossCombatFloor(def),
    isBoss: true,
    danger: 1.15,
    baseLevel: def.baseLevel,
    threat: 1,
  });
  applyBossArenaPower(state.combat.monster, def);
  state.combat.monster.name = def.name;
  state.combat.monsterAtkAcc = 0;
  state.combat.playerAtkAcc = 0;
  if (!state.progression.locations[BOSS_LOCATION_ID]) {
    state.progression.locations[BOSS_LOCATION_ID] = emptyLocationProgress();
  }
  state.progression.locations[BOSS_LOCATION_ID].floor = def.chapter ?? 1;
  onSinNewMonster(state);
}

function grantBossClear(state: Draft, def: BossDef) {
  const bonus = bossClearBonus(def);
  state.resources.gold += bonus.gold;
  state.resources.shards += bonus.shards;
  if (bonus.ore > 0) {
    state.resources.ore += bonus.ore;
    noteGuildOre(state.guild, bonus.ore);
  }
  if (bonus.sparks > 0) {
    state.resources.blessing = (state.resources.blessing ?? 0) + bonus.sparks;
  }
  if (bonus.itemRarity) {
    const itemLevel =
      def.kind === "personal"
        ? Math.max(1, 8 + (def.chapter ?? 1) * 6)
        : Math.max(1, def.baseLevel + 4);
    const item = generateItem({
      itemLevel,
      rarity: bonus.itemRarity,
      preferredClass: state.character.classId,
    });
    receiveLootItem(state, item, "boss");
  }
  if (bonus.gemRank) {
    receiveGem(state, createGem(bonus.gemRank), true);
  }
  const extras = [`+${bonus.gold} золота`, `+${bonus.shards} осколков`];
  if (bonus.ore > 0) extras.push(`+${bonus.ore} руды`);
  if (bonus.sparks > 0) extras.push(`+${bonus.sparks} ${BLESSING_MATERIAL_LABEL.toLowerCase()}`);
  const kindLabel =
    def.kind === "world" ? "Мировой босс" : def.kind === "field" ? "Полевой босс" : "Сюжетный босс";
  pushLog(state, "boss", `${kindLabel}: ${def.name} повержен! ${extras.join(", ")}`);
}

export function beginBossFight(state: Draft, session: BossSession) {
  const def = BOSS_DEF_BY_ID[session.defId];
  if (!def) return;
  if (!state.bosses) state.bosses = emptyBossesState();
  state.bosses = normalizeBossesState(state.bosses);
  vacatePlayerSpots(state.farm);
  state.combat.locationId = BOSS_LOCATION_ID;
  state.combat.spotId = BOSS_SPOT_ID;
  state.combat.mode = "pve";
  state.combat.lootlessKills = 0;
  state.bosses.active = session;
  spawnArenaBoss(state, def);
  state.settings.autoBattle = true;
}

export function leaveBossSession(state: Draft, reason: string) {
  if (state.bosses) state.bosses.active = null;
  evacuateFromDungeon(state, reason);
}

function spawnNext(state: Draft, isBoss: boolean) {
  if (isTowerLocationId(state.combat.locationId)) {
    spawnTowerGuardian(state);
    return;
  }
  if (isBossLocationId(state.combat.locationId)) {
    const def = activeBossDef(state);
    if (def) {
      spawnArenaBoss(state, def);
      return;
    }
    leaveBossSession(state, "Босс недоступен — возврат в открытый мир.");
    return;
  }
  const locId = state.combat.locationId;
  const prog = state.progression.locations[locId] ?? emptyLocationProgress();
  const danger = currentSpot(state)?.danger ?? 1;
  state.combat.mode = "pve";
  state.combat.monster = generateMonster({
    locationId: locId,
    floor: prog.floor,
    isBoss,
    danger: isBoss ? 1 : danger,
  });
  state.combat.monsterAtkAcc = 0;
  state.combat.playerAtkAcc = 0;
  onSinNewMonster(state);
}

function claimCurrentSpot(state: Draft) {
  const derived = statsOf(state);
  occupySpot(state.farm, state.combat.spotId, {
    id: "player",
    name: state.character.name,
    guild: state.guild.name,
    power: derived.powerScore,
    isPlayer: true,
  });
}

function onPvpWin(state: Draft) {
  const monster = state.combat.monster;
  if (!monster) return;
  const derived = statsOf(state);
  const xp = Math.round(monster.xp * (1 + derived.xpBonus) * xpLevelGapMult(state.character.level, monster.level));
  state.resources.gold += monster.gold;
  state.resources.shards += monster.shards;
  gainXp(state, xp);
  pushLog(
    state,
    "pvp",
    `${monster.name} повержен. Спот ваш. +${xp} XP, +${monster.gold} золота`,
  );
  grantLoot(state, derived.dropBonus, monster.level, "pvp");
  claimCurrentSpot(state);
  state.combat.mode = "pve";
  spawnNext(state, false);
}

function onKill(state: Draft, derivedXpBonus: number, dropBonus: number) {
  const monster = state.combat.monster;
  if (!monster) return;
  if (catchupActive) catchupKills += 1;
  if (monster.isPvp || state.combat.mode === "pvp") {
    onPvpWin(state);
    return;
  }
  const spot = currentSpot(state);
  const hall = DUNGEON_HALL_BY_ID[state.combat.locationId];
  const xp = Math.round(
    monster.xp *
      (1 + derivedXpBonus) *
      (spot?.xpMult ?? 1) *
      xpLevelGapMult(state.character.level, monster.level),
  );
  const goldMult = (spot?.goldMult ?? 1) * (1 + guildCombatBonuses(state.guild).goldMult);
  const gold = Math.round(monster.gold * goldMult);
  const shards = Math.round(monster.shards * goldMult);
  state.resources.gold += gold;
  state.resources.shards += shards;
  gainXp(state, xp);
  noteGuildKills(state.guild, 1);

  let oreNote = "";
  if (hall) {
    const ore = dungeonOreOnKill(hall);
    if (ore > 0) {
      state.resources.ore += ore;
      oreNote = `, +${ore} руды`;
    }
  }

  pushLog(
    state,
    monster.isBoss ? "boss" : "xp",
    monster.isBoss
      ? `${monster.name} повержен! +${xp} XP, +${gold} золота, +${shards} осколков${oreNote}`
      : `${monster.name} повержен. +${xp} XP, +${gold} золота, +${shards} осколков${oreNote}`,
  );
  grantLoot(state, dropBonus, monster.level, monster.isBoss ? "boss" : "trash");

  const locId = state.combat.locationId;
  if (!state.progression.locations[locId]) {
    state.progression.locations[locId] = emptyLocationProgress();
  }
  const prog = state.progression.locations[locId];

  if (isTowerLocationId(locId)) {
    if (!state.tower) state.tower = emptyTowerState();
    const cleared = Math.max(1, state.tower.floor);
    grantTowerClear(state, cleared);
    state.tower.bestFloor = Math.max(state.tower.bestFloor, cleared);
    state.tower.floor = cleared + 1;
    prog.floor = state.tower.floor;
    spawnTowerGuardian(state);
    return;
  }

  if (isBossLocationId(locId)) {
    if (!state.bosses) state.bosses = emptyBossesState();
    const session = state.bosses.active;
    const def = session ? BOSS_DEF_BY_ID[session.defId] : null;
    if (!session || !def) {
      leaveBossSession(state, "Бой завершён — возврат в открытый мир.");
      return;
    }
    grantBossClear(state, def);
    if (def.kind === "world") {
      state.bosses.worldKills[session.spawnKey] = true;
    } else if (def.kind === "field") {
      state.bosses.fieldKills[def.id] = session.spawnKey;
    } else if (def.kind === "personal") {
      const ch = def.chapter ?? 1;
      state.bosses.personalCleared = Math.max(state.bosses.personalCleared, ch);
      state.bosses.personalIndex = Math.min(
        personalBossForIndex(ch + 1) ? ch + 1 : ch,
        PERSONAL_BOSSES.length,
      );
      // After clear, leave arena — next chapter is started from the panel.
      leaveBossSession(
        state,
        ch >= PERSONAL_BOSSES.length
          ? `Сюжет завершён: ${def.name} пал. Все главы пройдены.`
          : `Глава ${ch} пройдена. Следующий босс доступен во вкладке Боссы.`,
      );
      return;
    }
    // World/field: leave after kill (one kill per spawn window).
    leaveBossSession(state, `${def.name} повержен. Арена закрыта до следующего спавна.`);
    return;
  }

  // Hourly halls: endless trash farm, no floor/boss progression.
  if (isDungeonLocationId(locId)) {
    spawnNext(state, false);
    return;
  }

  if (monster.isBoss) {
    prog.bossReady = false;
    prog.killsOnFloor = 0;
    if (prog.floor >= MAX_FLOOR) {
      prog.cleared = true;
      pushLog(state, "boss", `${monster.name} пал. Локация зачищена!`);
      const idx = LOCATIONS.findIndex((l) => l.id === locId);
      const next = LOCATIONS[idx + 1];
      if (next && state.character.level >= next.minLevel) {
        if (!state.progression.unlockedLocationIds.includes(next.id)) {
          state.progression.unlockedLocationIds.push(next.id);
          pushLog(state, "system", `Путь открыт: ${next.name}`);
        }
      }
    } else {
      prog.floor += 1;
      pushLog(state, "boss", `Этап ${prog.floor - 1} пройден. Новый этаж: ${prog.floor}`);
    }
    spawnNext(state, false);
    return;
  }

  prog.killsOnFloor += 1;
  if (prog.killsOnFloor > 0 && prog.killsOnFloor % KILLS_FOR_BOSS === 0) {
    prog.bossReady = true;
    pushLog(state, "boss", `Босс этажа готов. Бросьте вызов, когда будете готовы.`);
  }
  spawnNext(state, false);
}

/** End active dungeon when the wall-clock hour expires. */
export function tickDungeonSession(state: Draft, now = Date.now()) {
  if (!state.dungeon?.active) return;
  if (dungeonRemainingMs(state.dungeon.active, now) > 0) return;
  endDungeonSession(state, "Время подземелья истекло. Вы возвращены в открытый мир.", now);
}

function lockDungeonType(state: Draft, type: DungeonType, now: number) {
  if (!state.dungeon) state.dungeon = emptyDungeonState();
  if (!state.dungeon.paused) state.dungeon.paused = {};
  if (!state.dungeon.dailyUsed) state.dungeon.dailyUsed = {};
  state.dungeon.dailyUsed[type] = localDayKey(now);
  delete state.dungeon.paused[type];
}

function rememberPausedDungeon(state: Draft, type: DungeonType, remainingMs: number, now: number) {
  if (!state.dungeon) state.dungeon = emptyDungeonState();
  if (!state.dungeon.paused) state.dungeon.paused = {};
  if (!state.dungeon.dailyUsed) state.dungeon.dailyUsed = {};
  state.dungeon.paused[type] = { dayKey: localDayKey(now), remainingMs };
  if (state.dungeon.dailyUsed[type] === localDayKey(now)) {
    delete state.dungeon.dailyUsed[type];
  }
}

/** Early leave: remaining time is paused and can be resumed today. */
export function pauseDungeonSession(state: Draft, reason: string, now = Date.now()) {
  if (!state.dungeon) state.dungeon = emptyDungeonState();
  const was = state.dungeon.active;
  const remain = dungeonRemainingMs(was, now);
  if (was) {
    if (remain > 0) rememberPausedDungeon(state, was.type, remain, now);
    else lockDungeonType(state, was.type, now);
  }
  evacuateFromDungeon(state, reason);
}

/** Hour fully elapsed: type is locked until the next daily reset. */
export function endDungeonSession(state: Draft, reason: string, now = Date.now()) {
  if (!state.dungeon) state.dungeon = emptyDungeonState();
  const was = state.dungeon.active;
  if (was) lockDungeonType(state, was.type, now);
  evacuateFromDungeon(state, reason);
}

function evacuateFromDungeon(state: Draft, reason: string) {
  const was = state.dungeon.active;
  state.dungeon.active = null;
  if (state.tower && (state.tower.active || isTowerLocationId(state.combat.locationId))) {
    state.tower.active = false;
  }
  const wasBoss =
    !!state.bosses?.active || isBossLocationId(state.combat.locationId);
  if (state.bosses) state.bosses.active = null;
  if (
    !was &&
    !isDungeonLocationId(state.combat.locationId) &&
    !isTowerLocationId(state.combat.locationId) &&
    !wasBoss
  ) {
    return;
  }

  const derived = statsOf(state);
  const locId = recommendedSafeLocationAfterDungeon(state.character.level, derived.powerScore);
  const spots = Object.values(FARM_SPOT_BY_ID).filter(
    (s) => s.locationId === locId && s.tier === "commons",
  );
  const spot = spots[0] ?? FARM_SPOT_BY_ID["woods-2-0"];
  state.combat.locationId = locId;
  state.combat.spotId = spot?.id ?? "woods-2-0";
  state.combat.mode = "pve";
  state.combat.lootlessKills = 0;
  if (!state.progression.locations[locId]) {
    state.progression.locations[locId] = emptyLocationProgress();
  }
  vacatePlayerSpots(state.farm);
  if (spot && !isDungeonLocationId(spot.locationId) && !isBossLocationId(spot.locationId)) {
    occupySpot(state.farm, spot.id, {
      id: "player",
      name: state.character.name,
      guild: state.guild.name,
      power: derived.powerScore,
      isPlayer: true,
    });
  }
  const floor = state.progression.locations[locId]?.floor ?? 1;
  const danger = FARM_SPOT_BY_ID[state.combat.spotId]?.danger ?? 1;
  state.combat.monster = generateMonster({ locationId: locId, floor, isBoss: false, danger });
  state.combat.playerAtkAcc = 0;
  state.combat.monsterAtkAcc = 0;
  state.settings.autoBattle = false;
  pushLog(state, "system", reason);
}

function onPlayerDeath(state: Draft) {
  const loss = Math.round(state.resources.gold * 0.06);
  state.resources.gold = Math.max(0, state.resources.gold - loss);
  state.settings.autoBattle = false;
  const derived = statsOf(state);
  state.character.hp = derived.maxHp;
  state.combat.playerAtkAcc = 0;
  state.combat.monsterAtkAcc = 0;
  state.combat.wardHits = 0;
  state.combat.bloodlustHits = 0;
  state.combat.gcd = 0;
  if (state.combat.sin) {
    state.combat.sin.veilHits = 0;
    state.combat.sin.stealth = 0;
    state.combat.sin.gcd = 0;
  }

  if (state.combat.mode === "pvp" || state.combat.monster?.isPvp) {
    const rival = state.combat.monster?.name ?? "охотник";
    pushLog(state, "death", `${rival} вас убил. Спот остаётся за ним. −${loss} золота.`);
    state.combat.mode = "pve";
    spawnNext(state, false);
    return;
  }

  if (state.combat.monster?.isBoss) {
    pushLog(state, "death", `Поражение. Босс устоит. Потеряно ${loss} золота. Авто-бой выключен.`);
  } else {
    pushLog(state, "death", `Вы пали. Потеряно ${loss} золота. Авто-бой выключен.`);
  }
  spawnNext(state, false);
}

function currentDanger(state: Draft, monster: { isBoss: boolean; isPvp: boolean }) {
  if (monster.isPvp || monster.isBoss) return 1;
  return currentSpot(state)?.danger ?? 1;
}

function playerSwing(state: Draft, multiplier: number) {
  const monster = state.combat.monster;
  if (!monster) return;
  const derived = statsOf(state);
  const danger = currentDanger(state, monster);
  const accRoll = rollAccuracyHit(derived.accuracy, state.character.level, monster, danger);
  if (!accRoll.hit) {
    registerMiss(state, `Промах (${accRoll.chance.toFixed(0)}%)`);
    return;
  }
  let attack = derived.attack * multiplier * pveBmMults(state, derived).dealt;
  if (state.combat.bloodlustHits > 0) {
    attack *= 1.45;
    state.combat.bloodlustHits -= 1;
  }
  const hit = rollHit(attack, monster.defense, derived.critChance, derived.critDamage, state.character.level);
  monster.hp = Math.max(0, monster.hp - hit.value);
  state.combat.hitFlash = 0.22;
  pushFloater(state, {
    value: hit.value,
    isCrit: hit.isCrit,
    isHeal: false,
    isPlayerTarget: false,
  });
  if (derived.lifesteal > 0) {
    healPlayer(state, Math.round(hit.value * derived.lifesteal), derived.maxHp);
  }
  afterSinSwing(state, hit.isCrit);
  pushLog(
    state,
    hit.isCrit ? "crit" : "hit",
    hit.isCrit
      ? `Крит! ${hit.value} урона по ${monster.name}`
      : `Вы наносите ${hit.value} урона (${monster.name})`,
  );
  if (monster.hp <= 0) {
    onKill(state, derived.xpBonus, derived.dropBonus);
  }
}

function applySkillCooldown(state: Draft, skillId: string, baseCd: number) {
  const derived = statsOf(state);
  state.combat.skillCd[skillId] = baseCd / (1 + derived.skillHaste);
}

function startGcd(state: Draft, kind: "offensive" | "utility", skillHaste: number) {
  state.combat.gcd = gcdLength(kind, skillHaste);
}

function tryCast(state: Draft, skillId: SkillId) {
  const def = SKILL_BY_ID[skillId];
  if (!def) return;
  if ((state.combat.skillCd[skillId] ?? 0) > 0) return;
  if ((state.combat.gcd ?? 0) > 0) return;
  if (!isSkillUnlocked(state.talents.ranks, skillId)) return;
  const derived = statsOf(state);
  const monster = state.combat.monster;
  const utility = def.kind === "heal" || def.kind === "buff";

  if (def.kind === "heal") {
    if (state.character.hp >= derived.maxHp * 0.92) return;
    const amount = skillDamage(skillId, state.character, derived, state.equipment);
    const healed = healPlayer(state, amount, derived.maxHp);
    applySkillCooldown(state, skillId, def.cooldown);
    startGcd(state, "utility", derived.skillHaste);
    if (healed > 0) pushLog(state, "heal", `${def.name}: +${healed} HP`);
    return;
  }

  if (skillId === "essence-ward") {
    state.combat.wardHits = 3;
    applySkillCooldown(state, skillId, def.cooldown);
    startGcd(state, "utility", derived.skillHaste);
    pushLog(state, "skill", `${def.name}: щит на 3 удара`);
    return;
  }

  if (def.kind === "buff") {
    state.combat.bloodlustHits = 4;
    applySkillCooldown(state, skillId, def.cooldown);
    startGcd(state, "utility", derived.skillHaste);
    pushLog(state, "skill", `${def.name}: жажда крови на 4 удара`);
    return;
  }

  if (!monster) return;
  const danger = currentDanger(state, monster);
  const accRoll = rollAccuracyHit(derived.accuracy, state.character.level, monster, danger);
  if (!accRoll.hit) {
    applySkillCooldown(state, skillId, def.cooldown);
    startGcd(state, utility ? "utility" : "offensive", derived.skillHaste);
    registerMiss(state, `${def.name}: промах (${accRoll.chance.toFixed(0)}%)`);
    return;
  }
  const ratio = monster.maxHp > 0 ? monster.hp / monster.maxHp : 1;
  const critBonus = skillId === "backstab" ? derived.critChance + 18 : derived.critChance * 0.85;
  const dmg = skillDamage(skillId, state.character, derived, state.equipment, ratio) * pveBmMults(state, derived).dealt;
  const hit = rollHit(dmg, monster.defense, critBonus, derived.critDamage, state.character.level);
  monster.hp = Math.max(0, monster.hp - hit.value);
  state.combat.hitFlash = 0.28;
  applySkillCooldown(state, skillId, def.cooldown);
  startGcd(state, "offensive", derived.skillHaste);
  pushFloater(state, {
    value: hit.value,
    isCrit: hit.isCrit,
    isHeal: false,
    isPlayerTarget: false,
  });
  pushLog(
    state,
    hit.isCrit ? "crit" : "skill",
    `${def.name}: ${hit.value} урона${hit.isCrit ? " (крит)" : ""}`,
  );

  if (skillId === "venom" && monster.hp > 0) {
    const tick = Math.max(1, Math.round(hit.value * 0.35));
    monster.hp = Math.max(0, monster.hp - tick);
    pushFloater(state, { value: tick, isCrit: false, isHeal: false, isPlayerTarget: false });
    pushLog(state, "skill", `Яд: ещё ${tick}`);
  }

  if (derived.lifesteal > 0) {
    healPlayer(state, Math.round(hit.value * derived.lifesteal * 0.6), derived.maxHp);
  }
  if (monster.hp <= 0) {
    onKill(state, derived.xpBonus, derived.dropBonus);
  }
}

export function playerOrePerSec(state: Draft) {
  let ore = 0;
  for (const mine of MINES) {
    const occ = state.mines[mine.id]?.occupants ?? [];
    if (occ.some((o) => o.isPlayer)) ore += mine.orePerSec;
  }
  return ore;
}

function prepareSave(state: Draft) {
  if (!state.talents) {
    state.talents = {
      points: Math.max(0, state.character.level - 1),
      ranks: state.character.classId === "assassin" ? {} : { "fury-strike": 1 },
    };
  }
  ensureWorld(state);
  if (!state.combat.spotId) state.combat.spotId = "woods-2-0";
  if (!state.combat.mode) state.combat.mode = "pve";
  if (state.combat.wardHits == null) state.combat.wardHits = 0;
  if (state.combat.gcd == null) state.combat.gcd = 0;
  if (state.combat.lootlessKills == null) state.combat.lootlessKills = 0;
  if (!state.combat.playerEffects) state.combat.playerEffects = [];
  if (!state.combat.monsterEffects) state.combat.monsterEffects = [];
  if (!state.combat.sin) state.combat.sin = emptySinCombat();
  if (!state.sinBuild) state.sinBuild = emptySinBuild();
  ensureSin(state);
  if (isPlayingSin(state)) migrateAssassinBuild(state);
  syncAutoSellSettings(state);
}

function tickFrame(state: Draft, dt: number, skipEffects: boolean) {
  if (!state.combat.monster) {
    spawnNext(state, false);
  }

  state.combat.hitFlash = Math.max(0, state.combat.hitFlash - dt);
  state.combat.playerHitFlash = Math.max(0, state.combat.playerHitFlash - dt);
  if (!skipEffects) {
    const now = Date.now();
    state.combat.floatingTexts = state.combat.floatingTexts.filter((f) => now - f.spawnedAt < 1100);
  }

  const derived = statsOf(state);
  if (state.character.hp <= 0 || state.character.hp > derived.maxHp) {
    state.character.hp = Math.min(Math.max(state.character.hp, 0), derived.maxHp);
  }
  const playerSpot = state.farm[state.combat.spotId]?.occupant;
  if (playerSpot?.isPlayer) {
    playerSpot.power = derived.powerScore;
    playerSpot.name = state.character.name;
  }
  if (state.character.hp > 0) {
    const regenRate = state.settings.autoBattle ? REGEN.inCombat : REGEN.idle;
    const regen = derived.maxHp * regenRate * dt;
    state.character.hp = Math.min(derived.maxHp, state.character.hp + regen);
  }

  const oreRate = playerOrePerSec(state);
  if (oreRate > 0) {
    state.oreAcc += dt * oreRate;
    if (state.oreAcc >= 1) {
      const add = Math.floor(state.oreAcc);
      state.resources.ore += add;
      state.oreAcc -= add;
      noteGuildOre(state.guild, add);
    }
  }

  for (const id of Object.keys(state.combat.skillCd)) {
    state.combat.skillCd[id] = Math.max(0, (state.combat.skillCd[id] ?? 0) - dt);
  }
  state.combat.gcd = Math.max(0, (state.combat.gcd ?? 0) - dt);

  if (!state.settings.autoBattle || !state.combat.monster) {
    finishFrame(state, skipEffects);
    return;
  }

  if (isPlayingSin(state)) {
    const sinKill = tickSinEffects(state, dt);
    if (sinKill) {
      const d = statsOf(state);
      onKill(state, d.xpBonus, d.dropBonus);
      if (!state.settings.autoBattle) {
        finishFrame(state, skipEffects);
        return;
      }
    }
    const next = pickSinCast(state);
    if (next) {
      const died = tryCastSin(state, next);
      if (died) {
        const d = statsOf(state);
        onKill(state, d.xpBonus, d.dropBonus);
      }
      if (!state.settings.autoBattle) {
        finishFrame(state, skipEffects);
        return;
      }
    }
  } else {
    for (const slot of state.combat.hotbar) {
      if (state.combat.gcd > 0) break;
      if (!slot) continue;
      if ((state.combat.skillCd[slot] ?? 0) > 0) continue;
      tryCast(state, slot);
      if (!state.settings.autoBattle) {
        finishFrame(state, skipEffects);
        return;
      }
    }
  }

  // Carry the overshoot instead of zeroing it: at a 0.05 s frame and a short
  // swing timer, dropping the remainder silently costs up to 5% attack speed.
  // Looping also keeps the tick correct when a throttled tab hands us a long dt.
  const swings = swingLimit(dt);
  state.combat.playerAtkAcc += dt;
  for (let i = 0; i < swings; i++) {
    if (state.combat.playerAtkAcc < derived.attackInterval) break;
    state.combat.playerAtkAcc -= derived.attackInterval;
    playerSwing(state, 1);
    if (!state.settings.autoBattle) {
      finishFrame(state, skipEffects);
      return;
    }
    if (!state.combat.monster || state.combat.monster.hp <= 0) break;
  }

  const monster = state.combat.monster;
  if (!monster || monster.hp <= 0) {
    finishFrame(state, skipEffects);
    return;
  }

  const interval = monster.attackInterval * sinMonsterIntervalMult(state);
  state.combat.monsterAtkAcc += dt;
  for (let i = 0; i < swings; i++) {
    if (state.combat.monsterAtkAcc < interval) break;
    state.combat.monsterAtkAcc -= interval;
    const mit = isPlayingSin(state) ? sinIncomingMultiplier(state) : 1;
    const absorbed = isPlayingSin(state) ? sinOnPlayerHit(state) : { absorbed: false };
    if (absorbed.absorbed) {
      pushLog(state, "skill", "Эхо перехватило удар");
      continue;
    }
    const taken = pveBmMults(state, derived).taken;
    let incoming = rollHit(monster.attack * taken, derived.defense, monster.isPvp ? 12 : 6, 150, monster.level);
    if (state.combat.wardHits > 0) {
      incoming = { ...incoming, value: Math.max(1, Math.round(incoming.value * 0.6)) };
      state.combat.wardHits -= 1;
    }
    incoming = { ...incoming, value: Math.max(1, Math.round(incoming.value * mit)) };
    state.character.hp = Math.max(0, state.character.hp - incoming.value);
    state.combat.playerHitFlash = 0.18;
    pushFloater(state, {
      value: incoming.value,
      isCrit: incoming.isCrit,
      isHeal: false,
      isPlayerTarget: true,
    });
    pushLog(
      state,
      incoming.isCrit ? "crit" : "hit",
      `${monster.name} наносит ${incoming.value}${incoming.isCrit ? " (крит)" : ""}`,
    );
    if (state.character.hp <= 0) {
      onPlayerDeath(state);
      break;
    }
  }

  finishFrame(state, skipEffects);
}

export function applyOffline(state: Draft, now = Date.now()) {
  const last = state.meta.lastTick || now;
  const elapsed = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - last) / 1000));
  prepareSave(state);
  for (const rarity of RARITIES) {
    if (isAutoSellEnabled(state, rarity)) flushAutoSellInventory(state, rarity);
  }

  const freshStart = state.character.level <= 1 && state.character.xp === 0 && elapsed > 30;
  if (freshStart) {
    tickGuild(state, now);
    state.meta.lastTick = Date.now();
    state.meta.pendingOffline = null;
    return;
  }

  if (elapsed < 0.05) {
    tickGuild(state, now);
    tickDungeonSession(state, now);
    syncCombatEffects(state);
    state.meta.lastTick = Date.now();
    state.meta.pendingOffline = null;
    return;
  }

  const before = {
    ore: state.resources.ore,
    gold: state.resources.gold,
    xp: lifetimeXp(state.character.level, state.character.xp),
    level: state.character.level,
    autoBattle: state.settings.autoBattle,
  };
  catchupKills = 0;
  const tickStartedAt = state.meta.lastTick || now;
  tickGame(state, elapsed);
  // Chunked catch-up: more work remains — skip the summary until we finish.
  const stillBehind = Math.max(0, (Date.now() - (state.meta.lastTick || Date.now())) / 1000);
  if (stillBehind > 1) {
    state.meta.pendingOffline = null;
    return;
  }

  if (elapsed < OFFLINE_REPORT_SECONDS) {
    state.meta.pendingOffline = null;
    return;
  }

  const caughtSec = Math.max(0, ((state.meta.lastTick || now) - tickStartedAt) / 1000);
  const reportSec = Math.max(caughtSec, elapsed - stillBehind);
  const ore = Math.max(0, state.resources.ore - before.ore);
  const gold = Math.max(0, state.resources.gold - before.gold);
  const xp = Math.max(0, lifetimeXp(state.character.level, state.character.xp) - before.xp);
  const levels = Math.max(0, state.character.level - before.level);
  const kills = catchupKills;
  const died = before.autoBattle && !state.settings.autoBattle;
  state.meta.pendingOffline = { seconds: Math.round(reportSec), ore, gold, xp, kills, levels, died };

  const bits: string[] = [];
  if (kills > 0) bits.push(`${kills} убийств`);
  if (xp > 0) bits.push(`+${xp} XP`);
  if (gold > 0) bits.push(`+${gold} золота`);
  if (ore > 0) bits.push(`+${ore} руды осколков`);
  if (levels > 0) bits.push(`+${levels} ур.`);
  if (bits.length) {
    pushLog(state, "system", `Офлайн-фарм за ${Math.round(elapsed)}с: ${bits.join(", ")}`);
  } else {
    pushLog(state, "system", `Вас не было ${Math.round(elapsed)}с.`);
  }
  if (died) {
    pushLog(state, "system", "Авто-бой остановился: персонаж пал, пока вас не было.");
  }
}

export function tickGame(state: Draft, dt: number) {
  if (dt <= 0) return;
  const wallNow = Date.now();
  const start = state.meta.lastTick || wallNow;
  prepareSave(state);
  tickGuild(state, wallNow);
  simulateHunters(state, dt, wallNow);

  if (dt <= CATCHUP_DT) {
    tickDungeonSession(state, wallNow);
    tickFrame(state, dt, false);
    state.meta.lastTick = Date.now();
    return;
  }

  const step = catchupStep(dt);
  let remaining = dt;
  let simNow = start;
  catchupKills = 0;
  catchupActive = true;
  try {
    withSuppressedCombatFx(() => {
      const wallStart = Date.now();
      while (remaining > 1e-9) {
        if (Date.now() - wallStart > CATCHUP_WALL_MS) break;
        const slice = Math.min(step, remaining);
        remaining -= slice;
        simNow += slice * 1000;
        tickDungeonSession(state, simNow);
        tickFrame(state, slice, remaining > step);
      }
    });
  } finally {
    catchupActive = false;
  }
  syncCombatEffects(state);
  state.combat.floatingTexts = [];
  if (remaining <= 1e-9) {
    state.meta.lastTick = Date.now();
  } else {
    // Leave unpaid sim time for the next pulse instead of skipping it.
    state.meta.lastTick = start + (dt - remaining) * 1000;
  }
}

export function findItem(state: Draft, itemId: string) {
  const invIdx = state.inventory.findIndex((it) => it?.id === itemId);
  if (invIdx >= 0) return { where: "inventory" as const, index: invIdx, item: state.inventory[invIdx]! };
  for (const slot of Object.keys(state.equipment) as (keyof Draft["equipment"])[]) {
    if (state.equipment[slot]?.id === itemId) {
      return { where: "equip" as const, slot, item: state.equipment[slot]! };
    }
  }
  return null;
}

export { pushLog, spawnNext, claimCurrentSpot };
export type { CombatLogEntry };
