import { LOCATION_THREAT, spotRequiredBm } from "./balance";

export type LocationKind = "normal" | "elite" | "boss";

export interface LocationRegion {
  id: string;
  name: string;
  blurb: string;
  accent: string;
  /** Pin position on the clustered farm map, 0–100. */
  mapX: number;
  mapY: number;
}

export interface LocationDef {
  id: string;
  name: string;
  blurb: string;
  minLevel: number;
  accent: string;
  mobNames: string[];
  bossName: string;
  baseLevel: number;
  regionId: string;
  kind: LocationKind;
  /** Extra monster HP/ATK multiplier on top of farm-spot danger. */
  threat: number;
  /**
   * Multiplies every farm square's required BM here. Endgame zones sit far above
   * the level curve on purpose: the gate is gear, not another twenty levels.
   */
  bmScale?: number;
  /** Extra rarity luck on every item that drops here, on top of the square's own bias. */
  rarityBias?: number;
  /** Refuses entry below the zone's commons requirement instead of only warning. */
  bmGated?: boolean;
}

export const LOCATION_KIND_LABEL: Record<LocationKind, string> = {
  normal: "Фарм",
  elite: "Элита",
  boss: "Врата",
};

export const REGIONS: LocationRegion[] = [
  {
    id: "whispering",
    name: "Шепчущий лес",
    blurb: "Туман и корни. Первый клинок.",
    accent: "#34d399",
    mapX: 8,
    mapY: 68,
  },
  {
    id: "crystal",
    name: "Кристальные пещеры",
    blurb: "Жилы эссенции под камнем.",
    accent: "#60a5fa",
    mapX: 18,
    mapY: 42,
  },
  {
    id: "ash",
    name: "Тлеющие пустоши",
    blurb: "Пепел войны над трещинами.",
    accent: "#f97316",
    mapX: 30,
    mapY: 62,
  },
  {
    id: "cult",
    name: "Святилище Пустоты",
    blurb: "Забытый культ и зеркала.",
    accent: "#a855f7",
    mapX: 42,
    mapY: 34,
  },
  {
    id: "astral",
    name: "Астральный пик",
    blurb: "Над облаками — осколки мифа.",
    accent: "#fbbf24",
    mapX: 54,
    mapY: 18,
  },
  {
    id: "crimson",
    name: "Кровавый каньон",
    blurb: "Кость, верёвка и багровая пыль.",
    accent: "#fb7185",
    mapX: 64,
    mapY: 52,
  },
  {
    id: "brine",
    name: "Соляная бездна",
    blurb: "Чёрная вода, где тонут колокола.",
    accent: "#22d3ee",
    mapX: 74,
    mapY: 72,
  },
  {
    id: "night",
    name: "Ночной рифт",
    blurb: "Город, которого нет днём.",
    accent: "#818cf8",
    mapX: 84,
    mapY: 36,
  },
  {
    id: "sovereign",
    name: "Престол осколка",
    blurb: "Конец охоты. Сердце Пустоты.",
    accent: "#e7e5e4",
    mapX: 93,
    mapY: 14,
  },
  {
    id: "unmade",
    name: "Несотворённое",
    blurb: "За концом охоты. Сюда идут только с полной коллекцией.",
    accent: "#f43f5e",
    mapX: 97,
    mapY: 60,
  },
];

const THREAT: Record<LocationKind, number> = LOCATION_THREAT;

function loc(
  partial: Omit<LocationDef, "threat" | "kind" | "accent"> & {
    kind?: LocationKind;
    accent?: string;
    threat?: number;
  },
): LocationDef {
  const kind = partial.kind ?? "normal";
  const region = REGIONS.find((r) => r.id === partial.regionId)!;
  return {
    ...partial,
    kind,
    accent: partial.accent ?? region.accent,
    threat: partial.threat ?? THREAT[kind],
  };
}

