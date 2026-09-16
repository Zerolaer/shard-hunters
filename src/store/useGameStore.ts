import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import {
  PROFILE_PERSIST_NAME,
  clearSaveBackup,
  createAccountStorage,
  flushCloudSave,
  getSessionAccountId,
} from "@/lib/auth/accounts";
import { expectedBm } from "@/lib/game/balance";
import { CLASS_DEFS } from "@/lib/game/classes";
import { applyClassChoice, migrateAssassinBuild, tagSaveItems } from "@/lib/game/classKit";
import { canWearItem } from "@/lib/game/equipment";
import {
  LOCATION_BY_ID,
  locationEntryBm,
  LOCATIONS,
  MAX_ENHANCE,
  MINES,
  normalizeInventory,
  resolvedAutoSell,
} from "@/lib/game/constants";
import {
  applyPresetGemsToEquipment,
  createGem,
  GEM_NAME,
  GEMS_PER_FUSION,
  gemScore,
  nextGemRank,
} from "@/lib/game/gems";
import {
  BLESSING,
  canBlessItem,
  canPunchItem,
  GEM_BAG_SIZE,
  rollSocketCount,
  SOCKET,
} from "@/lib/game/workshop";
import {
  resolveAvatarId,
  validateHunterName,
  type AvatarId,
} from "@/lib/game/avatars";
import { createInitialState } from "@/lib/game/createInitialState";
import {
  acceptGuildInvite,
  acceptIncomingApplication,
  activateGuildBuff,
  applyToWorldGuild,
  buyGuildShopItem,
  claimQuestReward,
  createPlayerGuild,
  declineIncomingApplication,
  inviteHunterToGuild,
  joinWorldGuild,
  leavePlayerGuild,
  noteGuildGoldTribute,
  normalizeGuild,
  rankGuildSkill,
  setGuildJoinMode,
  strikeGuildBoss,
} from "@/lib/game/guild";
import {
  DUNGEON_HALL_BY_ID,
  DUNGEON_TYPE_LABEL,
  dungeonBudgetRemainingMs,
  dungeonComfortBm,
  dungeonPausedRemainingMs,
  dungeonRecommendedBm,
  dungeonSpotId,
  emptyDungeonState,
  formatDungeonCountdown,
  isDungeonLocationId,
  migrateDungeonPauseResume,
  normalizeDungeonState,
} from "@/lib/game/dungeons";
import {
  emptyTowerState,
  isTowerLocationId,
  normalizeTowerState,
  TOWER_MIN_LEVEL,
  towerComfortBm,
  towerRecommendedBm,
} from "@/lib/game/tower";
import { emptySinBuild, emptySinCombat } from "@/lib/game/sin/state";
import { enhanceCost, enhanceLevelAfterFail, enhanceSuccessChance } from "@/lib/game/enhance";
import {
  goldFromSell,
  formatFullDigits,
  guildXpToNext,
  oreFromSalvage,
  statsOf,
} from "@/lib/game/formulas";
import { generateMonster, generateRival } from "@/lib/game/generators";
import {
  DEFAULT_SPOT_ID,
  ensureFarmState,
  FARM_SPOT_BY_ID,
  spotsForLocation,
  vacatePlayerSpots,
} from "@/lib/game/spots";
import {
  applySinPresetFills,
  canAllocateSinNode,
  canDumpSinMastery,
  canRankSinArt,
  canRankSinSkill,
  isSinSkillId,
  isSinSkillUnlocked,
  planSinPresetBuild,
  SIN_ART_BY_ID,
  SIN_NODE_BY_ID,
  SIN_PATH_BY_ID,
  SIN_PRESETS,
  SIN_SKILL_BY_ID,
  sinPresetArtsForRanks,
  sinPresetHotbarForRanks,
  spentSinPowerRanks,
  spentSinRanks,
  syncUnlockedSinRanks,
} from "@/lib/game/sin";
import {
  canAllocateTalent,
  isSkillUnlocked,
  respecCost,
  spentTalentRanks,
  TALENT_BY_ID,
} from "@/lib/game/talents";
import {
  planTalentPresetRanks,
  remainingTalentPresetFills,
  TALENT_PRESETS,
  talentPresetPointsRequired,
} from "@/lib/game/talentPresets";
import {
  compactInventory as compactInventorySlots,
  moveInventoryItem as moveInventorySlots,
  sortInventory as sortInventorySlots,
  type InventorySortMode,
} from "@/lib/game/inventory";
import {
  applyOffline,
  claimCurrentSpot,
  ensureWorld,
  findItem,
  flushAutoSellInventory,
  pauseDungeonSession,
  playerOrePerSec,
  pushLog,
  reclaimGems,
  spawnNext,
  syncAutoSellSettings,
  tickGame,
  beginTowerRun,
  leaveTowerSession,
  craftEchoChest as craftEchoChestInTick,
} from "@/lib/game/tick";
import { isMaterialItem, type EchoChestRarity } from "@/lib/game/echoCraft";
import type {
  CoreStat,
  DungeonType,
  EquipSlot,
  GameData,
  GemRank,
  GuildJoinMode,
  HunterClass,
  Rarity,
  SkillId,
  SinArtId,
  SinPathId,
  SinSkillId,
} from "@/lib/game/types";

export interface GameStore extends GameData {
  tick: (dt: number) => void;
  applyOfflineProgress: () => void;
  dismissOffline: () => void;
  toggleAutoBattle: () => void;
  setAutoBattle: (v: boolean) => void;
  renameCharacter: (name: string) => void;
  updateProfile: (name: string, avatarId: AvatarId) => { ok: boolean; message?: string };
  chooseClass: (classId: HunterClass) => void;
  allocateStat: (stat: CoreStat) => void;
  setLocation: (locationId: string) => void;
  challengeBoss: () => void;
  equipItem: (itemId: string) => void;
  unequipSlot: (slot: EquipSlot) => void;
  sellItem: (itemId: string) => void;
  sellItems: (itemIds: string[]) => { sold: number; gold: number };
  salvageItem: (itemId: string) => void;
  salvageItems: (itemIds: string[]) => { salvaged: number; ore: number };
  enhanceItem: (itemId: string) => { ok: boolean; message: string };
  blessItem: (itemId: string) => { ok: boolean; message: string };
  punchItem: (itemId: string) => { ok: boolean; message: string };
  socketGem: (itemId: string, socketIndex: number, gemId: string) => { ok: boolean; message: string };
  unsocketGem: (itemId: string, socketIndex: number) => { ok: boolean; message: string };
  fuseGems: (rank: GemRank) => { ok: boolean; message: string };
  discardGem: (gemId: string) => void;
  craftEchoChest: (rarity: EchoChestRarity) => { ok: boolean; message: string };
  moveInventoryItem: (fromIndex: number, toIndex: number) => void;
  sortInventory: (mode: InventorySortMode) => void;
  compactInventory: () => void;
  setAutoSell: (rarity: Rarity, value: boolean) => void;
  setAutoSellEnabled: (value: boolean) => void;
  setHotbar: (index: number, skillId: SkillId | null) => void;
  allocateTalent: (nodeId: string) => { ok: boolean; message: string };
  respecTalents: () => { ok: boolean; message: string };
  applyTalentPreset: (presetId: string) => { ok: boolean; message: string };
  applySinPreset: (presetId: string) => { ok: boolean; message: string };
  continuePreferredPreset: () => { ok: boolean; message: string };
  chooseSinPath: (path: SinPathId) => { ok: boolean; message: string };
  allocateSinNode: (nodeId: string) => { ok: boolean; message: string };
  rankSinSkill: (id: SinSkillId) => { ok: boolean; message: string };
  rankSinArt: (id: SinArtId) => { ok: boolean; message: string };
  rankSinMastery: () => { ok: boolean; message: string };
  setSinArt: (skillId: SinSkillId, artId: SinArtId | null) => void;
  selectSpot: (spotId: string) => { ok: boolean; message: string };
  challengeSpot: (spotId: string) => { ok: boolean; message: string };
  claimMine: (mineId: string, occupantId?: string) => { ok: boolean; message: string };
  leaveMine: () => void;
  enterDungeon: (hallId: string) => { ok: boolean; message: string };
  leaveDungeon: () => { ok: boolean; message: string };
  enterTower: () => { ok: boolean; message: string };
  donateToGuild: (kind: "gold" | "ore", amount: number) => void;
  createGuild: (name: string, tag: string, joinMode: GuildJoinMode, motd: string) => { ok: boolean; message: string };
  leaveGuild: () => { ok: boolean; message: string };
  joinListedGuild: (guildId: string) => { ok: boolean; message: string };
  applyListedGuild: (guildId: string) => { ok: boolean; message: string };
  acceptInvite: (inviteId: string) => { ok: boolean; message: string };
  acceptApplicant: (applicationId: string) => { ok: boolean; message: string };
  declineApplicant: (applicationId: string) => { ok: boolean; message: string };
  inviteToGuild: (hunter: { id: string; name: string; power: number }) => { ok: boolean; message: string };
  setJoinMode: (mode: GuildJoinMode) => { ok: boolean; message: string };
  claimGuildQuest: (defId: string) => { ok: boolean; message: string };
  strikeGuildBoss: () => { ok: boolean; message: string };
  buyGuildItem: (itemId: string) => { ok: boolean; message: string };
  rankGuildSkill: (skillId: string) => { ok: boolean; message: string };
  activateGuildBuff: (buffId: string) => { ok: boolean; message: string };
  resetSave: () => void;
}

