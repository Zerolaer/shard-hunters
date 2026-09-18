import { DROP } from "./balance";
import type {
  EquipSlot,
  Item,
  Rarity,
  SkillDef,
  AffixStat,
} from "./types";

export type { LocationDef, LocationKind, LocationRegion } from "./locations";
export {
  LOCATION_BY_ID,
  LOCATION_KIND_LABEL,
  LOCATIONS,
  REGION_BY_ID,
  REGIONS,
  locationsForRegion,
  locationEntryBm,
  locationRecommendedBm,
  recommendedLocationId,
  regionForLocation,
} from "./locations";

/** Visual bag: 8 columns × 6 base rows (48 cells). Up to +3 rows can be bought. */
export const INVENTORY_COLS = 8;
export const INVENTORY_ROWS = 6;
export const INVENTORY_EXTRA_ROWS_MAX = 3;
export const INVENTORY_ROW_COSTS = [100_000, 200_000, 300_000] as const;
export const INVENTORY_SIZE = INVENTORY_COLS * INVENTORY_ROWS;
export const INVENTORY_SIZE_MAX = INVENTORY_COLS * (INVENTORY_ROWS + INVENTORY_EXTRA_ROWS_MAX);

export function inventoryCapacity(extraRows = 0) {
  const rows = INVENTORY_ROWS + Math.max(0, Math.min(INVENTORY_EXTRA_ROWS_MAX, Math.floor(extraRows)));
  return INVENTORY_COLS * rows;
}

export function normalizeInventory<T>(
  inv: Array<T | null> | undefined,
  size = INVENTORY_SIZE,
): Array<T | null> | undefined {
  if (!inv) return undefined;
  if (inv.length === size) return inv;
  if (inv.length < size) {
    return [...inv, ...Array.from({ length: size - inv.length }, () => null)];
  }
  const packed = inv.filter((item): item is T => item !== null);
  const next: Array<T | null> = Array.from({ length: size }, () => null);
  const keep = Math.min(packed.length, size);
  for (let i = 0; i < keep; i++) next[i] = packed[i]!;
  return next;
}

export const MAX_ENHANCE = 15;
export const MAX_FLOOR = 5;
export const KILLS_FOR_BOSS = 10;
export const STAT_POINTS_PER_LEVEL = 5;
export const TALENT_POINTS_PER_LEVEL = 1;
export const COMBAT_LOG_CAP = 90;
export const FLOATING_CAP = 14;
export const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
export const SAVE_KEY = "shard-hunters-save-v2";
export const LEGACY_SAVE_KEY = "shard-hunters-save-v1";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Обычный",
  uncommon: "Необычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
  mythic: "Мифический",
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9ca3af",
  uncommon: "#34d399",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#fb7185",
};

export const SLOT_LABEL: Record<EquipSlot, string> = {
  helmet: "Шлем",
  armor: "Доспех",
  gloves: "Перчатки",
  boots: "Сапоги",
  weapon: "Оружие",
  offhand: "Вторичка",
  ring: "Кольцо",
  amulet: "Амулет",
  artifact1: "Артефакт I",
  artifact2: "Артефакт II",
  artifact3: "Артефакт III",
};

export const STAT_LABEL: Record<AffixStat, string> = {
  strength: "Сила",
  agility: "Ловкость",
  intelligence: "Интеллект",
  endurance: "Выносливость",
  critChance: "Шанс крита",
  critDamage: "Крит. урон",
  defense: "Защита",
  health: "Здоровье",
  attack: "Атака",
  accuracy: "Точность",
};

export const CORE_STAT_HINT: Record<
  "strength" | "agility" | "endurance" | "intelligence",
  string
> = {
  strength: "Физический урон автоатак и силовых навыков",
  agility: "Шанс крита, скорость атаки и точность (аккураси)",
  endurance: "Запас здоровья и броня",
  intelligence: "Урон магических навыков и исцеление",
};


export interface MineDef {
  id: string;
  name: string;
  blurb: string;
  orePerSec: number;
  slots: number;
  minLevel: number;
  /** Gate uses expectedBm(bmLevel). */
  bmLevel: number;
  accent: string;
}

