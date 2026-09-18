import type { CombatEffect, GameData } from "./types";

type Draft = GameData;

function pushIf(list: CombatEffect[], effect: CombatEffect | null) {
  if (effect) list.push(effect);
}

function hits(
  id: string,
  name: string,
  kind: CombatEffect["kind"],
  icon: string,
  n: number,
  description?: string,
): CombatEffect | null {
  if (n <= 0) return null;
  return { id, name, kind, icon, remainingHits: n, description };
}

function timed(
  id: string,
  name: string,
  kind: CombatEffect["kind"],
  icon: string,
  sec: number,
  description?: string,
): CombatEffect | null {
  if (sec <= 0) return null;
  return { id, name, kind, icon, remainingSec: sec, description };
}

function stacks(
  id: string,
  name: string,
  kind: CombatEffect["kind"],
  icon: string,
  n: number,
  description?: string,
): CombatEffect | null {
  if (n <= 0) return null;
  return { id, name, kind, icon, remainingStacks: n, description };
}

/** Rebuild player/monster effect lists from implicit combat fields. Call after tick mutations. */
export function syncCombatEffects(state: Draft) {
  const player: CombatEffect[] = [];
  const monster: CombatEffect[] = [];

  pushIf(player, hits("bloodlust", "Жажда крови", "buff", "bloodlust", state.combat.bloodlustHits, "Усиленный урон на следующие удары."));
  pushIf(player, hits("essence-ward", "Щит эссенции", "buff", "ward", state.combat.wardHits, "Поглощает часть входящего урона."));

  const sin = state.combat.sin;
  if (sin && state.character.classId === "assassin") {
    pushIf(player, timed("stealth", "Скрытность", "buff", "stealth", sin.stealth, "Скрытность повышает крит и урон из тени."));
    pushIf(player, timed("nightblade", "Ночной клинок", "buff", "nightblade", sin.nightblade, "Клинок ночи усиливает умения."));
    pushIf(player, timed("clone", "Теневой двойник", "buff", "clone", sin.clone, "Эхо повторяет часть атак."));
    pushIf(player, hits("veil", "Завеса", "buff", "veil", sin.veilHits, "Завеса смягчает входящий урон."));
    pushIf(player, hits("empower", "Усиление", "buff", "empower", sin.empowerHits, "Временный буст атаки."));
    pushIf(player, hits("clone-absorb", "Эхо-щит", "buff", "clone", sin.cloneAbsorb, "Щит от эха двойника."));
    if (sin.backstabAmp > 0) {
      player.push({
        id: "backstab-amp",
        name: "Засада",
        kind: "buff",
        icon: "backstab",
        remainingHits: 1,
        description: "Следующий удар из засады усилен.",
      });
    }
    if (sin.ruptureAmp > 0) {
      player.push({
        id: "rupture-amp",
        name: "Разрыв",
        kind: "buff",
        icon: "rupture",
        remainingHits: 1,
        description: "Следующий разрыв наносит больше урона.",
      });
    }

    if (state.combat.monster) {
      pushIf(monster, stacks("poison", "Яд", "debuff", "poison", sin.poison, "Периодический урон ядом."));
      pushIf(monster, timed("bleed", "Кровотечение", "debuff", "bleed", sin.bleed, "Кровопотеря со временем."));
      pushIf(monster, timed("mark", "Метка", "debuff", "mark", sin.marked, "Цель помечена — больше урона."));
      pushIf(monster, timed("slow", "Замедление", "debuff", "slow", sin.slow, "Замедляет атаки цели."));
    }
  }

  state.combat.playerEffects = player;
  state.combat.monsterEffects = monster;
}
