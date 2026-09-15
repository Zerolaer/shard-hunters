import type { SkillId, TalentTreeId } from "./types";

export interface TalentNodeDef {
  id: string;
  tree: TalentTreeId;
  name: string;
  description: string;
  row: number;
  col: number;
  maxRank: number;
  requires: string[];
  requiresAny?: string[];
  skillId?: SkillId;
  perRank: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    endurance?: number;
    attack?: number;
    defense?: number;
    health?: number;
    critChance?: number;
    critDamage?: number;
    skillHaste?: number;
    skillDamage?: number;
    lifesteal?: number;
    dropBonus?: number;
    xpBonus?: number;
    accuracy?: number;
  };
}

export const TALENT_TREES: { id: TalentTreeId; name: string; blurb: string; accent: string }[] = [
  { id: "fury", name: "Ярость", blurb: "Сила, казнь, кровожадность.", accent: "#f97316" },
  { id: "shadow", name: "Тень", blurb: "Крит, скорость, яд.", accent: "#34d399" },
  { id: "essence", name: "Эссенция", blurb: "Магия, исцеление, контроль.", accent: "#a78bfa" },
];

/** Comfortably above the 99 points a level-100 hunter can ever earn. */
export const TALENT_MASTERY_MAX_RANK = 120;

export const TALENTS: TalentNodeDef[] = [
  {
    id: "fury-strike",
    tree: "fury",
    name: "Мощный удар",
    description: "Открывает навык. Корень дерева Ярости.",
    row: 0,
    col: 1,
    maxRank: 1,
    requires: [],
    skillId: "power-strike",
    perRank: { attack: 2 },
  },
  {
    id: "fury-blood",
    tree: "fury",
    name: "Кровожадность",
    description: "+сила, +атака и вампиризм за ранг.",
    row: 1,
    col: 0,
    maxRank: 3,
    requires: ["fury-strike"],
    perRank: { strength: 3, attack: 4, lifesteal: 0.02 },
  },
  {
    id: "fury-cleave",
    tree: "fury",
    name: "Рассечение",
    description: "Широкий удар. Открывает навык.",
    row: 1,
    col: 2,
    maxRank: 1,
    requires: ["fury-strike"],
    skillId: "cleave",
    perRank: { strength: 2 },
  },
  {
    id: "fury-lust",
    tree: "fury",
    name: "Жажда крови",
    description: "Бафф: следующие автоатаки сильнее.",
    row: 2,
    col: 0,
    maxRank: 1,
    requires: ["fury-blood"],
    skillId: "bloodlust",
    perRank: { attack: 6 },
  },
  {
    id: "fury-bash",
    tree: "fury",
    name: "Удар щитом",
    description: "Оглушающий удар вторичкой.",
    row: 2,
    col: 2,
    maxRank: 1,
    requires: ["fury-cleave"],
    skillId: "shield-bash",
    perRank: { defense: 8 },
  },
  {
    id: "fury-execute",
    tree: "fury",
    name: "Казнь",
    description: "Финишер: ×2.2 урона, если у цели <35% HP.",
    row: 3,
    col: 1,
    maxRank: 1,
    requires: [],
    requiresAny: ["fury-lust", "fury-bash"],
    skillId: "execute",
    perRank: { skillDamage: 0.08 },
  },

  {
    id: "shadow-flurry",
    tree: "shadow",
    name: "Шквал",
    description: "Серия быстрых ударов. Корень Тени.",
    row: 0,
    col: 1,
    maxRank: 1,
    requires: [],
    skillId: "flurry",
    perRank: { agility: 2 },
  },
  {
    id: "shadow-precision",
    tree: "shadow",
    name: "Точность",
    description: "Крит и точность (аккураси) за ранг.",
    row: 1,
    col: 0,
    maxRank: 3,
    requires: ["shadow-flurry"],
    perRank: { critChance: 2.2, critDamage: 6, accuracy: 1.2 },
  },
  {
    id: "shadow-backstab",
    tree: "shadow",
    name: "Удар в спину",
    description: "Навык с повышенным критом.",
    row: 1,
    col: 2,
    maxRank: 1,
    requires: ["shadow-flurry"],
    skillId: "backstab",
    perRank: { agility: 3 },
  },
  {
    id: "shadow-venom",
    tree: "shadow",
    name: "Яд осколков",
    description: "Навык: удар + тик яда.",
    row: 2,
    col: 0,
    maxRank: 1,
    requires: ["shadow-precision"],
    skillId: "venom",
    perRank: { skillDamage: 0.05 },
  },
  {
    id: "shadow-haste",
    tree: "shadow",
    name: "Скорость тени",
    description: "Скорость атаки и спешка навыков.",
    row: 2,
    col: 2,
    maxRank: 3,
    requires: ["shadow-backstab"],
    perRank: { agility: 2, skillHaste: 0.06 },
  },
  {
    id: "shadow-veil",
    tree: "shadow",
    name: "Завеса",
    description: "Капстоун: броня, крит. урон, дроп.",
    row: 3,
    col: 1,
    maxRank: 1,
    requires: [],
    requiresAny: ["shadow-venom", "shadow-haste"],
    perRank: { defense: 18, critDamage: 12, dropBonus: 0.04 },
  },

  {
    id: "essence-bolt",
    tree: "essence",
    name: "Чародейская стрела",
    description: "Магический снаряд. Корень Эссенции.",
    row: 0,
    col: 1,
    maxRank: 1,
    requires: [],
    skillId: "arcane-bolt",
    perRank: { intelligence: 2 },
  },
  {
    id: "essence-mend",
    tree: "essence",
    name: "Исцеление",
    description: "Открывает хил по кулдауну.",
    row: 1,
    col: 0,
    maxRank: 1,
    requires: ["essence-bolt"],
    skillId: "mend",
    perRank: { intelligence: 2, health: 20 },
  },
  {
    id: "essence-flow",
    tree: "essence",
    name: "Поток эссенции",
    description: "Интеллект и спешка навыков.",
    row: 1,
    col: 2,
    maxRank: 3,
    requires: ["essence-bolt"],
    perRank: { intelligence: 3, skillHaste: 0.07 },
  },
  {
    id: "essence-ward",
    tree: "essence",
    name: "Щит эссенции",
    description: "Бафф: следующие 3 удара ослаблены.",
    row: 2,
    col: 0,
    maxRank: 1,
    requires: ["essence-mend"],
    skillId: "essence-ward",
    perRank: { defense: 10 },
  },
  {
    id: "essence-meteor",
    tree: "essence",
    name: "Метеор",
    description: "Тяжёлый магический удар.",
    row: 2,
    col: 2,
    maxRank: 1,
    requires: ["essence-flow"],
    skillId: "meteor",
    perRank: { skillDamage: 0.06 },
  },
  {
    id: "essence-shatter",
    tree: "essence",
    name: "Разлом",
    description: "Капстоун: огромный магический урон и XP.",
    row: 3,
    col: 1,
    maxRank: 1,
    requires: [],
    requiresAny: ["essence-ward", "essence-meteor"],
    skillId: "shatter",
    perRank: { intelligence: 6, xpBonus: 0.05, skillDamage: 0.1 },
  },

  // The six nodes above cap out at 26 ranks, but a level-100 hunter earns 99
  // points. Mastery ranks are the sink: cheap, linear, and deliberately not
  // strong enough to beat picking up the other trees' capstones first.
  {
    id: "fury-mastery",
    tree: "fury",
    name: "Мастерство ярости",
    description: "Бесконечный ранг: +атака и +сила за очко.",
    row: 4,
    col: 1,
    maxRank: TALENT_MASTERY_MAX_RANK,
    requires: ["fury-execute"],
    perRank: { attack: 2.4, strength: 0.8 },
  },
  {
    id: "shadow-mastery",
    tree: "shadow",
    name: "Мастерство тени",
    description: "Бесконечный ранг: +крит. урон, точность и ловкость за очко.",
    row: 4,
    col: 1,
    maxRank: TALENT_MASTERY_MAX_RANK,
    requires: ["shadow-veil"],
    perRank: { critDamage: 1.2, accuracy: 0.8, agility: 0.5 },
  },
  {
    id: "essence-mastery",
    tree: "essence",
    name: "Мастерство эссенции",
    description: "Бесконечный ранг: +здоровье, +интеллект и стойкость за очко.",
    row: 4,
    col: 1,
    maxRank: TALENT_MASTERY_MAX_RANK,
    requires: ["essence-shatter"],
    perRank: { health: 12, intelligence: 0.8, endurance: 0.6 },
  },
];

