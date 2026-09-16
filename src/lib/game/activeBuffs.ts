import { GUILD_BUFF_BY_ID } from "./guild";
import type { CombatEffect, GuildBuffState } from "./types";

export type ActiveBuffSource = "combat" | "guild";

/** Unified player aura for the persistent HUD. Combat lists hits/seconds; guild uses wall-clock expiry. */
export interface ActivePlayerBuff {
  key: string;
  name: string;
  icon: string;
  source: ActiveBuffSource;
  remainingSec?: number;
  remainingHits?: number;
  remainingStacks?: number;
}

export function activeGuildBuffs(
  buffs: GuildBuffState[] | null | undefined,
  now = Date.now(),
): GuildBuffState[] {
  return (buffs ?? []).filter((b) => typeof b?.expiresAt === "number" && b.expiresAt > now);
}

export function listActivePlayerBuffs(
  state: {
    playerEffects?: CombatEffect[] | null;
    guildBuffs?: GuildBuffState[] | null;
  },
  now = Date.now(),
): ActivePlayerBuff[] {
  const out: ActivePlayerBuff[] = [];

  for (const effect of state.playerEffects ?? []) {
    if (effect.kind !== "buff") continue;
    if (!isCombatEffectLive(effect)) continue;
    out.push({
      key: `combat:${effect.id}`,
      name: effect.name,
      icon: effect.icon,
      source: "combat",
      remainingSec: effect.remainingSec,
      remainingHits: effect.remainingHits,
      remainingStacks: effect.remainingStacks,
    });
  }

  for (const buff of activeGuildBuffs(state.guildBuffs, now)) {
    const def = GUILD_BUFF_BY_ID[buff.id];
    out.push({
      key: `guild:${buff.id}`,
      name: def?.name ?? buff.id,
      icon: `guild-${buff.id}`,
      source: "guild",
      remainingSec: (buff.expiresAt - now) / 1000,
    });
  }

  return out;
}

function isCombatEffectLive(effect: CombatEffect) {
  if (effect.remainingHits != null) return effect.remainingHits > 0;
  if (effect.remainingStacks != null) return effect.remainingStacks > 0;
  if (effect.remainingSec != null) return effect.remainingSec > 0;
  return true;
}

/** Compact badge for a 32px square: hits, stacks, mm:ss, or short seconds. */
export function formatBuffBadge(buff: ActivePlayerBuff): string {
  if (buff.remainingHits != null) return String(Math.round(buff.remainingHits));
  if (buff.remainingStacks != null) {
    const n = Math.round(buff.remainingStacks);
    return n === 1 ? "×1" : `×${n}`;
  }
  if (buff.remainingSec != null) return formatBuffCountdown(buff.remainingSec, true);
  return "";
}

export function formatBuffCountdown(sec: number, compact = false): string {
  const raw = Math.max(0, sec);
  if (raw >= 60) {
    const total = Math.ceil(raw);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (compact) {
    if (raw >= 10) return `${Math.ceil(raw)}`;
    if (raw > 0) return raw.toFixed(1);
    return "0";
  }
  if (raw >= 10) return `${Math.ceil(raw)}с`;
  if (raw > 0) return `${raw.toFixed(1)}с`;
  return "0с";
}

export function formatBuffTitle(buff: ActivePlayerBuff): string {
  const detail = formatBuffTitleDetail(buff);
  return detail ? `${buff.name} · ${detail}` : buff.name;
}

function formatBuffTitleDetail(buff: ActivePlayerBuff): string {
  if (buff.remainingHits != null) return hitsWord(buff.remainingHits);
  if (buff.remainingStacks != null) {
    const n = Math.round(buff.remainingStacks);
    return n === 1 ? "×1" : `×${n}`;
  }
  if (buff.remainingSec != null) return formatBuffCountdown(buff.remainingSec);
  return "";
}

function hitsWord(n: number) {
  const abs = Math.abs(Math.round(n));
  const m10 = abs % 10;
  const m100 = abs % 100;
  if (m10 === 1 && m100 !== 11) return `${abs} удар`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${abs} удара`;
  return `${abs} ударов`;
}