function syncGuildPlayerName(state: GameData) {
  const m = state.guild.members.find((x) => x.isPlayer);
  if (m) m.name = state.character.name;
}

function leaveInstanceIfNeeded(s: GameData) {
  if (s.tower?.active || isTowerLocationId(s.combat.locationId)) {
    leaveTowerSession(s, "Вы покинули Башню. Этаж сохранён — можно вернуться.");
    return;
  }
  if (s.dungeon?.active || isDungeonLocationId(s.combat.locationId)) {
    pauseDungeonSession(
      s,
      "Вы покинули подземелье. Остаток времени сохранён — можно вернуться сегодня.",
    );
  }
}

export const useGameStore = create<GameStore>()(
  persist(
    immer((set) => ({
      ...createInitialState(),
      tick: (dt) =>
        set((s) => {
          tickGame(s, dt);
        }),
      applyOfflineProgress: () =>
        set((s) => {
          applyOffline(s);
        }),
      dismissOffline: () =>
        set((s) => {
          s.meta.pendingOffline = null;
        }),
      toggleAutoBattle: () =>
        set((s) => {
          s.settings.autoBattle = !s.settings.autoBattle;
          pushLog(
            s,
            "system",
            s.settings.autoBattle ? "Авто-бой включён." : "Авто-бой приостановлен.",
          );
        }),
      setAutoBattle: (v) =>
        set((s) => {
          s.settings.autoBattle = v;
        }),
      renameCharacter: (name) =>
        set((s) => {
          const checked = validateHunterName(name);
          if (!checked.ok) return;
          s.character.name = checked.name;
          syncGuildPlayerName(s);
        }),
      updateProfile: (name, avatarId) => {
        const checked = validateHunterName(name);
        if (!checked.ok) return checked;
        const avatar = resolveAvatarId(avatarId);
        set((s) => {
          s.character.name = checked.name;
          s.character.avatarId = avatar;
          syncGuildPlayerName(s);
        });
        return { ok: true };
      },
      chooseClass: (classId) =>
        set((s) => {
          if (s.character.classId) return;
          applyClassChoice(s, classId);
          const label = CLASS_DEFS[classId].name;
          pushLog(s, "system", `Класс выбран: ${label}. Оружие этого класса можно экипировать.`);
        }),
      allocateStat: (stat) =>
        set((s) => {
          if (s.character.unspentPoints <= 0) return;
          s.character.unspentPoints -= 1;
          s.character[stat] += 1;
          const derived = statsOf(s);
          s.character.hp = Math.min(derived.maxHp, s.character.hp + (stat === "endurance" ? 9 : 0));
        }),
      setLocation: (locationId) =>
        set((s) => {
          leaveInstanceIfNeeded(s);
          const loc = LOCATIONS.find((l) => l.id === locationId);
          if (!loc) return;
          if (!s.progression.unlockedLocationIds.includes(locationId)) return;
          if (s.character.level < loc.minLevel) return;
          const entry = locationEntryBm(loc);
          if (entry > 0 && statsOf(s).powerScore < entry) {
            pushLog(s, "system", `${loc.name}: нужно ${formatFullDigits(entry)} БМ.`);
            return;
          }
          s.combat.locationId = locationId;
          const floor = s.progression.locations[locationId]?.floor ?? 1;
          const spots = spotsForLocation(locationId);
          const mine = spots.find((sp) => s.farm[sp.id]?.occupant?.isPlayer)
            ?? spots.find((sp) => !s.farm[sp.id]?.occupant && sp.tier === "commons")
            ?? spots[0];
          if (mine) {
            s.combat.spotId = mine.id;
            if (!s.farm[mine.id]?.occupant) {
              claimCurrentSpot(s);
            }
          }
          s.combat.mode = "pve";
          s.combat.lootlessKills = 0;
          const danger = FARM_SPOT_BY_ID[s.combat.spotId]?.danger ?? 1;
          s.combat.monster = generateMonster({ locationId, floor, isBoss: false, danger });
          s.combat.playerAtkAcc = 0;
          s.combat.monsterAtkAcc = 0;
          pushLog(s, "system", `Переход: ${loc.name}, этаж ${floor} · ${FARM_SPOT_BY_ID[s.combat.spotId]?.name ?? "спот"}`);
        }),
      challengeBoss: () =>
        set((s) => {
          const locId = s.combat.locationId;
          if (isDungeonLocationId(locId) || s.dungeon?.active) return;
          const prog = s.progression.locations[locId];
          if (!prog?.bossReady) return;
          const floor = prog.floor;
          s.combat.mode = "pve";
          s.combat.monster = generateMonster({ locationId: locId, floor, isBoss: true });
          s.combat.playerAtkAcc = 0;
          s.combat.monsterAtkAcc = 0;
          s.settings.autoBattle = true;
          pushLog(s, "boss", `⚠ Фаза босса · этаж ${floor}: ${s.combat.monster.name}!`);
        }),
      equipItem: (itemId) =>
        set((s) => {
          const found = findItem(s, itemId);
          if (!found || found.where !== "inventory") return;
          const item = found.item;
          const wear = canWearItem(s.character.classId, item);
          if (!wear.ok) {
            pushLog(s, "system", wear.reason);
            return;
          }
          const current = s.equipment[item.slot];
          s.inventory[found.index] = current;
          s.equipment[item.slot] = item;
        }),
      unequipSlot: (slot) =>
        set((s) => {
          const item = s.equipment[slot];
          if (!item) return;
          const empty = s.inventory.findIndex((x) => x === null);
          if (empty === -1) {
            pushLog(s, "system", "Инвентарь полон — снять предмет нельзя.");
            return;
          }
          s.inventory[empty] = item;
          s.equipment[slot] = null;
        }),
      sellItem: (itemId) =>
        set((s) => {
          const found = findItem(s, itemId);
          if (!found || found.where !== "inventory") return;
          reclaimGems(s, found.item);
          const gold = goldFromSell(found.item);
          s.resources.gold += gold;
          s.inventory[found.index] = null;
          pushLog(s, "gold", `Продано: ${found.item.name} за ${gold} золота`);
        }),
      sellItems: (itemIds) => {
        let sold = 0;
        let gold = 0;
        set((s) => {
          const unique = [...new Set(itemIds)];
          for (const id of unique) {
            const found = findItem(s, id);
            if (!found || found.where !== "inventory") continue;
            reclaimGems(s, found.item);
            const g = goldFromSell(found.item);
            s.resources.gold += g;
            s.inventory[found.index] = null;
            gold += g;
            sold += 1;
          }
          if (sold > 0) {
            pushLog(s, "gold", `Продано предметов: ${sold} · +${gold} золота`);
          }
        });
        return { sold, gold };
      },
      salvageItem: (itemId) =>
        set((s) => {
          const found = findItem(s, itemId);
          if (!found || found.where !== "inventory") return;
          if (isMaterialItem(found.item)) {
            pushLog(s, "system", "Осколки эха разбираются в мастерской, не в руду.");
            return;
          }
          reclaimGems(s, found.item);
          const ore = oreFromSalvage(found.item);
          s.resources.ore += ore;
          s.inventory[found.index] = null;
          pushLog(s, "system", `Разбор: ${found.item.name} → ${ore} руды`);
        }),
      salvageItems: (itemIds) => {
        let salvaged = 0;
        let ore = 0;
        set((s) => {
          const unique = [...new Set(itemIds)];
          for (const id of unique) {
            const found = findItem(s, id);
            if (!found || found.where !== "inventory") continue;
            if (isMaterialItem(found.item)) continue;
            reclaimGems(s, found.item);
            const o = oreFromSalvage(found.item);
            s.resources.ore += o;
            s.inventory[found.index] = null;
            ore += o;
            salvaged += 1;
          }
          if (salvaged > 0) {
            pushLog(s, "system", `Разбор предметов: ${salvaged} · +${ore} руды`);
          }
        });
        return { salvaged, ore };
      },
      enhanceItem: (itemId) => {
        let result = { ok: false, message: "Предмет не найден" };
        set((s) => {
          const found = findItem(s, itemId);
          if (!found) return;
          const item = found.item;
          if (isMaterialItem(item)) {
            result = { ok: false, message: "Материал нельзя заточить" };
            return;
          }
          if (item.enhanceLevel >= MAX_ENHANCE) {
            result = { ok: false, message: "Достигнут предел +15" };
            return;
          }
          const cost = enhanceCost(item.enhanceLevel, item.itemLevel);
          if (s.resources.gold < cost.gold || s.resources.ore < cost.ore || s.resources.shards < cost.shards) {
            result = { ok: false, message: "Недостаточно ресурсов" };
            return;
          }
          s.resources.gold -= cost.gold;
          s.resources.ore -= cost.ore;
          s.resources.shards -= cost.shards;
          const chance = enhanceSuccessChance(item.enhanceLevel);
          if (Math.random() < chance) {
            item.enhanceLevel += 1;
            result = { ok: true, message: `Успех! ${item.name} теперь +${item.enhanceLevel}` };
            pushLog(s, "enhance", result.message);
          } else {
            const before = item.enhanceLevel;
            item.enhanceLevel = enhanceLevelAfterFail(before);
            const extra = item.enhanceLevel < before ? " Уровень заточки −1." : "";
            result = { ok: false, message: `Неудача.${extra}` };
            pushLog(s, "enhance", `${item.name}: ${result.message}`);
          }
        });
        return result;
      },
      blessItem: (itemId) => {
        let result = { ok: false, message: "Предмет не найден" };
        set((s) => {
          const found = findItem(s, itemId);
          if (!found) return;
          const item = found.item;
          const gate = canBlessItem(item);
          if (!gate.ok) {
            result = { ok: false, message: gate.reason };
            return;
          }
          const cost = BLESSING.cost;
          const sparks = s.resources.blessing ?? 0;
          if (s.resources.gold < cost.gold || s.resources.shards < cost.shards || sparks < cost.sparks) {
            result = { ok: false, message: "Не хватает искр или ресурсов" };
            return;
          }
          s.resources.gold -= cost.gold;
          s.resources.shards -= cost.shards;
          s.resources.blessing = sparks - cost.sparks;
          if (Math.random() < BLESSING.chance) {
            item.blessed = true;
            result = { ok: true, message: `${item.name} блеснут! Характеристики усилены.` };
          } else {
            result = { ok: false, message: "Благословение не легло. Искры сгорели, предмет цел." };
          }
          pushLog(s, "enhance", `Мастерская: ${result.message}`);
        });
        return result;
      },
      punchItem: (itemId) => {
        let result = { ok: false, message: "Предмет не найден" };
        set((s) => {
          const found = findItem(s, itemId);
          if (!found) return;
          const item = found.item;
          const gate = canPunchItem(item);
          if (!gate.ok) {
            result = { ok: false, message: gate.reason };
            return;
          }
          const cost = SOCKET.cost;
          const sparks = s.resources.blessing ?? 0;
          if (s.resources.gold < cost.gold || s.resources.shards < cost.shards || sparks < cost.sparks) {
            result = { ok: false, message: "Не хватает искр или ресурсов" };
            return;
          }
          s.resources.gold -= cost.gold;
          s.resources.shards -= cost.shards;
          s.resources.blessing = sparks - cost.sparks;
          const count = rollSocketCount();
          item.sockets = Array.from({ length: count }, () => null);
          result = { ok: true, message: `Пробой: ${count} ${count === 1 ? "гнездо" : "гнезда"}` };
          pushLog(s, "enhance", `${item.name} — ${result.message}`);
        });
        return result;
      },
      socketGem: (itemId, socketIndex, gemId) => {
        let result = { ok: false, message: "Нельзя вставить камень" };
        set((s) => {
          const found = findItem(s, itemId);
          if (!found?.item.sockets) return;
          const sockets = found.item.sockets;
          if (socketIndex < 0 || socketIndex >= sockets.length) return;
          if (sockets[socketIndex]) {
            result = { ok: false, message: "Гнездо занято" };
            return;
          }
          const idx = (s.gems ?? []).findIndex((g) => g.id === gemId);
          if (idx < 0) return;
          const gem = s.gems[idx]!;
          s.gems.splice(idx, 1);
          sockets[socketIndex] = gem;
          result = { ok: true, message: `${GEM_NAME[gem.rank]} вставлен` };
        });
        return result;
      },
      unsocketGem: (itemId, socketIndex) => {
        let result = { ok: false, message: "Гнездо пустое" };
        set((s) => {
          const found = findItem(s, itemId);
          if (!found?.item.sockets) return;
          const gem = found.item.sockets[socketIndex];
          if (!gem) return;
          if (!s.gems) s.gems = [];
          if (s.gems.length >= GEM_BAG_SIZE) {
            result = { ok: false, message: "Мешок камней полон" };
            return;
          }
          found.item.sockets[socketIndex] = null;
          s.gems.push(gem);
          result = { ok: true, message: `${GEM_NAME[gem.rank]} извлечён` };
        });
        return result;
      },
      fuseGems: (rank) => {
        let result = { ok: false, message: "Нужно три камня одного грейда" };
        set((s) => {
          const next = nextGemRank(rank);
          if (!next) {
            result = { ok: false, message: "Мифический — предел ладдера" };
            return;
          }
          if (!s.gems) s.gems = [];
          // Spend the worst rolls first, so fusing never eats the gem the player
          // was saving for a socket.
          const fodder = s.gems
            .map((gem, index) => ({ gem, index }))
            .filter((row) => row.gem.rank === rank)
            .sort((a, b) => gemScore(a.gem) - gemScore(b.gem))
            .slice(0, GEMS_PER_FUSION);
          if (fodder.length < GEMS_PER_FUSION) return;
          for (const row of fodder.sort((a, b) => b.index - a.index)) {
            s.gems.splice(row.index, 1);
          }
          const fused = createGem(next);
          s.gems.push(fused);
          result = { ok: true, message: `Скрещено: ${GEM_NAME[fused.rank]}` };
          pushLog(s, "system", `Мастерская: ${result.message}`);
        });
        return result;
      },
      discardGem: (gemId) =>
        set((s) => {
          if (!s.gems) return;
          const idx = s.gems.findIndex((g) => g.id === gemId);
          if (idx >= 0) s.gems.splice(idx, 1);
        }),
      craftEchoChest: (rarity) => {
        let result = { ok: false, message: "Не вышло" };
        set((s) => {
          result = craftEchoChestInTick(s, rarity);
        });
        return result;
      },
      moveInventoryItem: (fromIndex, toIndex) =>
        set((s) => {
          moveInventorySlots(s.inventory, fromIndex, toIndex);
        }),
      sortInventory: (mode) =>
        set((s) => {
          sortInventorySlots(s.inventory, mode);
        }),
      compactInventory: () =>
        set((s) => {
          compactInventorySlots(s.inventory);
        }),
      setAutoSell: (rarity, value) =>
        set((s) => {
          syncAutoSellSettings(s);
          s.settings.autoSellEnabled = true;
          s.settings.autoSell = { ...s.settings.autoSell, [rarity]: value };
          if (value) flushAutoSellInventory(s, rarity);
        }),
      setAutoSellEnabled: (value) =>
        set((s) => {
          syncAutoSellSettings(s);
          s.settings.autoSellEnabled = value;
          if (value) {
            for (const rarity of Object.keys(s.settings.autoSell) as Rarity[]) {
              if (s.settings.autoSell[rarity]) flushAutoSellInventory(s, rarity);
            }
          }
        }),
      applyTalentPreset: (presetId) => {
        let result = { ok: false, message: "Пресет недоступен" };
        set((s) => {
          if (s.character.classId === "assassin") {
            result = { ok: false, message: "Для Сина — пресеты пути тени" };
            return;
          }
          const preset = TALENT_PRESETS.find((p) => p.id === presetId);
          if (!preset) return;
          const budget = Math.max(0, s.character.level - 1);
          const plan = planTalentPresetRanks(preset, budget);
          const def = s.character.classId ? CLASS_DEFS[s.character.classId] : CLASS_DEFS.warrior;
          s.talents.ranks = { ...plan.ranks };
          if ((s.talents.ranks[def.starterTalent] ?? 0) < 1) {
            s.talents.ranks[def.starterTalent] = 1;
          }
          const spent = spentTalentRanks(s.talents.ranks);
          s.talents.points = Math.max(0, budget - spent);
          const bar: Array<SkillId | null> = [null, null, null, null];
          let i = 0;
          for (const sid of preset.hotbar) {
            if (i > 3) break;
            if (isSkillUnlocked(s.talents.ranks, sid)) {
              bar[i] = sid;
              i += 1;
            }
          }
          if (!bar[0]) bar[0] = def.starterSkill;
          s.combat.hotbar = bar;
          if (!s.gems) s.gems = [];
          const gemsIn = applyPresetGemsToEquipment(s.equipment, s.gems, preset.gemStatPriority);
          const need = talentPresetPointsRequired(preset);
          const gemNote = gemsIn > 0 ? ` · камни +${gemsIn}` : "";
          result = {
            ok: true,
            message: plan.trimmed
              ? `Пресет «${preset.name}»: путь по приоритету, ${plan.spent}/${need} очк.${gemNote}`
              : `Пресет «${preset.name}»: полный билд, ${plan.spent} очк.${gemNote}`,
          };
          pushLog(s, "system", `Билд: ${result.message}`);
        });
        return result;
      },
      applySinPreset: (presetId) => {
        let result = { ok: false, message: "Пресет недоступен" };
        set((s) => {
          if (s.character.classId !== "assassin") {
            result = { ok: false, message: "Пресеты тени — только для Сина" };
            return;
          }
          const preset = SIN_PRESETS.find((p) => p.id === presetId);
          if (!preset) return;
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          if (!s.combat.sin) s.combat.sin = emptySinCombat();
          const budget = Math.max(0, s.character.level - 1);
          const plan = planSinPresetBuild(preset, budget);
          s.sinBuild = {
            path: plan.path,
            ranks: { ...plan.ranks, "sin-starter": 1 },
            arts: { ...plan.arts },
            skillRanks: { ...plan.skillRanks },
            artRanks: { ...plan.artRanks },
            mastery: plan.mastery,
          };
          syncUnlockedSinRanks(s.sinBuild);
          s.talents.ranks = {};
          s.talents.points = Math.max(
            0,
            budget - spentSinRanks(s.sinBuild.ranks) - spentSinPowerRanks(s.sinBuild),
          );
          s.combat.hotbar = [...plan.hotbar];
          if (!s.gems) s.gems = [];
          const gemsIn = applyPresetGemsToEquipment(s.equipment, s.gems, preset.gemStatPriority);
          const pathName = SIN_PATH_BY_ID[preset.path].name;
          const gemNote = gemsIn > 0 ? ` · камни +${gemsIn}` : "";
          const artsN = Object.keys(plan.arts).length;
          result = {
            ok: true,
            message: `Пресет «${preset.name}» · ${pathName}: ${plan.spent} очк. (дерево ${plan.treeSpent} · ранги ${plan.powerSpent} · искусства ${artsN})${gemNote}`,
          };
          pushLog(s, "system", `Син: ${result.message}`);
        });
        return result;
      },
      continuePreferredPreset: () => {
        let result = { ok: false, message: "Нет активного пресета" };
        set((s) => {
          const pref =
            typeof window !== "undefined"
              ? window.localStorage.getItem("sh-preferred-preset")
              : null;
          if (!pref) return;
          if (s.character.classId === "assassin") {
            const preset = SIN_PRESETS.find((p) => p.id === pref);
            if (!preset || s.sinBuild?.path !== preset.path) return;
            if (!s.sinBuild) return;
            const before = s.talents.points;
            const { applied, pointsLeft } = applySinPresetFills(
              preset,
              s.sinBuild,
              s.talents.points,
            );
            s.talents.points = pointsLeft;
            syncUnlockedSinRanks(s.sinBuild);
            const arts = sinPresetArtsForRanks(preset, s.sinBuild.ranks);
            for (const [skillId, artId] of Object.entries(arts)) {
              const sid = skillId as SinSkillId;
              if (!s.sinBuild.arts[sid] && artId) s.sinBuild.arts[sid] = artId;
            }
            const wantBar = sinPresetHotbarForRanks(preset, s.sinBuild.ranks);
            for (const want of wantBar) {
              if (!want || s.combat.hotbar.includes(want)) continue;
              const empty = s.combat.hotbar.findIndex((x) => x === null);
              if (empty >= 0) {
                s.combat.hotbar[empty] = want;
                continue;
              }
              // Prefer recommended skills over a leftover flurry filler.
              const flurryIdx = s.combat.hotbar.indexOf("sin-flurry");
              if (flurryIdx >= 0 && want !== "sin-flurry" && !preset.hotbar.includes("sin-flurry")) {
                s.combat.hotbar[flurryIdx] = want;
              }
            }
            if (applied <= 0) {
              result = { ok: false, message: "Нечего добирать по пресету" };
              return;
            }
            result = {
              ok: true,
              message: `Пресет: +${applied} по пути (было ${before} очк.)`,
            };
            pushLog(s, "system", result.message);
            return;
          }
          const preset = TALENT_PRESETS.find((p) => p.id === pref);
          if (!preset) return;
          const fills = remainingTalentPresetFills(preset, s.talents.ranks, s.talents.points);
          let n = 0;
          for (const id of fills) {
            if (!canAllocateTalent(s.talents.ranks, id, s.talents.points)) break;
            s.talents.points -= 1;
            s.talents.ranks[id] = (s.talents.ranks[id] ?? 0) + 1;
            n += 1;
          }
          // Equip newly unlocked hotbar skills into empty slots.
          for (const sid of preset.hotbar) {
            if (!isSkillUnlocked(s.talents.ranks, sid)) continue;
            if (s.combat.hotbar.includes(sid)) continue;
            const empty = s.combat.hotbar.findIndex((x) => x === null);
            if (empty < 0) break;
            s.combat.hotbar[empty] = sid;
          }
          if (n <= 0) {
            result = { ok: false, message: "Нечего добирать по пресету" };
            return;
          }
          result = { ok: true, message: `Пресет: +${n} очков по пути` };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      setHotbar: (index, skillId) =>
        set((s) => {
          if (index < 0 || index > 3) return;
          if (skillId) {
            if (s.character.classId === "assassin") {
              if (!isSinSkillId(skillId) || !isSinSkillUnlocked(s.sinBuild.ranks, skillId)) return;
            } else if (!isSkillUnlocked(s.talents.ranks, skillId)) {
              return;
            }
            const already = s.combat.hotbar.indexOf(skillId);
            if (already >= 0) s.combat.hotbar[already] = null;
          }
          s.combat.hotbar[index] = skillId;
        }),
      allocateTalent: (nodeId) => {
        let result = { ok: false, message: "Нельзя взять узел" };
        set((s) => {
          if (s.character.classId === "assassin") {
            result = { ok: false, message: "Син вкладывает очки в искусства тени" };
            return;
          }
          if (!canAllocateTalent(s.talents.ranks, nodeId, s.talents.points)) {
            result = { ok: false, message: "Нет очков, пререквизитов или узел полон" };
            return;
          }
          const node = TALENT_BY_ID[nodeId];
          if (!node) return;
          s.talents.points -= 1;
          s.talents.ranks[nodeId] = (s.talents.ranks[nodeId] ?? 0) + 1;
          if (node.skillId) {
            const empty = s.combat.hotbar.findIndex((x) => x === null);
            if (empty >= 0 && !s.combat.hotbar.includes(node.skillId)) {
              s.combat.hotbar[empty] = node.skillId;
            }
          }
          result = { ok: true, message: `${node.name} ${s.talents.ranks[nodeId]}/${node.maxRank}` };
          pushLog(s, "system", `Билд: ${result.message}`);
        });
        return result;
      },
      chooseSinPath: (path) => {
        let result = { ok: false, message: "Путь недоступен" };
        set((s) => {
          if (s.character.classId !== "assassin") {
            result = { ok: false, message: "Пути тени — только для Сина" };
            return;
          }
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          if (!s.combat.sin) s.combat.sin = emptySinCombat();
          const prev = s.sinBuild.path;
          if (prev === path) {
            result = { ok: true, message: "Путь уже выбран" };
            return;
          }
          if (prev && prev !== path) {
            const cost = Math.round(respecCost(s.character.level) * 0.45);
            if (s.resources.gold < cost) {
              result = { ok: false, message: `Смена пути: ${cost} золота` };
              return;
            }
            s.resources.gold -= cost;
          }
          s.sinBuild.path = path;
          s.sinBuild.ranks["sin-starter"] = 1;
          const root = SIN_PATH_BY_ID[path].starterNode;
          if ((s.sinBuild.ranks[root] ?? 0) < 1) {
            s.sinBuild.ranks[root] = 1;
            const node = SIN_NODE_BY_ID[root];
            if (node?.skillId && !s.combat.hotbar.includes(node.skillId)) {
              const empty = s.combat.hotbar.findIndex((x) => x === null);
              if (empty >= 0) s.combat.hotbar[empty] = node.skillId;
            }
          }
          syncUnlockedSinRanks(s.sinBuild);
          if (!s.combat.hotbar.includes("sin-flurry")) {
            const empty = s.combat.hotbar.findIndex((x) => x === null);
            if (empty >= 0) s.combat.hotbar[empty] = "sin-flurry";
          }
          const label = SIN_PATH_BY_ID[path].name;
          result = { ok: true, message: `Путь: ${label}` };
          pushLog(s, "system", `Син избирает путь «${label}». Искусства перестраиваются.`);
        });
        return result;
      },
      allocateSinNode: (nodeId) => {
        let result = { ok: false, message: "Нельзя взять узел" };
        set((s) => {
          if (s.character.classId !== "assassin") return;
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          if (
            !canAllocateSinNode(s.sinBuild.ranks, nodeId, s.talents.points, s.sinBuild.path)
          ) {
            result = { ok: false, message: "Нет очков, пререквизитов, пути или узел полон" };
            return;
          }
          const node = SIN_NODE_BY_ID[nodeId];
          if (!node) return;
          s.talents.points -= 1;
          s.sinBuild.ranks[nodeId] = (s.sinBuild.ranks[nodeId] ?? 0) + 1;
          syncUnlockedSinRanks(s.sinBuild);
          if (node.skillId) {
            const empty = s.combat.hotbar.findIndex((x) => x === null);
            if (empty >= 0 && !s.combat.hotbar.includes(node.skillId)) {
              s.combat.hotbar[empty] = node.skillId;
            }
          }
          result = {
            ok: true,
            message: `${node.name} ${s.sinBuild.ranks[nodeId]}/${node.maxRank}`,
          };
          pushLog(s, "system", `Искусство: ${result.message}`);
        });
        return result;
      },
      rankSinSkill: (id) => {
        let result = { ok: false, message: "Нельзя поднять ранг" };
        set((s) => {
          if (s.character.classId !== "assassin") return;
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          syncUnlockedSinRanks(s.sinBuild);
          if (!canRankSinSkill(s.sinBuild, s.talents.points, id)) {
            result = { ok: false, message: "Нет очков, навык закрыт или ранг 20" };
            return;
          }
          s.talents.points -= 1;
          s.sinBuild.skillRanks[id] = (s.sinBuild.skillRanks[id] ?? 1) + 1;
          const rank = s.sinBuild.skillRanks[id] ?? 1;
          const name = SIN_SKILL_BY_ID[id]?.name ?? id;
          result = { ok: true, message: `${name} ранг ${rank}` };
          pushLog(s, "system", `Ранг искусства: ${result.message}`);
        });
        return result;
      },
      rankSinArt: (id) => {
        let result = { ok: false, message: "Нельзя поднять ранг" };
        set((s) => {
          if (s.character.classId !== "assassin") return;
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          syncUnlockedSinRanks(s.sinBuild);
          if (!canRankSinArt(s.sinBuild, s.talents.points, id)) {
            result = { ok: false, message: "Нет очков, сокет закрыт или ранг 20" };
            return;
          }
          s.talents.points -= 1;
          s.sinBuild.artRanks[id] = (s.sinBuild.artRanks[id] ?? 1) + 1;
          const rank = s.sinBuild.artRanks[id] ?? 1;
          const name = SIN_ART_BY_ID[id]?.name ?? id;
          result = { ok: true, message: `${name} ранг ${rank}` };
          pushLog(s, "system", `Ранг сокета: ${result.message}`);
        });
        return result;
      },
      rankSinMastery: () => {
        let result = { ok: false, message: "Нельзя вложить в мастерство" };
        set((s) => {
          if (s.character.classId !== "assassin") return;
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          syncUnlockedSinRanks(s.sinBuild);
          if (!canDumpSinMastery(s.sinBuild, s.talents.points)) {
            result = { ok: false, message: "Сначала доведите навыки и сокеты до ранга 20" };
            return;
          }
          s.talents.points -= 1;
          s.sinBuild.mastery = (s.sinBuild.mastery ?? 0) + 1;
          result = { ok: true, message: `Мастерство тени ${s.sinBuild.mastery}` };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      setSinArt: (skillId, artId) =>
        set((s) => {
          if (s.character.classId !== "assassin") return;
          if (!s.sinBuild) s.sinBuild = emptySinBuild();
          if (artId) {
            for (const [id, equipped] of Object.entries(s.sinBuild.arts)) {
              if (equipped === artId && id !== skillId) {
                delete s.sinBuild.arts[id as SinSkillId];
              }
            }
            s.sinBuild.arts[skillId] = artId;
          } else {
            delete s.sinBuild.arts[skillId];
          }
        }),
      respecTalents: () => {
        let result = { ok: false, message: "Недостаточно золота" };
        set((s) => {
          const cost = respecCost(s.character.level);
          if (s.resources.gold < cost) {
            result = { ok: false, message: `Нужно ${cost} золота` };
            return;
          }
          s.resources.gold -= cost;
          if (s.character.classId === "assassin") {
            const treeSpent = spentSinRanks(s.sinBuild?.ranks ?? {});
            const powerSpent = spentSinPowerRanks(s.sinBuild);
            s.sinBuild = {
              path: null,
              ranks: { "sin-starter": 1 },
              arts: {},
              skillRanks: { "sin-flurry": 1 },
              artRanks: {},
              mastery: 0,
            };
            s.talents.ranks = {};
            s.talents.points = Math.max(0, s.character.level - 1);
            s.combat.hotbar = ["sin-flurry", null, null, null];
            s.combat.sin = emptySinCombat();
            result = {
              ok: true,
              message: `Сброс пути тени (−${cost} зол.). Возвращено ${treeSpent + powerSpent} очков.`,
            };
            pushLog(s, "system", result.message);
            return;
          }
          const spent = spentTalentRanks(s.talents.ranks);
          const def = s.character.classId ? CLASS_DEFS[s.character.classId] : CLASS_DEFS.warrior;
          s.talents.ranks = { [def.starterTalent]: 1 };
          s.talents.points = Math.max(0, s.character.level - 1);
          s.combat.hotbar = [def.starterSkill, null, null, null];
          result = { ok: true, message: `Сброс билда (−${cost} зол.). Возвращено ${Math.max(0, spent - 1)} очков.` };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      selectSpot: (spotId) => {
        let result = { ok: false, message: "Спот недоступен" };
        set((s) => {
          if (s.dungeon?.active || isDungeonLocationId(s.combat.locationId)) {
            leaveInstanceIfNeeded(s);
          }
          const def = FARM_SPOT_BY_ID[spotId];
          if (!def || isDungeonLocationId(def.locationId)) return;
          if (!s.progression.unlockedLocationIds.includes(def.locationId)) return;
          const loc = LOCATIONS.find((l) => l.id === def.locationId);
          if (!loc || s.character.level < loc.minLevel) {
            result = { ok: false, message: `Нужен ${loc?.minLevel ?? "?"} уровень` };
            return;
          }
          const entry = locationEntryBm(loc);
          if (entry > 0 && statsOf(s).powerScore < entry) {
            result = { ok: false, message: `Нужно ${formatFullDigits(entry)} БМ` };
            return;
          }
          const occ = s.farm[spotId]?.occupant;
          if (occ && !occ.isPlayer) {
            result = { ok: false, message: "Спот занят. Нападите, чтобы выбить охотника." };
            return;
          }
          s.combat.locationId = def.locationId;
          s.combat.spotId = spotId;
          s.combat.mode = "pve";
          s.combat.lootlessKills = 0;
          claimCurrentSpot(s);
          spawnNext(s, false);
          result = { ok: true, message: `Фарм: ${def.name} (${def.tier})` };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      challengeSpot: (spotId) => {
        let result = { ok: false, message: "Некого атаковать" };
        set((s) => {
          const def = FARM_SPOT_BY_ID[spotId];
          const occ = s.farm[spotId]?.occupant;
          if (!def || !occ || occ.isPlayer) return;
          if (!s.progression.unlockedLocationIds.includes(def.locationId)) return;
          const locDef = LOCATION_BY_ID[def.locationId];
          const entry = locDef ? locationEntryBm(locDef) : 0;
          if (entry > 0 && statsOf(s).powerScore < entry) {
            result = { ok: false, message: `Нужно ${formatFullDigits(entry)} БМ` };
            return;
          }
          s.combat.locationId = def.locationId;
          s.combat.spotId = spotId;
          s.combat.mode = "pvp";
          s.combat.lootlessKills = 0;
          s.combat.monster = generateRival({ name: occ.name, power: occ.power });
          s.combat.playerAtkAcc = 0;
          s.combat.monsterAtkAcc = 0;
          s.combat.wardHits = 0;
          s.settings.autoBattle = true;
          result = { ok: true, message: `Нападение на ${occ.name} (${formatFullDigits(occ.power)} БМ)` };
          pushLog(s, "pvp", `Схватка за спот «${def.name}»: ${occ.name} из «${occ.guild}»`);
        });
        return result;
      },
      claimMine: (mineId, occupantId) => {
        let result = { ok: false, message: "Шахта недоступна" };
        set((s) => {
          const def = MINES.find((m) => m.id === mineId);
          if (!def) return;
          if (s.character.level < def.minLevel) {
            result = { ok: false, message: `Нужен ${def.minLevel} уровень` };
            return;
          }
          const mine = s.mines[mineId];
          if (!mine) return;
          const derived = statsOf(s);
          const needBm = expectedBm(def.bmLevel ?? def.minLevel);
          if (derived.powerScore < needBm) {
            result = { ok: false, message: `Нужно ${formatFullDigits(needBm)} БМ` };
            return;
          }

          for (const m of Object.values(s.mines)) {
            m.occupants = m.occupants.filter((o) => !o.isPlayer);
          }

          const playerOcc = {
            id: "player",
            name: s.character.name,
            guild: s.guild.name,
            power: derived.powerScore,
            isPlayer: true,
          };

          if (occupantId) {
            const target = mine.occupants.find((o) => o.id === occupantId);
            if (!target) return;
            if (derived.powerScore <= target.power) {
              result = { ok: false, message: "Недостаточно БМ для вытеснения" };
              return;
            }
            mine.occupants = mine.occupants.filter((o) => o.id !== occupantId);
            mine.occupants.push(playerOcc);
            result = { ok: true, message: `Вытеснен ${target.name}. Шахта ваша.` };
            pushLog(s, "system", result.message);
            return;
          }

          if (mine.occupants.length >= def.slots) {
            result = { ok: false, message: "Нет свободных штолен. Вытесните слабейшего." };
            return;
          }
          mine.occupants.push(playerOcc);
          result = { ok: true, message: `Занята штольня: ${def.name}` };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      leaveMine: () =>
        set((s) => {
          for (const m of Object.values(s.mines)) {
            m.occupants = m.occupants.filter((o) => !o.isPlayer);
          }
          pushLog(s, "system", "Вы покинули шахты.");
        }),
      enterDungeon: (hallId) => {
        let result = { ok: false, message: "Зал недоступен" };
        set((s) => {
          if (!s.dungeon) s.dungeon = emptyDungeonState();
          const hall = DUNGEON_HALL_BY_ID[hallId];
          if (!hall) return;
          if (s.character.level < hall.minLevel) {
            result = { ok: false, message: `Нужен ${hall.minLevel} уровень` };
            return;
          }
          if (s.dungeon.active) {
            result = { ok: false, message: "Вы уже в подземелье" };
            return;
          }
          if (s.tower?.active || isTowerLocationId(s.combat.locationId)) {
            result = { ok: false, message: "Сначала покиньте Башню" };
            return;
          }
          const now = Date.now();
          const budget = dungeonBudgetRemainingMs(s.dungeon, hall.type, now);
          if (budget <= 0) {
            result = {
              ok: false,
              message: `${DUNGEON_TYPE_LABEL[hall.type]} уже пройден сегодня`,
            };
            return;
          }
          const resuming = dungeonPausedRemainingMs(s.dungeon, hall.type, now) > 0;
          const derived = statsOf(s);
          const comfort = dungeonComfortBm(hall);
          const rec = dungeonRecommendedBm(hall);
          const spotId = dungeonSpotId(hall.id);
          if (!s.progression.locations[hall.id]) {
            s.progression.locations[hall.id] = {
              floor: 1,
              killsOnFloor: 0,
              bossReady: false,
              cleared: false,
            };
          }
          vacatePlayerSpots(s.farm);
          s.combat.locationId = hall.id;
          s.combat.spotId = spotId;
          s.combat.mode = "pve";
          s.combat.lootlessKills = 0;
          s.combat.monster = generateMonster({
            locationId: hall.id,
            floor: 1,
            isBoss: false,
            danger: FARM_SPOT_BY_ID[spotId]?.danger ?? 1,
          });
          s.combat.playerAtkAcc = 0;
          s.combat.monsterAtkAcc = 0;
          if (!s.dungeon.paused) s.dungeon.paused = {};
          delete s.dungeon.paused[hall.type];
          s.dungeon.active = {
            type: hall.type,
            hallId: hall.id,
            endsAt: now + budget,
          };
          s.settings.autoBattle = true;
          const bmWarn =
            derived.powerScore < comfort
              ? ` · БМ слабовато (рек. ${formatFullDigits(rec)}) — будете умирать`
              : "";
          const timeNote = resuming
            ? `Продолжение — осталось ${formatDungeonCountdown(budget)}.`
            : "Час начался.";
          result = {
            ok: true,
            message: `Подземелье: ${hall.name}. ${timeNote}${bmWarn}`,
          };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      leaveDungeon: () => {
        let result = { ok: false, message: "Вы не в подземелье" };
        set((s) => {
          if (s.tower?.active || isTowerLocationId(s.combat.locationId)) {
            leaveTowerSession(s, "Вы покинули Башню. Этаж сохранён — можно вернуться.");
            result = { ok: true, message: "Выход из Башни. Прогресс этажей сохранён." };
            return;
          }
          if (!s.dungeon?.active && !isDungeonLocationId(s.combat.locationId)) return;
          pauseDungeonSession(
            s,
            "Вы покинули подземелье. Остаток времени сохранён — можно вернуться сегодня.",
          );
          result = { ok: true, message: "Выход из подземелья. Таймер на паузе." };
        });
        return result;
      },
      enterTower: () => {
        let result = { ok: false, message: "Башня недоступна" };
        set((s) => {
          if (!s.tower) s.tower = emptyTowerState();
          s.tower = normalizeTowerState(s.tower);
          if (s.character.level < TOWER_MIN_LEVEL) {
            result = { ok: false, message: `Нужен ${TOWER_MIN_LEVEL} уровень` };
            return;
          }
          if (s.dungeon?.active) {
            result = { ok: false, message: "Сначала покиньте зал подземелья" };
            return;
          }
          if (s.tower.active || isTowerLocationId(s.combat.locationId)) {
            result = { ok: false, message: "Вы уже в Башне" };
            return;
          }
          const floor = s.tower.floor;
          const derived = statsOf(s);
          const rec = towerRecommendedBm(floor);
          const comfort = towerComfortBm(floor);
          beginTowerRun(s);
          const bmWarn =
            derived.powerScore < comfort
              ? ` · БМ слабовато (рек. ${formatFullDigits(rec)}) — этаж опасен`
              : "";
          result = {
            ok: true,
            message: `Башня Испытаний · этаж ${floor}.${bmWarn}`,
          };
          pushLog(s, "system", result.message);
        });
        return result;
      },
      donateToGuild: (kind, amount) =>
        set((s) => {
          if (!s.guild.id) return;
          const qty = Math.floor(amount);
          if (!Number.isFinite(qty) || qty <= 0) return;
          if (kind === "gold") {
            if (s.resources.gold < qty) return;
            s.resources.gold -= qty;
            s.guild.treasuryGold += qty;
            s.guild.xp += Math.round(qty * 0.12);
            s.guild.coins += Math.max(0, Math.floor(qty / 55));
            noteGuildGoldTribute(s.guild, qty);
          } else {
            if (s.resources.ore < qty) return;
            s.resources.ore -= qty;
            s.guild.treasuryOre += qty;
            s.guild.xp += qty * 3;
            s.guild.coins += Math.max(0, Math.floor(qty / 12));
          }
          const player = s.guild.members.find((m) => m.isPlayer);
          if (player) player.contribution += qty;
          while (s.guild.xp >= guildXpToNext(s.guild.level)) {
            s.guild.xp -= guildXpToNext(s.guild.level);
            s.guild.level += 1;
            pushLog(s, "system", `Гильдия «${s.guild.name}» — уровень ${s.guild.level}! Баффы усилены.`);
          }
        }),
      createGuild: (name, tag, joinMode, motd) => {
        let result = { ok: false, message: "Не удалось создать" };
        set((s) => {
          result = createPlayerGuild(s, name, tag, joinMode, motd);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      leaveGuild: () => {
        let result = { ok: false, message: "Вы не в гильдии" };
        set((s) => {
          result = leavePlayerGuild(s);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      joinListedGuild: (guildId) => {
        let result = { ok: false, message: "Нельзя вступить" };
        set((s) => {
          result = joinWorldGuild(s, guildId, statsOf(s).powerScore);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      applyListedGuild: (guildId) => {
        let result = { ok: false, message: "Нельзя подать заявку" };
        set((s) => {
          result = applyToWorldGuild(s, guildId, statsOf(s).powerScore);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      acceptInvite: (inviteId) => {
        let result = { ok: false, message: "Нет приглашения" };
        set((s) => {
          result = acceptGuildInvite(s, inviteId, statsOf(s).powerScore);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      acceptApplicant: (applicationId) => {
        let result = { ok: false, message: "Нет заявки" };
        set((s) => {
          result = acceptIncomingApplication(s, applicationId);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      declineApplicant: (applicationId) => {
        let result = { ok: false, message: "Нет заявки" };
        set((s) => {
          result = declineIncomingApplication(s.guild, applicationId);
        });
        return result;
      },
      inviteToGuild: (hunter) => {
        let result = { ok: false, message: "Нельзя пригласить" };
        set((s) => {
          result = inviteHunterToGuild(s, hunter);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      setJoinMode: (mode) => {
        let result = { ok: false, message: "Нет прав" };
        set((s) => {
          result = setGuildJoinMode(s.guild, mode);
        });
        return result;
      },
      claimGuildQuest: (defId) => {
        let result = { ok: false, message: "Нет задания" };
        set((s) => {
          result = claimQuestReward(s.guild, defId);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      strikeGuildBoss: () => {
        let result = { ok: false, message: "Нет босса" };
        set((s) => {
          const r = strikeGuildBoss(s.guild, statsOf(s).powerScore);
          result = { ok: r.ok, message: r.message };
          if (r.ok) pushLog(s, r.killed ? "boss" : "system", r.message);
        });
        return result;
      },
      buyGuildItem: (itemId) => {
        let result = { ok: false, message: "Не купить" };
        set((s) => {
          result = buyGuildShopItem(s, itemId);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      rankGuildSkill: (skillId) => {
        let result = { ok: false, message: "Нельзя" };
        set((s) => {
          result = rankGuildSkill(s.guild, skillId);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      activateGuildBuff: (buffId) => {
        let result = { ok: false, message: "Нельзя" };
        set((s) => {
          result = activateGuildBuff(s.guild, buffId);
          if (result.ok) pushLog(s, "system", result.message);
        });
        return result;
      },
      resetSave: () => {
        set(() => ({
          ...createInitialState(),
        }));
        const id = getSessionAccountId();
        if (id) {
          clearSaveBackup(id, PROFILE_PERSIST_NAME);
          flushCloudSave();
        }
      },
    })),
    {
      name: PROFILE_PERSIST_NAME,
      storage: createJSONStorage(() => createAccountStorage(PROFILE_PERSIST_NAME)),
      skipHydration: true,
      version: 8,
      migrate: (persisted, version) => {
        const p = persisted as GameData;
        if (version < 8) {
          p.tower = emptyTowerState();
        }
        if (version < 7) {
          p.dungeon = migrateDungeonPauseResume(p.dungeon);
        }
        if (version < 6) {
          p.worldHunters = [];
          if (p.meta) p.meta.hunterAcc = 0;
        }
        if (version < 5) {
          if (!p.dungeon) {
            p.dungeon = emptyDungeonState();
          } else {
            if (p.dungeon.active === undefined) p.dungeon.active = null;
            if (!p.dungeon.dailyUsed) p.dungeon.dailyUsed = {};
            if (!p.dungeon.paused) p.dungeon.paused = {};
          }
        }
        if (version < 4) {
          if (!p.gems) p.gems = [];
          if (p.resources && p.resources.blessing == null) p.resources.blessing = 0;
        }
        if (version < 3) {
          const bump = (n: number) => Math.round(n * 6.4);
          if (p.farm) {
            for (const spot of Object.values(p.farm)) {
              if (spot.occupant && !spot.occupant.isPlayer) {
                spot.occupant.power = bump(spot.occupant.power);
              }
            }
          }
          if (p.mines) {
            for (const mine of Object.values(p.mines)) {
              for (const occ of mine.occupants) {
                if (!occ.isPlayer) occ.power = bump(occ.power);
              }
            }
          }
          if (p.leaderboard) {
            for (const row of p.leaderboard) row.power = bump(row.power);
          }
        }
        return p;
      },
      partialize: (s) => ({
        character: s.character,
        inventory: s.inventory,
        equipment: s.equipment,
        gems: s.gems,
        combat: {
          ...s.combat,
          floatingTexts: [],
          hitFlash: 0,
          playerHitFlash: 0,
          log: s.combat.log.slice(-40),
        },
        progression: s.progression,
        resources: s.resources,
        guild: s.guild,
        mines: s.mines,
        farm: s.farm,
        talents: s.talents,
        sinBuild: s.sinBuild,
        worldHunters: s.worldHunters,
        leaderboard: s.leaderboard,
        settings: s.settings,
        meta: s.meta,
        oreAcc: s.oreAcc,
        dungeon: normalizeDungeonState(s.dungeon ?? emptyDungeonState()),
        tower: normalizeTowerState(s.tower ?? emptyTowerState()),
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameData>;
        const farm = ensureFarmState(p.farm);
        const merged = {
          ...current,
          ...p,
          character: {
            ...current.character,
            ...p.character,
            classId: p.character?.classId ?? null,
            avatarId: resolveAvatarId(p.character?.avatarId ?? current.character.avatarId),
          },
          combat: {
            ...current.combat,
            ...p.combat,
            spotId: p.combat?.spotId ?? DEFAULT_SPOT_ID,
            mode: p.combat?.mode ?? "pve",
            wardHits: p.combat?.wardHits ?? 0,
            lootlessKills: p.combat?.lootlessKills ?? 0,
            playerEffects: p.combat?.playerEffects ?? [],
            monsterEffects: p.combat?.monsterEffects ?? [],
            floatingTexts: [],
            skillCd: { ...current.combat.skillCd, ...p.combat?.skillCd },
            sin: { ...emptySinCombat(), ...p.combat?.sin },
          },
          talents: {
            points: p.talents?.points ?? Math.max(0, (p.character?.level ?? 1) - 1),
            ranks: { ...(p.talents?.ranks ?? {}) },
          },
          sinBuild: {
            path: p.sinBuild?.path ?? null,
            ranks: { ...(p.sinBuild?.ranks ?? {}) },
            arts: { ...(p.sinBuild?.arts ?? {}) },
            skillRanks: { ...(p.sinBuild?.skillRanks ?? {}) },
            artRanks: { ...(p.sinBuild?.artRanks ?? {}) },
            mastery: p.sinBuild?.mastery ?? 0,
          },
          guild: normalizeGuild(p.guild ?? current.guild),
          farm,
          settings: {
            ...current.settings,
            ...p.settings,
            autoSellEnabled: p.settings?.autoSellEnabled !== false,
            autoSell: resolvedAutoSell(p.settings?.autoSell),
          },
          resources: {
            ...current.resources,
            ...p.resources,
            blessing: p.resources?.blessing ?? 0,
          },
          gems: p.gems ?? [],
          inventory: normalizeInventory(p.inventory) ?? current.inventory,
          dungeon: normalizeDungeonState(p.dungeon ?? emptyDungeonState()),
          tower: normalizeTowerState(p.tower ?? current.tower ?? emptyTowerState()),
          worldHunters: p.worldHunters ?? current.worldHunters,
        };
        tagSaveItems(merged);
        if (merged.character.classId === "assassin") {
          migrateAssassinBuild(merged);
        }
        ensureWorld(merged);
        return merged;
      },
    },
  ),
);

export function useDerivedStats() {
  return useGameStore(
    useShallow((s) => statsOf(s)),
  );
}

export function useOreRate() {
  return useGameStore((s) => playerOrePerSec(s));
}
