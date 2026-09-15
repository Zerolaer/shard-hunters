import { CLASS_DEFS, HUNTER_CLASSES } from "./classes";
import { canWearItem } from "./equipment";
import { generateItem } from "./generators";
import { statsOf } from "./formulas";
import { emptySinBuild, emptySinCombat } from "./sin/state";
import { syncUnlockedSinRanks } from "./sin/ranks";
import { TALENT_BY_ID } from "./talents";
import type { GameData, HunterClass, Item, SkillId } from "./types";

export function inferClassLock(item: Item): HunterClass | undefined {
  if (item.classLock) return item.classLock;
  if (item.slot !== "weapon" && item.slot !== "offhand") return undefined;
  const name = item.name.toLowerCase();
  const hits: { id: HunterClass; len: number }[] = [];
  for (const id of HUNTER_CLASSES) {
    const bases = item.slot === "weapon" ? CLASS_DEFS[id].weaponBases : CLASS_DEFS[id].offhandBases;
    for (const base of bases) {
      if (name.includes(base.toLowerCase())) hits.push({ id, len: base.length });
    }
  }
  hits.sort((a, b) => b.len - a.len);
  return hits[0]?.id;
}

export function tagItemClassLock(item: Item) {
  if (item.slot !== "weapon" && item.slot !== "offhand") {
    item.classLock = undefined;
    return item;
  }
  item.classLock = inferClassLock(item);
  return item;
}

export function tagSaveItems(state: GameData) {
  for (const item of state.inventory) {
    if (item) tagItemClassLock(item);
  }
  for (const item of Object.values(state.equipment)) {
    if (item) tagItemClassLock(item);
  }
}

export function unequipMismatchedGear(state: GameData) {
  for (const slot of ["weapon", "offhand"] as const) {
    const item = state.equipment[slot];
    if (!item) continue;
    const wear = canWearItem(state.character.classId, item);
    if (wear.ok) continue;
    const empty = state.inventory.findIndex((x) => x === null);
    if (empty === -1) continue;
    state.inventory[empty] = item;
    state.equipment[slot] = null;
  }
}

function looksFresh(state: GameData) {
  const c = state.character;
  return (
    c.level === 1 &&
    c.strength === 5 &&
    c.agility === 5 &&
    c.endurance === 5 &&
    c.intelligence === 5 &&
    !c.classId
  );
}

export function migrateAssassinBuild(state: GameData) {
  if (state.character.classId !== "assassin") return;
  if (!state.sinBuild) state.sinBuild = emptySinBuild();
  if (!state.combat.sin) state.combat.sin = emptySinCombat();
  if ((state.sinBuild.ranks["sin-starter"] ?? 0) < 1) state.sinBuild.ranks["sin-starter"] = 1;
  syncUnlockedSinRanks(state.sinBuild);

  let refunded = 0;
  for (const [id, rank] of Object.entries(state.talents.ranks)) {
    if (!TALENT_BY_ID[id] || rank <= 0) continue;
    refunded += rank;
    delete state.talents.ranks[id];
  }
  if (refunded > 0) state.talents.points += refunded;

  const remap: Record<string, SkillId> = {
    flurry: "sin-flurry",
    backstab: "sin-backstab",
    venom: "sin-venom",
    execute: "sin-execute",
  };
  state.combat.hotbar = state.combat.hotbar.map((id) => {
    if (!id) return null;
    if (id.startsWith("sin-")) return id;
    return remap[id] ?? null;
  });
  if (!state.combat.hotbar.includes("sin-flurry")) {
    const empty = state.combat.hotbar.findIndex((x) => x === null);
    if (empty >= 0) state.combat.hotbar[empty] = "sin-flurry";
    else state.combat.hotbar[0] = "sin-flurry";
  }
}

export function applyClassChoice(state: GameData, classId: HunterClass) {
  if (state.character.classId) return;
  const def = CLASS_DEFS[classId];
  const fresh = looksFresh(state);
  state.character.classId = classId;
  tagSaveItems(state);

  if (fresh) {
    state.character.strength = def.baseStats.strength;
    state.character.agility = def.baseStats.agility;
    state.character.endurance = def.baseStats.endurance;
    state.character.intelligence = def.baseStats.intelligence;
    if (!state.equipment.weapon) {
      state.equipment.weapon = generateItem({
        itemLevel: 1,
        rarity: "uncommon",
        slot: "weapon",
        classLock: classId,
      });
    }
    if (!state.equipment.offhand) {
      state.equipment.offhand = generateItem({
        itemLevel: 1,
        rarity: "common",
        slot: "offhand",
        classLock: classId,
      });
    }
    if (Object.keys(state.talents.ranks).length === 0) {
      if (classId === "assassin") {
        state.talents.ranks = {};
        state.sinBuild = {
          path: null,
          ranks: { "sin-starter": 1 },
          arts: {},
          skillRanks: { "sin-flurry": 1 },
          artRanks: {},
          mastery: 0,
        };
        state.combat.hotbar = ["sin-flurry", null, null, null];
        state.combat.sin = emptySinCombat();
      } else {
        state.talents.ranks = { [def.starterTalent]: 1 };
        state.combat.hotbar = [def.starterSkill, null, null, null];
      }
    }
  }

  if (classId === "assassin") {
    migrateAssassinBuild(state);
  }

  unequipMismatchedGear(state);
  if (!state.equipment.weapon) {
    state.equipment.weapon = generateItem({
      itemLevel: Math.max(1, state.character.level),
      rarity: "uncommon",
      slot: "weapon",
      classLock: classId,
    });
  }
  if (fresh && !state.equipment.offhand) {
    state.equipment.offhand = generateItem({
      itemLevel: 1,
      rarity: "common",
      slot: "offhand",
      classLock: classId,
    });
  }
  const derived = statsOf(state);
  state.character.hp = Math.min(derived.maxHp, Math.max(1, state.character.hp));
  if (fresh) state.character.hp = derived.maxHp;
}
