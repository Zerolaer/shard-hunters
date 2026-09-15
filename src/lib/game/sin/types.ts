import type { SinArtId, SinPathId, SinSkillId } from "../types";

export type SinSkillTag =
  | "attack"
  | "melee"
  | "combo"
  | "poison"
  | "bleed"
  | "mark"
  | "stealth"
  | "shade"
  | "burst"
  | "duration"
  | "aoe"
  | "crit"
  | "execute"
  | "buff"
  | "defensive"
  | "opener"
  | "spender";

export type SinSkillRole =
  | "generator"
  | "spender"
  | "opener"
  | "apply"
  | "maintain"
  | "setup"
  | "finisher"
  | "defensive";

export interface SinSkillDef {
  id: SinSkillId;
  name: string;
  description: string;
  cooldown: number;
  role: SinSkillRole;
  tags: SinSkillTag[];
  kind: "physical" | "agility" | "magic" | "heal" | "buff";
  multiplier: number;
  comboGain: number;
  /** 0 = none, -1 = spend all combo */
  comboCost: number;
  poisonGain: number;
  poisonConsume: boolean;
  shadeGain: number;
  shadeCost: number;
  critBonus: number;
  extraHits: number;
  hitScale: number;
  stealthGrant: number;
  markGrant: number;
  nightbladeGrant: number;
  veilHits: number;
  cloneGrant: number;
  bleedGrant: number;
  requiresStealth: boolean;
  executeThreshold: number;
}

export interface SinTransfig {
  name: string;
  description: string;
  tags?: SinSkillTag[];
  cooldown?: number;
  multiplier?: number;
  comboGain?: number;
  comboCost?: number;
  poisonGain?: number;
  poisonConsume?: boolean;
  shadeGain?: number;
  shadeCost?: number;
  critBonus?: number;
  extraHits?: number;
  hitScale?: number;
  stealthGrant?: number;
  markGrant?: number;
  nightbladeGrant?: number;
  veilHits?: number;
  cloneGrant?: number;
  bleedGrant?: number;
  requiresStealth?: boolean;
  executeThreshold?: number;
}

export interface SinArtDef {
  id: SinArtId;
  name: string;
  description: string;
  supports: SinSkillTag[];
}

export interface SinPathDef {
  id: SinPathId;
  name: string;
  epithet: string;
  accent: string;
  blurb: string;
  fantasy: string;
  resource: string;
  rotation: string[];
  starterNode: string;
}

export interface ResolvedSinSkill extends SinSkillDef {
  artId: SinArtId | null;
  artName: string | null;
  pathName: string;
  synergyMult: number;
  synergyNames: string[];
  durationMod: number;
  economy: number;
  echoChance: number;
  fortifyHits: number;
  dmgVsPoisoned: number;
  dmgVsMarked: number;
  executeArtBonus: number;
  skillRank: number;
  artRank: number;
}

export interface SinSynergy {
  id: string;
  name: string;
  description: string;
  kind: "pair" | "set";
}

export const SIN_TAG_LABEL: Record<SinSkillTag, string> = {
  attack: "Атака",
  melee: "Ближний бой",
  combo: "Комбо",
  poison: "Яд",
  bleed: "Кровотечение",
  mark: "Метка",
  stealth: "Скрытность",
  shade: "Тень",
  burst: "Взрыв",
  duration: "Длительность",
  aoe: "Веер",
  crit: "Крит",
  execute: "Казнь",
  buff: "Бафф",
  defensive: "Защита",
  opener: "Открытие",
  spender: "Спендер",
};

export const SIN_ROLE_LABEL: Record<SinSkillRole, string> = {
  generator: "Генератор",
  spender: "Спендер",
  opener: "Открытие",
  apply: "Накладывает",
  maintain: "Поддержка",
  setup: "Сетап",
  finisher: "Финишер",
  defensive: "Защита",
};
