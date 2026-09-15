import type { SinArtId, SinKeystoneId, SinPathId, SinSkillId } from "../types";

export interface SinNodeDef {
  id: string;
  path: SinPathId;
  name: string;
  description: string;
  row: number;
  col: number;
  maxRank: number;
  requires: string[];
  requiresAny?: string[];
  skillId?: SinSkillId;
  artId?: SinArtId;
  keystone?: SinKeystoneId;
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

export const SIN_NODES: SinNodeDef[] = [
  {
    id: "blade-backstab",
    path: "blade",
    name: "Удар в спину",
    description: "Открывает удар в спину. Корень Клинка Безмолвия.",
    row: 0,
    col: 1,
    maxRank: 1,
    requires: [],
    skillId: "sin-backstab",
    perRank: { agility: 3 },
  },
  {
    id: "blade-edge",
    path: "blade",
    name: "Остриё",
    description: "Крит и атака за ранг.",
    row: 0,
    col: 2,
    maxRank: 3,
    requires: ["blade-backstab"],
    perRank: { critChance: 2.2, attack: 4 },
  },
  {
    id: "blade-mark",
    path: "blade",
    name: "Метка сердца",
    description: "Открывает метку убийцы.",
    row: 1,
    col: 0,
    maxRank: 1,
    requires: ["blade-backstab"],
    skillId: "sin-mark",
    perRank: { skillDamage: 0.04 },
  },
  {
    id: "blade-precision",
    path: "blade",
    name: "Точность клинка",
    description: "Крит. урон и точность.",
    row: 1,
    col: 1,
    maxRank: 3,
    requires: ["blade-backstab"],
    perRank: { critDamage: 8, accuracy: 3.2 },
  },
  {
    id: "blade-fan",
    path: "blade",
    name: "Стальной веер",
    description: "Открывает веер клинков.",
    row: 1,
    col: 2,
    maxRank: 1,
    requires: ["blade-edge"],
    skillId: "sin-fan",
    perRank: { agility: 2 },
  },
  {
    id: "blade-eviscerate",
    path: "blade",
    name: "Потрошение",
    description: "Спендер комбо. Также открывает искусство «Холодный расчёт».",
    row: 2,
    col: 0,
    maxRank: 1,
    requires: ["blade-mark"],
    skillId: "sin-eviscerate",
    artId: "art-economy",
    perRank: { skillDamage: 0.06 },
  },
  {
    id: "blade-art-crit",
    path: "blade",
    name: "Искусство: Смерть",
    description: "Сокет «Смертельный удар» — крит конкретного навыка.",
    row: 2,
    col: 1,
    maxRank: 1,
    requires: ["blade-precision"],
    artId: "art-crit",
    perRank: { critChance: 1.5 },
  },
  {
    id: "blade-nightblade",
    path: "blade",
    name: "Ритм убийцы",
    description: "Открывает Ночной клинок.",
    row: 2,
    col: 2,
    maxRank: 1,
    requires: ["blade-fan"],
    skillId: "sin-nightblade",
    perRank: { skillHaste: 0.05 },
  },
  {
    id: "blade-execute",
    path: "blade",
    name: "Приговор",
    description: "Финишер. Также открывает искусство «Добивание».",
    row: 3,
    col: 1,
    maxRank: 1,
    requires: [],
    requiresAny: ["blade-eviscerate", "blade-nightblade"],
    skillId: "sin-execute",
    artId: "art-execute",
    perRank: { skillDamage: 0.08 },
  },
  {
    id: "blade-art-multi",
    path: "blade",
    name: "Искусство: Серия",
    description: "Сокет «Серия клинков» — второй удар.",
    row: 3,
    col: 2,
    maxRank: 1,
    requires: ["blade-art-crit"],
    artId: "art-multistrike",
    perRank: { attack: 5 },
  },
  {
    id: "blade-veil",
    path: "blade",
    name: "Завеса клинка",
    description: "Открывает завесу.",
    row: 3,
    col: 0,
    maxRank: 1,
    requires: ["blade-eviscerate"],
    skillId: "sin-veil",
    perRank: { defense: 12 },
  },
  {
    id: "blade-garrote",
    path: "blade",
    name: "Перерезание",
    description: "Открывает гарроту — контроль скорости цели.",
    row: 4,
    col: 0,
    maxRank: 1,
    requires: ["blade-veil"],
    skillId: "sin-garrote",
    perRank: { agility: 2 },
  },
  {
    id: "blade-keystone",
    path: "blade",
    name: "Безмолвное сердце",
    description: "Капстоун: комбо до 6. На 5+ комбо +12% крита. Потрошение возвращает 1 комбо.",
    row: 4,
    col: 1,
    maxRank: 1,
    requires: ["blade-execute"],
    keystone: "silent-heart",
    perRank: { critChance: 4, skillDamage: 0.06 },
  },
  {
    id: "blade-art-combo",
    path: "blade",
    name: "Искусство: Ритм",
    description: "Сокет «Ритм» — генераторы дают +1 комбо.",
    row: 4,
    col: 2,
    maxRank: 1,
    requires: ["blade-art-multi"],
    artId: "art-combo",
    perRank: { skillHaste: 0.04 },
  },

  {
    id: "venom-toxin",
    path: "venom",
    name: "Яд клинка",
    description: "Открывает яд. Корень Чаши Яда.",
    row: 0,
    col: 1,
    maxRank: 1,
    requires: [],
    skillId: "sin-venom",
    perRank: { agility: 2, skillDamage: 0.03 },
  },
  {
    id: "venom-potency",
    path: "venom",
    name: "Концентрат",
    description: "Сила навыков и лёгкий вампиризм за ранг.",
    row: 0,
    col: 2,
    maxRank: 3,
    requires: ["venom-toxin"],
    perRank: { skillDamage: 0.04, lifesteal: 0.015 },
  },
  {
    id: "venom-garrote",
    path: "venom",
    name: "Гаррота",
    description: "Кровотечение + яд в транфиге чаши.",
    row: 1,
    col: 0,
    maxRank: 1,
    requires: ["venom-toxin"],
    skillId: "sin-garrote",
    perRank: { agility: 2 },
  },
  {
    id: "venom-sap",
    path: "venom",
    name: "Сок эссенции",
    description: "Интеллект яда: навыки и здоровье.",
    row: 1,
    col: 1,
    maxRank: 3,
    requires: ["venom-toxin"],
    perRank: { intelligence: 2, health: 18, skillDamage: 0.03 },
  },
  {
    id: "venom-fan",
    path: "venom",
    name: "Чумной веер",
    description: "Открывает веер. Разносит стаки.",
    row: 1,
    col: 2,
    maxRank: 1,
    requires: ["venom-potency"],
    skillId: "sin-fan",
    perRank: { agility: 2 },
  },
  {
    id: "venom-mark",
    path: "venom",
    name: "Метка чумы",
    description: "Открывает метку. Яд по меченой жирнее.",
    row: 2,
    col: 0,
    maxRank: 1,
    requires: ["venom-garrote"],
    skillId: "sin-mark",
    perRank: { skillDamage: 0.05 },
  },
  {
    id: "venom-art-poison",
    path: "venom",
    name: "Искусство: Яд",
    description: "Сокет «Яд в ране» — +2 стака с навыка.",
    row: 2,
    col: 1,
    maxRank: 1,
    requires: ["venom-sap"],
    artId: "art-poison",
    perRank: { skillDamage: 0.03 },
  },
  {
    id: "venom-nightblade",
    path: "venom",
    name: "Аура тлена",
    description: "Ночной клинок: автоатаки капают яд.",
    row: 2,
    col: 2,
    maxRank: 1,
    requires: ["venom-fan"],
    skillId: "sin-nightblade",
    perRank: { skillHaste: 0.04 },
  },
  {
    id: "venom-rupture",
    path: "venom",
    name: "Разрыв",
    description: "Детонация яда. Также открывает «Добивание».",
    row: 3,
    col: 0,
    maxRank: 1,
    requires: ["venom-mark"],
    skillId: "sin-rupture",
    artId: "art-execute",
    perRank: { skillDamage: 0.07 },
  },
  {
    id: "venom-art-duration",
    path: "venom",
    name: "Искусство: Затяжка",
    description: "Сокет «Затяжное искусство» — длительности +40%.",
    row: 3,
    col: 1,
    maxRank: 1,
    requires: ["venom-art-poison"],
    artId: "art-duration",
    perRank: { intelligence: 3 },
  },
  {
    id: "venom-execute",
    path: "venom",
    name: "Последняя капля",
    description: "Казнь, сжигающая остаток яда.",
    row: 3,
    col: 2,
    maxRank: 1,
    requires: [],
    requiresAny: ["venom-nightblade", "venom-rupture"],
    skillId: "sin-execute",
    perRank: { skillDamage: 0.05 },
  },
  {
    id: "venom-veil",
    path: "venom",
    name: "Токсичная дымка",
    description: "Завеса. Атакующие получают яд.",
    row: 4,
    col: 0,
    maxRank: 1,
    requires: ["venom-rupture"],
    skillId: "sin-veil",
    perRank: { defense: 10, lifesteal: 0.02 },
  },
  {
    id: "venom-keystone",
    path: "venom",
    name: "Чаша без дна",
    description: "Капстоун: яд до 16. Тики +25%. 20% урона ядом лечит.",
    row: 4,
    col: 1,
    maxRank: 1,
    requires: ["venom-art-duration"],
    keystone: "bottomless-cup",
    perRank: { skillDamage: 0.08, lifesteal: 0.02 },
  },
  {
    id: "venom-art-blood",
    path: "venom",
    name: "Искусство: Жажда",
    description: "Сокет «Жажда» — +18% по отравленным / истекающим.",
    row: 4,
    col: 2,
    maxRank: 1,
    requires: ["venom-execute"],
    artId: "art-bloodlust",
    perRank: { attack: 6 },
  },

  {
    id: "phantom-vanish",
    path: "phantom",
    name: "Исчезновение",
    description: "Открывает роспуск. Корень Призрачного Шага.",
    row: 0,
    col: 1,
    maxRank: 1,
    requires: [],
    skillId: "sin-vanish",
    perRank: { agility: 2, defense: 6 },
  },
  {
    id: "phantom-mist",
    path: "phantom",
    name: "Дымка",
    description: "Броня и спешка за ранг.",
    row: 0,
    col: 2,
    maxRank: 3,
    requires: ["phantom-vanish"],
    perRank: { defense: 8, skillHaste: 0.04 },
  },
  {
    id: "phantom-step",
    path: "phantom",
    name: "Теневой шаг",
    description: "Шаг сквозь завесу. Короткий сетап.",
    row: 1,
    col: 0,
    maxRank: 1,
    requires: ["phantom-vanish"],
    skillId: "sin-shadowstep",
    perRank: { agility: 3 },
  },
  {
    id: "phantom-art-haste",
    path: "phantom",
    name: "Искусство: Молния",
    description: "Сокет «Молниеносность» — −22% CD.",
    row: 1,
    col: 1,
    maxRank: 1,
    requires: ["phantom-vanish"],
    artId: "art-haste",
    perRank: { skillHaste: 0.03 },
  },
  {
    id: "phantom-mark",
    path: "phantom",
    name: "Метка добычи",
    description: "Открывает метку. Также «Охотник».",
    row: 1,
    col: 2,
    maxRank: 1,
    requires: ["phantom-mist"],
    skillId: "sin-mark",
    artId: "art-mark",
    perRank: { skillDamage: 0.04 },
  },
  {
    id: "phantom-ambush",
    path: "phantom",
    name: "Засада",
    description: "Opener из скрытности.",
    row: 2,
    col: 0,
    maxRank: 1,
    requires: ["phantom-step"],
    skillId: "sin-ambush",
    perRank: { critChance: 2, attack: 5 },
  },
  {
    id: "phantom-clone",
    path: "phantom",
    name: "Эхо",
    description: "Открывает теневого двойника.",
    row: 2,
    col: 1,
    maxRank: 1,
    requires: ["phantom-art-haste"],
    skillId: "sin-clone",
    perRank: { skillDamage: 0.05 },
  },
  {
    id: "phantom-backstab",
    path: "phantom",
    name: "Удар из ниоткуда",
    description: "Удар в спину транфига тени.",
    row: 2,
    col: 2,
    maxRank: 1,
    requires: ["phantom-mark"],
    skillId: "sin-backstab",
    perRank: { agility: 3 },
  },
  {
    id: "phantom-veil",
    path: "phantom",
    name: "Призрачная плоть",
    description: "Завеса ветки тени.",
    row: 3,
    col: 0,
    maxRank: 1,
    requires: ["phantom-ambush"],
    skillId: "sin-veil",
    perRank: { defense: 14 },
  },
  {
    id: "phantom-art-echo",
    path: "phantom",
    name: "Искусство: Эхо",
    description: "Сокет «Эхо тени» — шанс повторить навык.",
    row: 3,
    col: 1,
    maxRank: 1,
    requires: ["phantom-clone"],
    artId: "art-echo",
    perRank: { skillDamage: 0.04 },
  },
  {
    id: "phantom-execute",
    path: "phantom",
    name: "Стирание",
    description: "Казнь. С 2+ тени бьёт в любом окне HP.",
    row: 3,
    col: 2,
    maxRank: 1,
    requires: ["phantom-backstab"],
    skillId: "sin-execute",
    perRank: { skillDamage: 0.07 },
  },
  {
    id: "phantom-art-fortify",
    path: "phantom",
    name: "Искусство: Покров",
    description: "Сокет «Теневой покров» — DR после навыка.",
    row: 4,
    col: 0,
    maxRank: 1,
    requires: ["phantom-veil"],
    artId: "art-fortify",
    perRank: { defense: 8 },
  },
  {
    id: "phantom-keystone",
    path: "phantom",
    name: "Тело-эхо",
    description: "Капстоун: тень до 4. Навыки из скрытности +22%. Завеса даёт +1 тень.",
    row: 4,
    col: 1,
    maxRank: 1,
    requires: ["phantom-art-echo"],
    keystone: "echo-body",
    perRank: { critDamage: 10, skillDamage: 0.06 },
  },
  {
    id: "phantom-nightblade",
    path: "phantom",
    name: "Танец призрака",
    description: "Ночной клинок: крит навыка даёт тень.",
    row: 4,
    col: 2,
    maxRank: 1,
    requires: ["phantom-execute"],
    skillId: "sin-nightblade",
    perRank: { skillHaste: 0.05 },
  },
];

export const SIN_NODE_BY_ID: Record<string, SinNodeDef> = Object.fromEntries(
  SIN_NODES.map((n) => [n.id, n]),
);

export function collectSinBonuses(ranks: Record<string, number> | undefined) {
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
  if (!ranks) return acc;
  for (const [id, rank] of Object.entries(ranks)) {
    if (rank <= 0) continue;
    const node = SIN_NODE_BY_ID[id];
    if (!node) continue;
    for (const key of Object.keys(acc) as (keyof typeof acc)[]) {
      const v = node.perRank[key];
      if (v) acc[key] += v * rank;
    }
  }
  return acc;
}

export function isSinSkillUnlocked(ranks: Record<string, number>, skillId: SinSkillId) {
  if (skillId === "sin-flurry" && (ranks["sin-starter"] ?? 0) > 0) return true;
  return SIN_NODES.some((n) => n.skillId === skillId && (ranks[n.id] ?? 0) > 0);
}

export function unlockedSinSkills(ranks: Record<string, number>): SinSkillId[] {
  const ids = new Set<SinSkillId>();
  if ((ranks["sin-starter"] ?? 0) > 0) ids.add("sin-flurry");
  for (const n of SIN_NODES) {
    if (n.skillId && (ranks[n.id] ?? 0) > 0) ids.add(n.skillId);
  }
  return [...ids];
}

export function unlockedSinArts(ranks: Record<string, number>): SinArtId[] {
  const ids = new Set<SinArtId>();
  for (const n of SIN_NODES) {
    if (n.artId && (ranks[n.id] ?? 0) > 0) ids.add(n.artId);
  }
  return [...ids];
}

export function hasSinKeystone(
  ranks: Record<string, number>,
  _path: SinPathId | null,
  keystone: SinKeystoneId,
) {
  return SIN_NODES.some((n) => n.keystone === keystone && (ranks[n.id] ?? 0) > 0);
}

export function canAllocateSinNode(
  ranks: Record<string, number>,
  nodeId: string,
  points: number,
  path: SinPathId | null,
) {
  if (!path || points <= 0) return false;
  const node = SIN_NODE_BY_ID[nodeId];
  if (!node) return false;
  const current = ranks[nodeId] ?? 0;
  if (current >= node.maxRank) return false;
  if (node.requires.some((id) => (ranks[id] ?? 0) < 1)) return false;
  if (node.requiresAny && node.requiresAny.length > 0) {
    if (!node.requiresAny.some((id) => (ranks[id] ?? 0) > 0)) return false;
  }
  return true;
}

export function spentSinRanks(ranks: Record<string, number>) {
  return Object.entries(ranks).reduce((s, [id, n]) => (id === "sin-starter" ? s : s + n), 0);
}