export const MINES: MineDef[] = [
  {
    id: "lower",
    name: "Нижняя шахта",
    blurb: "Поверхностные жилы. Стабильный, скромный доход.",
    orePerSec: 0.9,
    slots: 5,
    minLevel: 1,
    bmLevel: 1,
    accent: "#a8a29e",
  },
  {
    id: "vein",
    name: "Жила новичков",
    blurb: "Первый слой, где уже спорят за штольни.",
    orePerSec: 1.6,
    slots: 4,
    minLevel: 4,
    bmLevel: 8,
    accent: "#d6d3d1",
  },
  {
    id: "middle",
    name: "Средняя шахта",
    blurb: "Глубинный слой. Гильдии дерутся за проход.",
    orePerSec: 2.6,
    slots: 4,
    minLevel: 8,
    bmLevel: 16,
    accent: "#818cf8",
  },
  {
    id: "deep",
    name: "Глубинная выработка",
    blurb: "Темнее и жирнее. Нужна боевая мощь, не только уровень.",
    orePerSec: 4.2,
    slots: 4,
    minLevel: 14,
    bmLevel: 28,
    accent: "#60a5fa",
  },
  {
    id: "higher",
    name: "Высшая шахта",
    blurb: "Сердце эссенции среднего круга.",
    orePerSec: 7.2,
    slots: 3,
    minLevel: 16,
    bmLevel: 36,
    accent: "#fbbf24",
  },
  {
    id: "core",
    name: "Ядро эссенции",
    blurb: "Сжатая жила. Мало мест, высокий БМ.",
    orePerSec: 11.5,
    slots: 3,
    minLevel: 28,
    bmLevel: 52,
    accent: "#f97316",
  },
  {
    id: "void",
    name: "Пустотная шахта",
    blurb: "Рифт под камнем. Только для сильных комплектов.",
    orePerSec: 18,
    slots: 2,
    minLevel: 42,
    bmLevel: 72,
    accent: "#a855f7",
  },
  {
    id: "myth",
    name: "Мифический разлом",
    blurb: "Конец штольни. Максимальный AFK относительно БМ.",
    orePerSec: 28,
    slots: 2,
    minLevel: 60,
    bmLevel: 95,
    accent: "#fb7185",
  },
];

/**
 * Auto-attacks are the damage floor; skills are the spice on top, not the meal.
 * Multipliers here are tuned so a full hotbar lands around a third of total
 * damage — `npx tsx scripts/diag.ts` prints that share as "доля скиллов".
 */
export const SKILLS: SkillDef[] = [
  {
    id: "power-strike",
    name: "Мощный удар",
    description: "Сокрушительная атака с двойным вкладом силы.",
    cooldown: 6,
    unlockLevel: 1,
    kind: "physical",
    multiplier: 1.15,
  },
  {
    id: "mend",
    name: "Исцеление",
    description: "Восстанавливает часть максимального здоровья.",
    cooldown: 12,
    unlockLevel: 1,
    kind: "heal",
    multiplier: 0.24,
  },
  {
    id: "cleave",
    name: "Рассечение",
    description: "Широкий взмах оружием по слабому месту.",
    cooldown: 8,
    unlockLevel: 1,
    kind: "physical",
    multiplier: 0.92,
  },
  {
    id: "arcane-bolt",
    name: "Чародейская стрела",
    description: "Сгусток эссенции, масштабируется от интеллекта.",
    cooldown: 7,
    unlockLevel: 1,
    kind: "magic",
    multiplier: 1.25,
  },
  {
    id: "flurry",
    name: "Шквал",
    description: "Серия быстрых ударов. Сильнее от ловкости.",
    cooldown: 5,
    unlockLevel: 1,
    kind: "agility",
    multiplier: 0.82,
  },
  {
    id: "shield-bash",
    name: "Удар щитом",
    description: "Оглушающий удар вторичкой / щитом.",
    cooldown: 10,
    unlockLevel: 1,
    kind: "physical",
    multiplier: 1,
  },
  {
    id: "bloodlust",
    name: "Жажда крови",
    description: "Следующие 4 автоатаки наносят +45% урона.",
    cooldown: 20,
    unlockLevel: 1,
    kind: "buff",
    multiplier: 1.45,
  },
  {
    id: "meteor",
    name: "Метеор",
    description: "Обрушивает осколок небес. Долгая перезарядка.",
    cooldown: 18,
    unlockLevel: 1,
    kind: "magic",
    multiplier: 2.1,
  },
  {
    id: "execute",
    name: "Казнь",
    description: "Финишер. Наносит ×2.2, если у цели меньше 35% HP.",
    cooldown: 11,
    unlockLevel: 1,
    kind: "physical",
    multiplier: 1.3,
  },
  {
    id: "backstab",
    name: "Удар в спину",
    description: "Коварный удар с повышенным шансом крита.",
    cooldown: 7,
    unlockLevel: 1,
    kind: "agility",
    multiplier: 1.1,
  },
  {
    id: "venom",
    name: "Яд осколков",
    description: "Удар, за которым следует тик яда.",
    cooldown: 8,
    unlockLevel: 1,
    kind: "agility",
    multiplier: 0.78,
  },
  {
    id: "essence-ward",
    name: "Щит эссенции",
    description: "Следующие 3 входящих удара ослаблены на 40%.",
    cooldown: 16,
    unlockLevel: 1,
    kind: "buff",
    multiplier: 0,
  },
  {
    id: "shatter",
    name: "Разлом",
    description: "Капстоун эссенции: разрушает цель сгустком реальности.",
    cooldown: 16,
    unlockLevel: 1,
    kind: "magic",
    multiplier: 1.85,
  },
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
);

