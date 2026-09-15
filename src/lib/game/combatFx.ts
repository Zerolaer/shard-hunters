import { COMBAT_LOG_CAP, FLOATING_CAP } from "./constants";
import { rand, uid } from "./formulas";
import type { CombatLogEntry, FloatingText, GameData, LogKind } from "./types";

type Draft = GameData;

export function pushLog(state: Draft, kind: LogKind, text: string) {
  state.combat.log.push({ id: uid(), kind, text });
  if (state.combat.log.length > COMBAT_LOG_CAP) {
    state.combat.log.splice(0, state.combat.log.length - COMBAT_LOG_CAP);
  }
}

export function pushFloater(
  state: Draft,
  opts: Omit<FloatingText, "id" | "spawnedAt" | "offset"> & { spawnedAt?: number },
) {
  state.combat.floatingTexts.push({
    id: uid(),
    spawnedAt: opts.spawnedAt ?? Date.now(),
    offset: rand(-36, 36),
    value: opts.value,
    isCrit: opts.isCrit,
    isHeal: opts.isHeal,
    isPlayerTarget: opts.isPlayerTarget,
    isMiss: opts.isMiss,
  });
  if (state.combat.floatingTexts.length > FLOATING_CAP) {
    state.combat.floatingTexts.splice(0, state.combat.floatingTexts.length - FLOATING_CAP);
  }
}

export function healPlayer(state: Draft, amount: number, derivedMax: number) {
  const before = state.character.hp;
  state.character.hp = Math.min(derivedMax, state.character.hp + amount);
  const healed = Math.round(state.character.hp - before);
  if (healed <= 0) return 0;
  pushFloater(state, { value: healed, isCrit: false, isHeal: true, isPlayerTarget: true });
  return healed;
}

export function registerMiss(state: Draft, label: string) {
  pushFloater(state, {
    value: 0,
    isCrit: false,
    isHeal: false,
    isPlayerTarget: false,
    isMiss: true,
  });
  pushLog(state, "miss", label);
}
