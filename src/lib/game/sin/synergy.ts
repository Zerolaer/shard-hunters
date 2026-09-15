import type { SinPathId, SinSkillId } from "../types";
import { SIN_SKILL_BY_ID, SIN_TRANSFIG, isSinSkillId } from "./skills";
import type { SinSkillTag, SinSynergy } from "./types";

const PAIR_RECIPES: {
  a: SinSkillId;
  b: SinSkillId;
  id: string;
  name: string;
  description: string;
}[] = [
  {
    a: "sin-venom",
    b: "sin-backstab",
    id: "poisoned-blade",
    name: "Отравленный клинок",
    description: "Удар в спину накладывает +2 яда.",
  },
  {
    a: "sin-flurry",
    b: "sin-eviscerate",
    id: "rising-tempo",
    name: "Нарастающий ритм",
    description: "Потрошение +10% за каждое очко комбо сверх 2.",
  },
  {
    a: "sin-vanish",
    b: "sin-ambush",
    id: "from-shadow",
    name: "Из тени",
    description: "Засада — гарантированный крит.",
  },
  {
    a: "sin-mark",
    b: "sin-execute",
    id: "sentence",
    name: "Приговор",
    description: "Казнь по меченой цели срабатывает до 50% HP.",
  },
  {
    a: "sin-fan",
    b: "sin-venom",
    id: "plague-fan",
    name: "Чумной веер",
    description: "Веер накладывает +2 яда.",
  },
  {
    a: "sin-shadowstep",
    b: "sin-backstab",
    id: "from-nowhere",
    name: "Спина из ниоткуда",
    description: "После шага удар в спину ×1.28.",
  },
  {
    a: "sin-veil",
    b: "sin-clone",
    id: "ghost-guard",
    name: "Призрачная стража",
    description: "Клон перехватывает 1 входящий удар.",
  },
  {
    a: "sin-nightblade",
    b: "sin-flurry",
    id: "blade-dance",
    name: "Танец клинков",
    description: "Шквал −20% CD, пока активен Ночной клинок.",
  },
  {
    a: "sin-garrote",
    b: "sin-rupture",
    id: "open-wound",
    name: "Вскрытие",
    description: "Разрыв дополнительно сжигает кровотечение.",
  },
  {
    a: "sin-mark",
    b: "sin-venom",
    id: "plague-mark",
    name: "Метка чумы",
    description: "Яд и тики по меченой цели +30%.",
  },
  {
    a: "sin-clone",
    b: "sin-fan",
    id: "echo-fan",
    name: "Эхо веера",
    description: "Клон повторяет веер отдельным ударом.",
  },
  {
    a: "sin-ambush",
    b: "sin-eviscerate",
    id: "open-spend",
    name: "Вскрытие комбо",
    description: "После засады потрошение считает комбо как минимум 3.",
  },
  {
    a: "sin-shadowstep",
    b: "sin-ambush",
    id: "blink-open",
    name: "Шаг-засада",
    description: "Теневой шаг даёт 1.0с скрытности.",
  },
  {
    a: "sin-nightblade",
    b: "sin-execute",
    id: "moon-sentence",
    name: "Лунный приговор",
    description: "Казнь под Ночным клинком: +14% крита.",
  },
  {
    a: "sin-vanish",
    b: "sin-clone",
    id: "split-shadow",
    name: "Раздвоение",
    description: "Исчезновение создаёт короткого клона на 3с.",
  },
  {
    a: "sin-backstab",
    b: "sin-eviscerate",
    id: "stab-rip",
    name: "Колоть и рвать",
    description: "Потрошение +18%, если предыдущий навык — удар в спину.",
  },
  {
    a: "sin-flurry",
    b: "sin-fan",
    id: "steel-storm",
    name: "Стальной шторм",
    description: "Оба генератора дают +1 комбо.",
  },
  {
    a: "sin-veil",
    b: "sin-vanish",
    id: "double-veil",
    name: "Двойная завеса",
    description: "Завеса продлевает скрытность на 1.2с, если она активна.",
  },
  {
    a: "sin-rupture",
    b: "sin-execute",
    id: "toxic-end",
    name: "Ядовитый конец",
    description: "Казнь после разрыва добивает остаточный яд ×1.2.",
  },
  {
    a: "sin-mark",
    b: "sin-ambush",
    id: "marked-prey",
    name: "Добыча",
    description: "Засада по меченой цели +22%.",
  },
];