/** Per-kill item drop chance before spot multiplier and dropBonus. */
export const TRASH_DROP_CHANCE = DROP.trashChance;
export const BOSS_DROP_CHANCE = DROP.bossChance;
export const PVP_DROP_CHANCE = DROP.pvpChance;

/** After dropBonus and farm-spot multiplier, chance cannot exceed this. */
export const DROP_CHANCE_CAP = DROP.chanceCap;

/** Independent extra item roll on a boss kill (max two items, not a bag dump). */
export const BOSS_BONUS_ITEM_CHANCE = DROP.bossBonusItem;

/** Extra luck added to rollRarity for bosses / PvP (does not raise drop volume). */
export const BOSS_RARITY_BONUS = DROP.bossRarity;
export const PVP_RARITY_BONUS = DROP.pvpRarity;

export const DROP_WEIGHTS: Record<Rarity, number> = DROP.weights;

export { AFFIX_POOL } from "./balance";

export const SLOT_BASE_NAME: Record<EquipSlot, string[]> = {
  helmet: ["Шлем", "Капюшон", "Корона", "Маска"],
  armor: ["Кираса", "Мантия", "Доспех", "Жилет"],
  gloves: ["Перчатки", "Боевые рукавицы", "Наручи"],
  boots: ["Сапоги", "Поножи", "Следы"],
  weapon: ["Клинок", "Топор", "Посох", "Копьё", "Кинжал"],
  offhand: ["Щит", "Сфера", "Кинжал тени", "Фолиант"],
  ring: ["Кольцо", "Перстень", "Обруч"],
  amulet: ["Амулет", "Талисман", "Кулон"],
  artifact1: ["Реликт", "Осколок власти", "Печать"],
  artifact2: ["Реликт", "Осколок власти", "Печать"],
  artifact3: ["Реликт", "Осколок власти", "Печать"],
};

export const NAME_PREFIX: Record<Rarity, string[]> = {
  common: ["Ржавый", "Потёртый", "Простой", "Походный"],
  uncommon: ["Закалённый", "Охотничий", "Лесной", "Надёжный"],
  rare: ["Рунный", "Лазурный", "Стража", "Кристальный"],
  epic: ["Эфирный", "Пурпурный", "Проклятый", "Астральный"],
  legendary: ["Солнечный", "Древний", "Владычный", "Огненный"],
  mythic: ["Расколотый", "Первозданный", "Божественный", "Пустотный"],
};

export const NPC_HUNTERS = [
  "Кира Вейл",
  "Мракрез",
  "Серебряная Ина",
  "Торн Железный",
  "Лиса из Пепла",
  "Ваэль Нокс",
  "Оррен Клык",
  "Мира Осколок",
  "Дрейк Пустошей",
  "Юна Сумрак",
  "Касс Неборез",
  "Грим Шахтёр",
  "Элра Звезда",
  "Рук Каменный",
  "Серафин Праха",
];

export const NPC_GUILDS = [
  "Клинки Пустоты",
  "Золотая Корона",
  "Ночные Волки",
  "Пепельный Рассвет",
  "Хор Эссенции",
];

export function emptyEquipment(): Record<EquipSlot, Item | null> {
  return {
    helmet: null,
    armor: null,
    gloves: null,
    boots: null,
    weapon: null,
    offhand: null,
    ring: null,
    amulet: null,
    artifact1: null,
    artifact2: null,
    artifact3: null,
  };
}

export function defaultAutoSell(): Record<Rarity, boolean> {
  return {
    common: true,
    uncommon: false,
    rare: false,
    epic: false,
    legendary: false,
    mythic: false,
  };
}

/** Fill missing rarity keys so old saves cannot drop `common: true`. */
export function resolvedAutoSell(
  saved?: Partial<Record<Rarity, boolean>> | null,
): Record<Rarity, boolean> {
  return { ...defaultAutoSell(), ...saved };
}

export function resolvedAutoSellEnabled(saved?: boolean | null): boolean {
  return saved !== false;
}
