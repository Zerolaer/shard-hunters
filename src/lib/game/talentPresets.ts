import { TALENT_BY_ID, TALENTS, canAllocateTalent } from "./talents";
import type { AffixStat, SkillId, TalentTreeId } from "./types";

export interface TalentPresetDef {
  id: string;
  tree: TalentTreeId;
  name: string;
  description: string;
  nodeOrder: string[];
  hotbar: SkillId[];
  /** Preferred item-gem stats when filling empty sockets on equipped gear. */
  gemStatPriority: AffixStat[];
}

function treeOrder(tree: TalentTreeId, prefer: string[]): string[] {
  const all = TALENTS.filter((n) => n.tree === tree);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of prefer) {
    if (TALENT_BY_ID[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  const rest = [...all].sort((a, b) => a.row - b.row || a.col - b.col);
  for (const n of rest) {
    if (!seen.has(n.id)) out.push(n.id);
  }
  return out;
}

export const TALENT_PRESETS: TalentPresetDef[] = [
  {
    id: "classic-fury",
    tree: "fury",
    name: "Ярость",
    description: "Сила, казнь и кровожадность. Прямой урон в лицо.",
    nodeOrder: treeOrder("fury", [
      "fury-strike",
      "fury-blood",
      "fury-cleave",
      "fury-lust",
      "fury-bash",
      "fury-execute",
      "fury-mastery",
    ]),
    hotbar: ["power-strike", "cleave", "bloodlust", "execute"],
    gemStatPriority: ["strength", "attack", "critChance", "critDamage", "endurance"],
  },
  {
    id: "classic-shadow",
    tree: "shadow",
    name: "Тень",
    description: "Крит, скорость и яд. Быстрая ротация ассасина.",
    nodeOrder: treeOrder("shadow", [
      "shadow-flurry",
      "shadow-precision",
      "shadow-backstab",
      "shadow-venom",
      "shadow-haste",
      "shadow-veil",
      "shadow-mastery",
    ]),
    hotbar: ["flurry", "backstab", "venom"],
    gemStatPriority: ["agility", "critChance", "critDamage", "attack", "accuracy"],
  },
  {
    id: "classic-essence",
    tree: "essence",
    name: "Эссенция",
    description: "Магия, исцеление и контроль. Безопасный фарм.",
    nodeOrder: treeOrder("essence", [
      "essence-bolt",
      "essence-mend",
      "essence-flow",
      "essence-ward",
      "essence-meteor",
      "essence-shatter",
      "essence-mastery",
    ]),
    hotbar: ["arcane-bolt", "mend", "essence-ward", "meteor"],
    gemStatPriority: ["intelligence", "health", "endurance", "attack", "defense"],
  },
];

export function talentPresetPointsRequired(preset: TalentPresetDef): number {
  let n = 0;
  for (const id of preset.nodeOrder) {
    const node = TALENT_BY_ID[id];
    if (!node) continue;
    // Mastery is an open sink — quote a sensible “core path” target for UI.
    if (node.id.endsWith("-mastery")) {
      n += Math.min(20, node.maxRank);
    } else {
      n += node.maxRank;
    }
  }
  return n;
}

/**
 * Walk the preset priority list and spend every available point.
 * Mastery absorbs leftovers up to its real max rank (no artificial early cap).
 */
export function planTalentPresetRanks(
  preset: TalentPresetDef,
  availablePoints: number,
): { ranks: Record<string, number>; spent: number; trimmed: boolean; leftover: number } {
  const ranks: Record<string, number> = {};
  let points = Math.max(0, availablePoints);
  let spent = 0;
  const displayNeed = talentPresetPointsRequired(preset);

  let progressed = true;
  while (points > 0 && progressed) {
    progressed = false;
    for (const id of preset.nodeOrder) {
      const node = TALENT_BY_ID[id];
      if (!node) continue;
      while ((ranks[id] ?? 0) < node.maxRank) {
        if (!canAllocateTalent(ranks, id, points)) break;
        ranks[id] = (ranks[id] ?? 0) + 1;
        points -= 1;
        spent += 1;
        progressed = true;
      }
    }
  }

  return {
    ranks,
    spent,
    leftover: points,
    trimmed: spent < displayNeed && points === 0,
  };
}

export function remainingTalentPresetFills(
  preset: TalentPresetDef,
  currentRanks: Record<string, number>,
  availablePoints: number,
): string[] {
  const fills: string[] = [];
  let points = availablePoints;
  const ranks = { ...currentRanks };
  let progressed = true;
  while (points > 0 && progressed) {
    progressed = false;
    for (const id of preset.nodeOrder) {
      const node = TALENT_BY_ID[id];
      if (!node) continue;
      while ((ranks[id] ?? 0) < node.maxRank && points > 0) {
        if (!canAllocateTalent(ranks, id, points)) break;
        ranks[id] = (ranks[id] ?? 0) + 1;
        points -= 1;
        fills.push(id);
        progressed = true;
      }
    }
  }
  return fills;
}
