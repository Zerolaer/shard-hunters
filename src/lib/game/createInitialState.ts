import { mineOccupantBm } from "./balance";
import {
  defaultAutoSell,
  emptyEquipment,
  INVENTORY_SIZE,
  LOCATIONS,
  MINES,
  NPC_GUILDS,
  NPC_HUNTERS,
  SKILLS,
} from "./constants";
import { statsOf, irand, pick, uid } from "./formulas";
import { generateItem, generateMonster, emptyLocationProgress } from "./generators";
import { createFarmState, DEFAULT_SPOT_ID, FARM_SPOT_BY_ID, occupySpot } from "./spots";
import { emptyGuildState } from "./guild";
import { emptySinBuild, emptySinCombat } from "./sin/state";
import { DEFAULT_AVATAR_ID } from "./avatars";
import "./dungeons";
import { createWorldHunters, HUNTER_ROSTER_GEN } from "./hunters";
import type { GameData, SkillId } from "./types";

export function createInitialState(opts?: { name?: string }): GameData {
  const hunterName = opts?.name?.trim().slice(0, 18) || "Каэл";
  const armor = generateItem({ itemLevel: 1, rarity: "common", slot: "armor" });
  const extra = generateItem({ itemLevel: 1, rarity: "common", slot: "ring" });

  const inventory: GameData["inventory"] = Array.from({ length: INVENTORY_SIZE }, () => null);
  inventory[0] = extra;

  const equipment = emptyEquipment();
  equipment.armor = armor;

  const skillCd = Object.fromEntries(SKILLS.map((s) => [s.id, 0])) as GameData["combat"]["skillCd"];

  const locations = Object.fromEntries(LOCATIONS.map((l) => [l.id, emptyLocationProgress()]));

  const mines: GameData["mines"] = {};
  for (const mine of MINES) {
    const occupants = [];
    const filled = Math.max(1, mine.slots - 1);
    for (let i = 0; i < filled; i++) {
      occupants.push({
        id: uid(),
        name: pick(NPC_HUNTERS),
        guild: pick(NPC_GUILDS),
        power: mineOccupantBm(mine.bmLevel ?? mine.minLevel, i, mine.slots) + irand(-12, 18),
        isPlayer: false,
      });
    }
    mines[mine.id] = { occupants };
  }

  const worldHunters = createWorldHunters();
  const leaderboard = worldHunters
    .slice()
    .sort((a, b) => b.power - a.power)
    .slice(0, 12)
    .map((h) => ({ id: h.id, name: h.name, guild: h.guild, power: h.power }));

  const farm = createFarmState();
  const startSpot = FARM_SPOT_BY_ID[DEFAULT_SPOT_ID];

  const state: GameData = {
    character: {
      name: hunterName,
      avatarId: DEFAULT_AVATAR_ID,
      classId: null,
      level: 1,
      xp: 0,
      unspentPoints: 0,
      strength: 5,
      agility: 5,
      endurance: 5,
      intelligence: 5,
      hp: 200,
    },
    inventory,
    equipment,
    gems: [],
    combat: {
      locationId: "woods",
      spotId: DEFAULT_SPOT_ID,
      mode: "pve",
      monster: generateMonster({
        locationId: "woods",
        floor: 1,
        isBoss: false,
        danger: startSpot?.danger ?? 1,
      }),
      playerAtkAcc: 0,
      monsterAtkAcc: 0,
      skillCd,
      hotbar: [null, null, null, null],
      log: [
        {
          id: uid(),
          kind: "system",
          text: "Выберите класс, затем соберите билд. Споты фарма — на карте мира.",
        },
      ],
      floatingTexts: [],
      bloodlustHits: 0,
      wardHits: 0,
      gcd: 0,
      hitFlash: 0,
      playerHitFlash: 0,
      sin: emptySinCombat(),
      lootlessKills: 0,
      playerEffects: [],
      monsterEffects: [],
    },
    progression: {
      unlockedLocationIds: ["woods"],
      locations,
    },
    resources: { gold: 80, shards: 6, ore: 12, blessing: 0 },
    guild: emptyGuildState(),
    mines,
    farm,
    talents: {
      points: 0,
      ranks: {},
    },
    sinBuild: emptySinBuild(),
    worldHunters,
    leaderboard,
    settings: {
      autoBattle: false,
      autoSellEnabled: true,
      autoSell: defaultAutoSell(),
    },
    meta: { lastTick: Date.now(), pendingOffline: null, hunterAcc: 0, hunterRoster: HUNTER_ROSTER_GEN },
    oreAcc: 0,
    dungeon: { active: null, dailyUsed: {}, paused: {} },
  };

  const derived = statsOf(state);
  state.character.hp = derived.maxHp;
  occupySpot(state.farm, DEFAULT_SPOT_ID, {
    id: "player",
    name: hunterName,
    guild: state.guild.name || "—",
    power: derived.powerScore,
    isPlayer: true,
  });
  return state;
}

export function allSkillIds(): SkillId[] {
  return SKILLS.map((s) => s.id);
}