function adjacent<T>(hotbar: Array<T | null>) {
  const pairs: [T, T][] = [];
  for (let i = 0; i < hotbar.length - 1; i++) {
    const a = hotbar[i];
    const b = hotbar[i + 1];
    if (a && b) pairs.push([a, b]);
  }
  return pairs;
}

function matchPair(a: SinSkillId, b: SinSkillId) {
  return PAIR_RECIPES.find(
    (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a),
  );
}

export function sinHotbarSkills(hotbar: Array<string | null>): SinSkillId[] {
  return hotbar.filter((id): id is SinSkillId => isSinSkillId(id));
}

/** Base tags plus the current path transfig — same merge as `applyTransfig` / art compatibility. */
export function sinResolvedTags(skillId: SinSkillId, path?: SinPathId | null): SinSkillTag[] {
  const base = SIN_SKILL_BY_ID[skillId].tags;
  if (!path) return base;
  const extra = SIN_TRANSFIG[path][skillId]?.tags;
  if (!extra?.length) return base;
  return [...new Set([...base, ...extra])];
}

export function detectSinSynergies(
  hotbar: Array<string | null>,
  path?: SinPathId | null,
): SinSynergy[] {
  const skills = sinHotbarSkills(hotbar);
  const found: SinSynergy[] = [];
  const seen = new Set<string>();

  for (const [a, b] of adjacent(hotbar)) {
    if (!isSinSkillId(a) || !isSinSkillId(b)) continue;
    const recipe = matchPair(a, b);
    if (recipe && !seen.has(recipe.id)) {
      seen.add(recipe.id);
      found.push({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        kind: "pair",
      });
    }
  }

  const tagCount = (tag: SinSkillTag) =>
    skills.reduce((n, id) => (sinResolvedTags(id, path).includes(tag) ? n + 1 : n), 0);

  const poison = tagCount("poison");
  const combo = tagCount("combo");
  const shade = tagCount("shade") + tagCount("stealth");
  const attack = tagCount("attack");

  if (poison >= 3) {
    found.push({
      id: "set-poison-3",
      name: "Чумной контур",
      description: "Тики яда +25%, Разрыв +20%, кап стаков +2.",
      kind: "set",
    });
  } else if (poison >= 2) {
    found.push({
      id: "set-poison-2",
      name: "Ядовитая связка",
      description: "Тики яда +12%.",
      kind: "set",
    });
  }
  if (combo >= 3) {
    found.push({
      id: "set-combo-3",
      name: "Ритм убийцы",
      description: "Генераторы +1 комбо с 35% шанса. Спендеры +10%.",
      kind: "set",
    });
  } else if (combo >= 2) {
    found.push({
      id: "set-combo-2",
      name: "Цепь клинков",
      description: "Генераторы +8% урона.",
      kind: "set",
    });
  }
  if (shade >= 3) {
    found.push({
      id: "set-shade-3",
      name: "Хор эха",
      description: "Клон живёт +2с, скрытность +0.8с.",
      kind: "set",
    });
  } else if (shade >= 2) {
    found.push({
      id: "set-shade-2",
      name: "Двойная тень",
      description: "Скрытность +0.6с.",
      kind: "set",
    });
  }
  if (attack >= 4 && skills.length >= 4) {
    found.push({
      id: "set-pure-blade",
      name: "Чистое лезвие",
      description: "Все 4 слота — атака: +8% урона навыков.",
      kind: "set",
    });
  }
  if (poison >= 2 && combo >= 2) {
    found.push({
      id: "set-hybrid",
      name: "Клинок-чаша",
      description: "Гибрид: комбо-спендеры накладывают +1 яд, яд-спендеры дают +1 комбо.",
      kind: "set",
    });
  }

  return found;
}

export function hasSynergy(synergies: SinSynergy[], id: string) {
  return synergies.some((s) => s.id === id);
}

export function adjacentTo(hotbar: Array<string | null>, skillId: SinSkillId) {
  const i = hotbar.indexOf(skillId);
  if (i < 0) return [] as SinSkillId[];
  const out: SinSkillId[] = [];
  const left = hotbar[i - 1];
  const right = hotbar[i + 1];
  if (isSinSkillId(left)) out.push(left);
  if (isSinSkillId(right)) out.push(right);
  return out;
}
