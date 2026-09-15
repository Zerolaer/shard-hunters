import { HUNTER_CLASS_IDS, type HunterClass, type SkillId } from "./types";

export const HUNTER_CLASSES = HUNTER_CLASS_IDS;

export interface ClassDef {
  id: HunterClass;
  name: string;
  weaponLabel: string;
  offhandLabel: string;
  blurb: string;
  accent: string;
  starterTalent: string;
  starterSkill: SkillId;
  weaponBases: string[];
  offhandBases: string[];
  baseStats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
  };
  passive: {
    health: number;
    defense: number;
    attack: number;
    critChance: number;
    critDamage: number;
    skillDamage: number;
    intelligence: number;
    agility: number;
    accuracy: number;
    /**
     * Fraction of damage dealt returned as health. The three classic classes
     * pick this up from a shared talent node; the Assassin's tree hides it in
     * deep path-specific nodes, which left it as the only class in the game
     * with no sustain at all — it could clear trash but never finish a boss.
     */
    lifesteal: number;
  };
}

export const CLASS_DEFS: Record<HunterClass, ClassDef> = {
  warrior: {
    id: "warrior",
    name: "Воин",
    weaponLabel: "Меч / топор / копьё",
    offhandLabel: "Щит",
    blurb: "Живучий фронт: больше HP и брони.",
    accent: "#f97316",
    starterTalent: "fury-strike",
    starterSkill: "power-strike",
    weaponBases: ["Клинок", "Топор", "Копьё"],
    offhandBases: ["Щит", "Баклер"],
    baseStats: { strength: 8, agility: 4, endurance: 8, intelligence: 3 },
    passive: {
      health: 45,
      defense: 14,
      attack: 0,
      critChance: 0,
      critDamage: 0,
      skillDamage: 0,
      intelligence: 0,
      agility: 0,
      accuracy: 0,
      lifesteal: 0,
    },
  },
  archer: {
    id: "archer",
    name: "Лук",
    weaponLabel: "Лук",
    offhandLabel: "Колчан",
    blurb: "Дальняя охота: скорость атаки и крит.",
    accent: "#34d399",
    starterTalent: "shadow-flurry",
    starterSkill: "flurry",
    weaponBases: ["Лук", "Длинный лук", "Короткий лук"],
    offhandBases: ["Колчан", "Налучье"],
    baseStats: { strength: 4, agility: 9, endurance: 5, intelligence: 5 },
    passive: {
      health: 0,
      defense: 0,
      attack: 2,
      critChance: 4.5,
      critDamage: 6,
      skillDamage: 0,
      intelligence: 0,
      agility: 3,
      accuracy: 8,
      lifesteal: 0,
    },
  },
  assassin: {
    id: "assassin",
    name: "Син",
    weaponLabel: "Кинжалы",
    offhandLabel: "Парный клинок",
    blurb: "Тень: три пути искусств, комбо, яд и эхо. Парные клинки.",
    accent: "#fb7185",
    starterTalent: "sin-starter",
    starterSkill: "sin-flurry",
    weaponBases: ["Кинжал", "Стилет", "Клинок тени"],
    offhandBases: ["Кинжал тени", "Парирующий клинок"],
    baseStats: { strength: 5, agility: 9, endurance: 4, intelligence: 5 },
    passive: {
      health: 0,
      defense: 0,
      attack: 6,
      critChance: 6,
      critDamage: 16,
      skillDamage: 0,
      intelligence: 0,
      agility: 2,
      accuracy: 3,
      lifesteal: 0.06,
    },
  },
  mage: {
    id: "mage",
    name: "Маг",
    weaponLabel: "Посох",
    offhandLabel: "Сфера / фолиант",
    blurb: "Эссенция: интеллект и сила навыков.",
    accent: "#a78bfa",
    starterTalent: "essence-bolt",
    starterSkill: "arcane-bolt",
    weaponBases: ["Посох", "Жезл", "Эфирный стержень"],
    offhandBases: ["Сфера", "Фолиант"],
    baseStats: { strength: 3, agility: 5, endurance: 5, intelligence: 10 },
    passive: {
      health: 0,
      defense: 4,
      attack: 0,
      critChance: 0,
      critDamage: 0,
      skillDamage: 0.1,
      intelligence: 4,
      agility: 0,
      accuracy: 0,
      lifesteal: 0,
    },
  },
};

export const CLASS_LIST = HUNTER_CLASSES.map((id) => CLASS_DEFS[id]);

export function classLabel(id: HunterClass | null | undefined) {
  if (!id) return "Без класса";
  return CLASS_DEFS[id]?.name ?? "Без класса";
}