export const TALENT_BY_ID: Record<string, TalentNodeDef> = Object.fromEntries(
  TALENTS.map((n) => [n.id, n]),
);

export function collectTalentBonuses(ranks: Record<string, number>) {
  const acc = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    endurance: 0,
    attack: 0,
    defense: 0,
    health: 0,
    critChance: 0,
    critDamage: 0,
    skillHaste: 0,
    skillDamage: 0,
    lifesteal: 0,
    dropBonus: 0,
    xpBonus: 0,
    accuracy: 0,
  };
  for (const [id, rank] of Object.entries(ranks)) {
    if (rank <= 0) continue;
    const node = TALENT_BY_ID[id];
    if (!node) continue;
    for (const key of Object.keys(acc) as (keyof typeof acc)[]) {
      const v = node.perRank[key];
      if (v) acc[key] += v * rank;
    }
  }
  return acc;
}

export function isSkillUnlocked(ranks: Record<string, number>, skillId: SkillId) {
  return TALENTS.some((n) => n.skillId === skillId && (ranks[n.id] ?? 0) > 0);
}

export function unlockedSkills(ranks: Record<string, number>): SkillId[] {
  return TALENTS.filter((n) => n.skillId && (ranks[n.id] ?? 0) > 0).map((n) => n.skillId!);
}

export function canAllocateTalent(ranks: Record<string, number>, nodeId: string, points: number) {
  const node = TALENT_BY_ID[nodeId];
  if (!node || points <= 0) return false;
  const current = ranks[nodeId] ?? 0;
  if (current >= node.maxRank) return false;
  if (node.requires.some((id) => (ranks[id] ?? 0) < 1)) return false;
  if (node.requiresAny && node.requiresAny.length > 0) {
    if (!node.requiresAny.some((id) => (ranks[id] ?? 0) > 0)) return false;
  }
  return true;
}

export function spentTalentRanks(ranks: Record<string, number>) {
  return Object.values(ranks).reduce((s, n) => s + n, 0);
}

export function respecCost(level: number) {
  return Math.round(120 * level);
}