export const LOCATIONS: LocationDef[] = [
  loc({
    id: "woods",
    name: "Шепчущий лес",
    blurb: "Туманные чащи, где осколки поют в корнях.",
    minLevel: 1,
    accent: "#34d399",
    mobNames: ["Моховой волк", "Шипастый древень", "Туманный дух", "Лесной паук"],
    bossName: "Хранитель Рощи",
    baseLevel: 1,
    regionId: "whispering",
  }),
  loc({
    id: "dusk-trail",
    name: "Сумеречная тропа",
    blurb: "Хвоя глушит шаг. Здесь учат не дышать.",
    minLevel: 3,
    mobNames: ["Сумеречная рысь", "Ивовый призрак", "Моховой стрелок", "Ночной кабан"],
    bossName: "Хозяйка Тропы",
    baseLevel: 3,
    regionId: "whispering",
  }),
  loc({
    id: "wolf-den",
    name: "Логово вожака",
    blurb: "Стая помнит запах крови. Вожак не прощает гостей.",
    minLevel: 5,
    kind: "elite",
    mobNames: ["Серый вожак", "Клыкастый страж", "Рваный шакал", "Лесная гарпия"],
    bossName: "Вожак Пепла",
    baseLevel: 5,
    regionId: "whispering",
  }),
  loc({
    id: "caves",
    name: "Кристальные пещеры",
    blurb: "Жилы эссенции пульсируют в каменных залах.",
    minLevel: 6,
    accent: "#60a5fa",
    mobNames: ["Кристальный слизень", "Пещерный голем", "Эхо-летучая мышь", "Рунный краб"],
    bossName: "Геод-Титан",
    baseLevel: 7,
    regionId: "crystal",
  }),
  loc({
    id: "quartz-run",
    name: "Жила кварца",
    blurb: "Свет режет глаза. Камень поёт фальшиво.",
    minLevel: 8,
    mobNames: ["Кварцевый ползун", "Соляной страж", "Светляк-нож", "Жильный клещ"],
    bossName: "Мать Кварца",
    baseLevel: 8,
    regionId: "crystal",
  }),
  loc({
    id: "geode-throne",
    name: "Геод-трон",
    blurb: "Первые врата. Титан не спит — он слушает шаги.",
    minLevel: 10,
    kind: "boss",
    mobNames: ["Страж геода", "Осколочный рыцарь", "Рунный жрец", "Кристальная гидра"],
    bossName: "Геод-Владыка",
    baseLevel: 10,
    regionId: "crystal",
  }),
  loc({
    id: "wastes",
    name: "Тлеющие пустоши",
    blurb: "Пепел и золото войны над трещинами мира.",
    minLevel: 12,
    accent: "#f97316",
    mobNames: ["Угольный шакал", "Шлаковый элементаль", "Пепельный лучник", "Магма-жук"],
    bossName: "Повелитель Шлака",
    baseLevel: 13,
    regionId: "ash",
  }),
  loc({
    id: "slag-dunes",
    name: "Шлаковые дюны",
    blurb: "Песок из стекла. Под ним — костяные ружья.",
    minLevel: 14,
    mobNames: ["Стеклянный скарабей", "Дюнный стрелок", "Шлаковый волк", "Жар-ящер"],
    bossName: "Хан Дюн",
    baseLevel: 14,
    regionId: "ash",
  }),
  loc({
    id: "ember-reef",
    name: "Костяной риф",
    blurb: "Рёбра титанов торчат из магмы, как причал.",
    minLevel: 16,
    kind: "elite",
    mobNames: ["Костяной краб", "Угольный жрец", "Магма-ящер", "Пепельная гарпия"],
    bossName: "Рифовый Палач",
    baseLevel: 16,
    regionId: "ash",
  }),
  loc({
    id: "sanctum",
    name: "Святилище Пустоты",
    blurb: "Забытый культ копит осколки реальности.",
    minLevel: 18,
    accent: "#a855f7",
    mobNames: ["Аколит Пустоты", "Рванный страж", "Теневой змей", "Зеркальный фантом"],
    bossName: "Архивариус Пустоты",
    baseLevel: 19,
    regionId: "cult",
  }),
  loc({
    id: "mirror-nave",
    name: "Зеркальный неф",
    blurb: "Каждый шаг — чужое отражение. Врата двадцатого.",
    minLevel: 20,
    kind: "boss",
    mobNames: ["Двойник-клинок", "Стеклянный аколит", "Эхо-палач", "Немой хор"],
    bossName: "Первый Архивариус",
    baseLevel: 20,
    regionId: "cult",
  }),
  loc({
    id: "serpent-pit",
    name: "Яма змея",
    blurb: "Яд капает с потолка. Культ кормит бездну.",
    minLevel: 22,
    kind: "elite",
    mobNames: ["Теневой змей", "Ямный жрец", "Кольчатый палач", "Слепой пророк"],
    bossName: "Мать Колец",
    baseLevel: 22,
    regionId: "cult",
  }),
  loc({
    id: "peak",
    name: "Астральный пик",
    blurb: "Над облаками — жилы мифической эссенции.",
    minLevel: 25,
    accent: "#fbbf24",
    mobNames: ["Астральный страж", "Звёздный варг", "Небесный клинок", "Осколочный феникс"],
    bossName: "Соверен Осколков",
    baseLevel: 26,
    regionId: "astral",
  }),
  loc({
    id: "cloud-ledge",
    name: "Облачный уступ",
    blurb: "Ветер сдирает имена. Мост виден только убийцам.",
    minLevel: 28,
    mobNames: ["Уступный варг", "Облачный лучник", "Перьевой дух", "Ветряной клинок"],
    bossName: "Страж Уступа",
    baseLevel: 28,
    regionId: "astral",
  }),
  loc({
    id: "storm-blade",
    name: "Клинок бури",
    blurb: "Небо режет само себя. Врата тридцатого.",
    minLevel: 30,
    kind: "boss",
    mobNames: ["Буревой рыцарь", "Громовой варг", "Осколок молнии", "Небесный палач"],
    bossName: "Клинок Бури",
    baseLevel: 30,
    regionId: "astral",
  }),
  loc({
    id: "phoenix-plume",
    name: "Перо феникса",
    blurb: "Пепел не холодный. Здесь горят клятвы.",
    minLevel: 33,
    kind: "elite",
    mobNames: ["Пепельный феникс", "Жар-страж", "Искровой клинок", "Звёздный охотник"],
    bossName: "Первый Феникс",
    baseLevel: 33,
    regionId: "astral",
  }),
  loc({
    id: "blood-ford",
    name: "Кровавый брод",
    blurb: "Река помнит переправы. Брод берёт пошлину.",
    minLevel: 36,
    mobNames: ["Бродный упырь", "Иловый стрелок", "Ржавый страж", "Кровавый сом"],
    bossName: "Мытарь Брода",
    baseLevel: 36,
    regionId: "crimson",
  }),
  loc({
    id: "bone-gate",
    name: "Костяные врата",
    blurb: "Черепа в кладке. Врата сорокового не открывают — они кусают.",
    minLevel: 40,
    kind: "boss",
    mobNames: ["Костяной страж", "Вратный палач", "Череп-глашатай", "Пыльный рыцарь"],
    bossName: "Привратник Кости",
    baseLevel: 40,
    regionId: "crimson",
  }),
  loc({
    id: "hangman-cliff",
    name: "Утёс висельника",
    blurb: "Верёвки поют на ветру. Шаг — и имя становится петлёй.",
    minLevel: 43,
    mobNames: ["Висельный дух", "Утёсный стрелок", "Палач каньона", "Ворон-жнец"],
    bossName: "Первый Висельник",
    baseLevel: 43,
    regionId: "crimson",
  }),
  loc({
    id: "crimson-shaft",
    name: "Багровая штольня",
    blurb: "Руда пахнет железом крови. Гильдии сюда не ходят.",
    minLevel: 46,
    kind: "elite",
    mobNames: ["Штольневый голем", "Кровавый клещ", "Ржавый шахтёр", "Багровый элементаль"],
    bossName: "Надсмотрщик Жилы",
    baseLevel: 46,
    regionId: "crimson",
  }),
  loc({
    id: "butcher-court",
    name: "Двор мясника",
    blurb: "Крючья и короны. Врата пятидесятого.",
    minLevel: 50,
    kind: "boss",
    mobNames: ["Дворовый мясник", "Крюк-страж", "Багровый жрец", "Костяной бык"],
    bossName: "Мясник Каньона",
    baseLevel: 50,
    regionId: "crimson",
  }),
  loc({
    id: "salt-descent",
    name: "Соляной спуск",
    blurb: "Ступени белеют, как рёбра. Внизу — тишина.",
    minLevel: 53,
    mobNames: ["Соляной краб", "Белый утопленник", "Спусковой страж", "Кристалл-пиявки"],
    bossName: "Хранитель Спуска",
    baseLevel: 53,
    regionId: "brine",
  }),
  loc({
    id: "silent-wharf",
    name: "Тихая пристань",
    blurb: "Корабли без вёсел. Экипаж не моргает.",
    minLevel: 56,
    kind: "elite",
    mobNames: ["Пристанский мертвец", "Соляной боцман", "Немой грузчик", "Туманный лоцман"],
    bossName: "Капитан Тишины",
    baseLevel: 56,
    regionId: "brine",
  }),
  loc({
    id: "drowned-bell",
    name: "Утопленный колокол",
    blurb: "Звон идёт из глубины. Врата шестидесятого.",
    minLevel: 60,
    kind: "boss",
    mobNames: ["Звонарь бездны", "Мокрый палач", "Соляной хор", "Якорный голем"],
    bossName: "Колокол Бездны",
    baseLevel: 60,
    regionId: "brine",
  }),
  loc({
    id: "leviathan-maw",
    name: "Пасть левиафана",
    blurb: "Зубы размером с башни. Между ними — тропа.",
    minLevel: 65,
    kind: "elite",
    mobNames: ["Зубной страж", "Глоточный уж", "Иловый титан", "Печёночный слизень"],
    bossName: "Левиафан Соли",
    baseLevel: 65,
    regionId: "brine",
  }),
  loc({
    id: "still-heart",
    name: "Недвижное сердце",
    blurb: "Вода не качает. Здесь кончается дыхание моря. Врата семидесятого.",
    minLevel: 70,
    kind: "boss",
    mobNames: ["Страж сердца", "Соляной серафим", "Недвижный рыцарь", "Глубинный глаз"],
    bossName: "Сердце Бездны",
    baseLevel: 70,
    regionId: "brine",
  }),
  loc({
    id: "veil-tear",
    name: "Разрыв вуали",
    blurb: "Ночь протекает в день. Шов реальности держит нитка.",
    minLevel: 73,
    mobNames: ["Рваный фантом", "Шовный страж", "Ночной клинок", "Эхо-вор"],
    bossName: "Портниха Вуали",
    baseLevel: 73,
    regionId: "night",
  }),
  loc({
    id: "echo-city",
    name: "Город эха",
    blurb: "Улицы повторяют убийства. Карты врут специально.",
    minLevel: 76,
    kind: "elite",
    mobNames: ["Эхо-дуэлянт", "Фонарный призрак", "Крышный стрелок", "Двойник-страж"],
    bossName: "Бургомистр Эха",
    baseLevel: 76,
    regionId: "night",
  }),
  loc({
    id: "night-spire",
    name: "Шпиль ночи",
    blurb: "Колокольня без часов. Врата восьмидесятого.",
    minLevel: 80,
    kind: "boss",
    mobNames: ["Шпильный страж", "Ночной серафим", "Колокольный палач", "Лунный рыцарь"],
    bossName: "Хранитель Шпиля",
    baseLevel: 80,
    regionId: "night",
  }),
  loc({
    id: "twin-moons",
    name: "Двойная луна",
    blurb: "Два света — две тени. Ударь не ту, что ближе.",
    minLevel: 85,
    kind: "elite",
    mobNames: ["Лунный близнец", "Теневой близнец", "Серебряный клинок", "Затменный варг"],
    bossName: "Сёстры Луны",
    baseLevel: 85,
    regionId: "night",
  }),
  loc({
    id: "void-gate",
    name: "Врата Пустоты",
    blurb: "За ними нет карты. Врата девяностого.",
    minLevel: 90,
    kind: "boss",
    mobNames: ["Пустотный страж", "Безликий рыцарь", "Рифтовый жрец", "Око-часовой"],
    bossName: "Привратник Пустоты",
    baseLevel: 90,
    regionId: "night",
  }),
  loc({
    id: "shard-steps",
    name: "Ступени осколка",
    blurb: "Каждая ступень — чужая жизнь. Престол уже виден.",
    minLevel: 93,
    mobNames: ["Ступенный страж", "Осколочный клинок", "Мифический варг", "Пепельный серафим"],
    bossName: "Хранитель Ступеней",
    baseLevel: 93,
    regionId: "sovereign",
  }),
  loc({
    id: "sovereign-court",
    name: "Двор Соверена",
    blurb: "Короны без голов. Элита конца света.",
    minLevel: 96,
    kind: "elite",
    mobNames: ["Придворный палач", "Зеркальный герцог", "Осколочный лев", "Немой герольд"],
    bossName: "Первый Соверен",
    baseLevel: 96,
    regionId: "sovereign",
  }),
  loc({
    id: "void-heart",
    name: "Сердце Пустоты",
    blurb: "Конец охоты. Здесь бьётся то, что нельзя убить дважды.",
    minLevel: 100,
    kind: "boss",
    mobNames: ["Осколок конца", "Пустотный серафим", "Последний клинок", "Тень Соверена"],
    bossName: "Сердце Пустоты",
    baseLevel: 100,
    regionId: "sovereign",
  }),
  /**
   * Unmade endgame. Both share the level-100 floor with «Сердце Пустоты».
   * Progression here is BM-gated (bmScale / bmGated), not another level band —
   * keeping minLevel at 95 previously made recommendedLocationId skip the
   * sovereign arc for any strong level-95 character.
   *
   * Scales sit on the *invested* expectedBm curve: abyss ≈ blessed epic / soft
   * mythic, throne ≈ mythic +15 + gems. Do not re-inflate these if the base
   * curve already models enhance — old 3.3/4.2 assumed uncommon+0.
   */
  loc({
    id: "abyss-rift",
    name: "Разлом Изнанки",
    blurb: "Мир порвался вдоль шва. То, что лезет наружу, старше охоты.",
    minLevel: 100,
    kind: "elite",
    threat: 1.55,
    bmScale: 1.75,
    rarityBias: 0.45,
    bmGated: true,
    mobNames: ["Изнаночный жнец", "Шовный титан", "Нерождённый клинок", "Пожиратель имён"],
    bossName: "Первый Шов",
    baseLevel: 104,
    regionId: "unmade",
  }),
  loc({
    id: "throne-eclipse",
    name: "Затмение Престола",
    blurb: "Трон под чёрным солнцем. Здесь взвешивают, а не убивают.",
    minLevel: 100,
    kind: "boss",
    threat: 1.85,
    bmScale: 2.35,
    rarityBias: 0.9,
    bmGated: true,
    mobNames: ["Чёрный герольд", "Весовщик судьбы", "Корона затмения", "Тень без хозяина"],
    bossName: "Затмённый Соверен",
    baseLevel: 112,
    regionId: "unmade",
  }),
];

