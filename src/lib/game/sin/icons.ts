import type { LucideIcon } from "lucide-react";
import {
  Axe,
  Cloud,
  Copy,
  Crosshair,
  Droplets,
  EyeOff,
  FlaskConical,
  Footprints,
  Gem,
  Ghost,
  Heart,
  Hourglass,
  Layers,
  Link2,
  Moon,
  Repeat,
  Scissors,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sword,
  Target,
  Timer,
  Wind,
  Zap,
} from "lucide-react";
import type { SinArtId, SinPathId, SinSkillId } from "../types";
import type { SinNodeDef } from "./tree";

export type SinGemKind = "skill" | "art" | "passive" | "keystone" | "path";

export function sinNodeKind(node: Pick<SinNodeDef, "skillId" | "artId" | "keystone">): SinGemKind {
  if (node.keystone) return "keystone";
  if (node.artId && !node.skillId) return "art";
  if (node.skillId) return "skill";
  return "passive";
}

export const SIN_PATH_ICONS: Record<SinPathId, LucideIcon> = {
  blade: Sword,
  venom: FlaskConical,
  phantom: Ghost,
};

export const SIN_SKILL_ICONS: Record<SinSkillId, LucideIcon> = {
  "sin-flurry": Wind,
  "sin-backstab": Axe,
  "sin-venom": Droplets,
  "sin-garrote": Scissors,
  "sin-mark": Target,
  "sin-vanish": EyeOff,
  "sin-ambush": Moon,
  "sin-eviscerate": Axe,
  "sin-fan": Layers,
  "sin-shadowstep": Footprints,
  "sin-rupture": FlaskConical,
  "sin-veil": Shield,
  "sin-clone": Copy,
  "sin-execute": Skull,
  "sin-nightblade": Sparkles,
};

export const SIN_ART_ICONS: Record<SinArtId, LucideIcon> = {
  "art-haste": Zap,
  "art-crit": Sparkles,
  "art-multistrike": Layers,
  "art-poison": Droplets,
  "art-duration": Hourglass,
  "art-execute": Skull,
  "art-economy": Timer,
  "art-fortify": Shield,
  "art-bloodlust": Heart,
  "art-mark": Crosshair,
  "art-combo": Link2,
  "art-echo": Repeat,
};

const PASSIVE_ICONS: Record<string, LucideIcon> = {
  "blade-edge": Sparkles,
  "blade-precision": Crosshair,
  "venom-potency": FlaskConical,
  "venom-sap": Droplets,
  "phantom-mist": Cloud,
};

export function iconForSkill(id: SinSkillId): LucideIcon {
  return SIN_SKILL_ICONS[id] ?? Sparkles;
}

export function iconForArt(id: SinArtId): LucideIcon {
  return SIN_ART_ICONS[id] ?? Gem;
}

export function iconForPath(id: SinPathId): LucideIcon {
  return SIN_PATH_ICONS[id] ?? Ghost;
}

export function iconForNode(node: SinNodeDef): LucideIcon {
  if (node.skillId) return iconForSkill(node.skillId);
  if (node.artId) return iconForArt(node.artId);
  if (node.keystone) return Star;
  return PASSIVE_ICONS[node.id] ?? Gem;
}

export const SIN_KIND_LABEL: Record<SinGemKind, string> = {
  skill: "Навык",
  art: "Сокет",
  passive: "Пассив",
  keystone: "Капстоун",
  path: "Путь",
};
