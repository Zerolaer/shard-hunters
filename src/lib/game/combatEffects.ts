import type { CombatEffect, GameData } from "./types";

type Draft = GameData;

function pushIf(list: CombatEffect[], effect: CombatEffect | null) {
  if (effect) list.push(effect);
}

function hits(id: string, name: string, kind: CombatEffect["kind"], icon: string, n: number): CombatEffect | null {
  if (n <= 0) return null;
  return { id, name, kind, icon, remainingHits: n };
}

function timed(id: string, name: string, kind: CombatEffect["kind"], icon: string, sec: number): CombatEffect | null {
  if (sec <= 0) return null;
  return { id, name, kind, icon, remainingSec: sec };
}

function stacks(id: string, name: string, kind: CombatEffect["kind"], icon: string, n: number): CombatEffect | null {
  if (n <= 0) return null;
  return { id, name, kind, icon, remainingStacks: n };
}

/** Rebuild player/monster effect lists from implicit combat fields. Call after tick mutations. */
export function syncCombatEffects(state: Draft) {
  const player: CombatEffect[] = [];
  const monster: CombatEffect[] = [];

  pushIf(player, hits("bloodlust", "Жажда крови", "buff", "bloodlust", state.combat.bloodlustHits));
  pushIf(player, hits("essence-ward", "Щит эссенции", "buff", "ward", state.combat.wardHits));

  const sin = state.combat.sin;
  if (sin && state.character.classId === "assassin") {
    pushIf(player, timed("stealth", "Скрытность", "buff", "stealth", sin.stealth));
    pushIf(player, timed("nightblade", "Ночной клинок", "buff", "nightblade", sin.nightblade));
    pushIf(player, timed("clone", "Теневой двойник", "buff", "clone", sin.clone));
    pushIf(player, hits("veil", "Завеса", "buff", "veil", sin.veilHits));
    pushIf(player, hits("empower", "Усиление", "buff", "empower", sin.empowerHits));
    pushIf(player, hits("clone-absorb", "Эхо-щит", "buff", "clone", sin.cloneAbsorb));
    if (sin.backstabAmp > 0) {
      player.push({
        id: "backstab-amp",
        name: "Засада",
        kind: "buff",
        icon: "backstab",
        remainingHits: 1,
      });
    }
    if (sin.ruptureAmp > 0) {
      player.push({
        id: "rupture-amp",
        name: "Разрыв",
        kind: "buff",
        icon: "rupture",
        remainingHits: 1,
      });
    }

    if (state.combat.monster) {
      pushIf(monster, stacks("poison", "Яд", "debuff", "poison", sin.poison));
      pushIf(monster, timed("bleed", "Кровотечение", "debuff", "bleed", sin.bleed));
      pushIf(monster, timed("mark", "Метка", "debuff", "mark", sin.marked));
      pushIf(monster, timed("slow", "Замедление", "debuff", "slow", sin.slow));
    }
  }

  state.combat.playerEffects = player;
  state.combat.monsterEffects = monster;
}