export const LOCATION_BY_ID: Record<string, LocationDef> = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l]),
);

export const REGION_BY_ID: Record<string, LocationRegion> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);

export function locationsForRegion(regionId: string) {
  return LOCATIONS.filter((l) => l.regionId === regionId);
}

export function regionForLocation(locationId: string) {
  const locDef = LOCATION_BY_ID[locationId];
  if (!locDef) return REGIONS[0]!;
  return REGION_BY_ID[locDef.regionId] ?? REGIONS[0]!;
}

export function locationRecommendedBm(
  location: Pick<LocationDef, "baseLevel" | "kind" | "bmScale">,
) {
  return Math.round(
    spotRequiredBm(location.baseLevel, "commons", location.kind) * (location.bmScale ?? 1),
  );
}

/** Hard entry floor. Zero for every classic zone, which stays level-gated only. */
export function locationEntryBm(location: Pick<LocationDef, "baseLevel" | "kind" | "bmScale" | "bmGated">) {
  if (!location.bmGated) return 0;
  return locationRecommendedBm(location);
}

/**
 * Deepest zone the player can farm right now.
 *
 * Classic map: pick by highest reachable minLevel (monotonic with the list).
 * Unmade (abyss / throne) share minLevel 100 with void-heart — among equal
 * floors, prefer the highest recommended BM the player's powerScore still
 * clears at 0.9×. Level alone never opens Unmade early.
 */
export function recommendedLocationId(level: number, powerScore?: number) {
  let best = LOCATIONS[0]!;
  for (const l of LOCATIONS) {
    if (l.minLevel > level) continue;
    if (powerScore != null && powerScore < locationRecommendedBm(l) * 0.9) continue;
    if (l.minLevel > best.minLevel) {
      best = l;
      continue;
    }
    if (l.minLevel === best.minLevel && locationRecommendedBm(l) >= locationRecommendedBm(best)) {
      best = l;
    }
  }
  return best.id;
}
