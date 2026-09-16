"use client";

import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Circle,
  CircleDot,
  Crosshair,
  Crown,
  Dumbbell,
  Footprints,
  Gem,
  Hand,
  HardHat,
  Heart,
  HeartPulse,
  Hexagon,
  Shield,
  Shirt,
  Sparkles,
  Star,
  Sword,
  Target,
  Wind,
  Zap,
} from "lucide-react";
import { MAX_ENHANCE } from "@/lib/game/constants";
import type { AffixStat, EquipSlot, Item, Rarity } from "@/lib/game/types";

export function withEnhanceLevel(item: Item, level: number): Item {
  const enhanceLevel = Math.max(0, Math.min(MAX_ENHANCE, Math.round(level)));
  if (item.enhanceLevel === enhanceLevel) return item;
  return { ...item, enhanceLevel };
}

/** Base item before enhance / blessing / gems — for fair default comparison. */
export function asDefaultItem(item: Item): Item {
  return {
    ...item,
    enhanceLevel: 0,
    blessed: false,
    sockets: item.sockets?.map(() => null),
  };
}

export const SLOT_ICONS: Record<EquipSlot, LucideIcon> = {
  helmet: HardHat,
  armor: Shirt,
  gloves: Hand,
  boots: Footprints,
  weapon: Sword,
  offhand: Shield,
  ring: CircleDot,
  amulet: Gem,
};

export const RARITY_ICONS: Record<Rarity, LucideIcon> = {
  common: Circle,
  uncommon: Hexagon,
  rare: Gem,
  epic: Sparkles,
  legendary: Star,
  mythic: Crown,
};

export const STAT_ICONS: Record<AffixStat, LucideIcon> = {
  attack: Sword,
  defense: Shield,
  health: Heart,
  critChance: Crosshair,
  critDamage: Zap,
  accuracy: Target,
  strength: Dumbbell,
  agility: Wind,
  endurance: HeartPulse,
  intelligence: Brain,
};

export const INSPECTOR_STAT_ORDER: AffixStat[] = [
  "attack",
  "defense",
  "health",
  "critChance",
  "critDamage",
  "accuracy",
  "strength",
  "agility",
  "endurance",
  "intelligence",
];
