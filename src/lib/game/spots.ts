import { occupantBmBudget, SPOT_BALANCE, spotRequiredBm } from "./balance";
import { LOCATIONS, NPC_GUILDS, NPC_HUNTERS } from "./constants";
import type { LocationKind } from "./locations";
import { irand, pick, uid } from "./formulas";
import type { FarmSpotState, SpotOccupant, SpotTier } from "./types";


export const FARM_COLS = 4;
export const FARM_ROWS = 3;

export const SPOT_TIER_LABEL: Record<SpotTier, string> = {
  commons: "Обычный",
  rich: "Богатый",
  hot: "Топ-спот",
  apex: "Апекс",
};

export const SPOT_TIER_COLOR: Record<SpotTier, string> = {
  commons: "#71717a",
  rich: "#38bdf8",
  hot: "#c084fc",
  apex: "#fbbf24",
};

export interface FarmSpotDef {
  id: string;
  locationId: string;
  row: number;
  col: number;
  name: string;
  tier: SpotTier;
  dropChanceMult: number;
  rarityBias: number;
  xpMult: number;
  goldMult: number;
  danger: number;
  /** Force a trash drop after this many lootless kills on the spot. */
  pityKills: number;
  /** Recommended combat power to farm this square comfortably. */
  requiredBm: number;
}

const TIER_GRID: SpotTier[][] = [
  ["commons", "commons", "rich", "hot"],
  ["commons", "rich", "hot", "apex"],
  ["commons", "commons", "rich", "hot"],
];

const ELITE_TIER_GRID: SpotTier[][] = [
  ["commons", "rich", "hot", "hot"],
  ["rich", "hot", "hot", "apex"],
  ["commons", "rich", "hot", "apex"],
];

const BOSS_TIER_GRID: SpotTier[][] = [
  ["rich", "hot", "hot", "apex"],
  ["rich", "hot", "apex", "apex"],
  ["hot", "hot", "apex", "apex"],
];

function gridForKind(kind: LocationKind) {
  if (kind === "boss") return BOSS_TIER_GRID;
  if (kind === "elite") return ELITE_TIER_GRID;
  return TIER_GRID;
}

function g(
  a: [string, string, string, string],
  b: [string, string, string, string],
  c: [string, string, string, string],
): string[][] {
  return [a, b, c];
}

const TIER_MODS = SPOT_BALANCE;

const SPOT_NAMES: Record<string, string[][]> = {
  woods: [
    ["Тропа", "Ручей", "Грибная чаща", "Логово волка"],
    ["Поляна", "Корни древня", "Туманный яр", "Сердце рощи"],
    ["Опушка", "Пень шамана", "Паутина", "Алтарь мха"],
  ],
  caves: [
    ["Вход", "Капеж", "Жила кварца", "Гнездо летучих"],
    ["Галерея", "Синий грот", "Рунный зал", "Геод-трон"],
    ["Обвал", "Соляной ход", "Клешня краба", "Зеркало жилы"],
  ],
  wastes: [
    ["Пепел", "Шлаковый вал", "Угольная яма", "Башня лучников"],
    ["Тропа жара", "Магма-трещина", "Костяной риф", "Горнило"],
    ["Дюны", "Окалина", "Гнездо жуков", "Трон шлака"],
  ],
  sanctum: [
    ["Двор", "Клуатр", "Крипта аколитов", "Зеркальный неф"],
    ["Коридор эха", "Библиотека", "Яма змея", "Престол архива"],
    ["Склеп", "Рваный ход", "Часовня тени", "Око Пустоты"],
  ],
  peak: [
    ["Тропа ветра", "Облачный уступ", "Гнездо варга", "Небесный двор"],
    ["Мост", "Звёздная площадка", "Клинок бури", "Престол осколка"],
    ["Склон", "Перо феникса", "Астральная щель", "Корона пика"],
  ],
  "dusk-trail": g(
    ["Сумрак", "Хвоя", "Иней", "След рыси"],
    ["Мох", "Капкан", "Лунный пруд", "Ива"],
    ["Опад", "Нора", "Тень тропы", "Глаз рощи"],
  ),
  "wolf-den": g(
    ["Вход в логово", "Костяной двор", "Вой", "Клыковая яма"],
    ["Логово стаи", "Рваный мех", "След вожака", "Кровавая поляна"],
    ["Нора щенков", "Камень стаи", "Падаль", "Трон вожака"],
  ),
  "quartz-run": g(
    ["Скол", "Синий ход", "Капеж кварца", "Острый свод"],
    ["Жила", "Светляки", "Соляной бок", "Рунный скол"],
    ["Обвал пыли", "Тихий грот", "Клешня", "Сердце жилы"],
  ),
  "geode-throne": g(
    ["Преддверие", "Грань геода", "Стража граней", "Зеркало грани"],
    ["Рунный круг", "Тронный скол", "Гидра-щель", "Корона кристалла"],
    ["Жертвенник", "Пустой трон", "Око титана", "Сердце геода"],
  ),
  "slag-dunes": g(
    ["Стекло", "Бархан", "Костяное ружьё", "Жаркий скат"],
    ["Тропа дюн", "Скарабей", "Шлаковый гребень", "Стеклянный оазис"],
    ["Пепел ветра", "Ящерник", "Чёрное стекло", "Ханский холм"],
  ),
  "ember-reef": g(
    ["Ребро", "Магма-причал", "Угольная бухта", "Костяной крюк"],
    ["Риф жара", "Гнездо гарпии", "Трещина печи", "Пасть рифа"],
    ["Шлак-вода", "Жерло", "Кость титана", "Горнило рифа"],
  ),
  "mirror-nave": g(
    ["Притвор", "Отражение", "Немой ряд", "Стеклянный неф"],
    ["Двойник", "Хор эха", "Зеркальный пол", "Арка лжи"],
    ["Исповедальня", "Разбитый лик", "Тень алтаря", "Первый архив"],
  ),
  "serpent-pit": g(
    ["Край ямы", "Кольца", "Яд с потолка", "Слепой ход"],
    ["Сброс кожи", "Жертвенный жёлоб", "Шипение", "Гнездо матери"],
    ["Костяной мост", "Ямный жрец", "Тёмная вода", "Сердце змея"],
  ),
  "cloud-ledge": g(
    ["Тропа ветра", "Уступ", "Перо", "Скрытый мост"],
    ["Гнездо варга", "Облачный щит", "Клинок сквозняка", "Дозор"],
    ["Склон имени", "Пустой якорь", "Разрыв тучи", "Стража уступа"],
  ),
  "storm-blade": g(
    ["Лезвие неба", "Гром", "Осколок молнии", "Буревой двор"],
    ["Мост искр", "Гнездо бури", "Палач облаков", "Корона молнии"],
    ["Расселина", "Громовой трон", "Небесная кровь", "Клинок врат"],
  ),
  "phoenix-plume": g(
    ["Пепел клятвы", "Жар", "Искровая тропа", "Гнездо пера"],
    ["Крыло", "Стража жара", "Звёздный пепел", "Костёр клятв"],
    ["Падение пера", "Огненная щель", "Пепельный двор", "Первый костёр"],
  ),
  "blood-ford": g(
    ["Брод", "Ил", "Ржавая свая", "Пошлина"],
    ["Кровавая отмель", "Упырий камыш", "Сом-яма", "Мытня"],
    ["Топь", "Костяной мосток", "Ржавый щит", "Сердце брода"],
  ),
  "bone-gate": g(
    ["Предвратье", "Череп в кладке", "Пыльный ров", "Клык створки"],
    ["Костяная арка", "Стража врат", "Глашатай", "Пасть двери"],
    ["Костяной двор", "Цепь", "Пыльный трон", "Привратник"],
  ),
  "hangman-cliff": g(
    ["Тропа верёвок", "Утёс", "Петля", "Воронье"],
    ["Висельный двор", "Стрелковый карниз", "Имя на ветру", "Крюк"],
    ["Обрыв", "Палач каньона", "Пустая петля", "Первый висельник"],
  ),
  "crimson-shaft": g(
    ["Штольня", "Багровая пыль", "Ржавый рельс", "Клещ"],
    ["Жила крови", "Надсмотр", "Големный забой", "Красный грот"],
    ["Обвал руды", "Железный вкус", "Теневой штрек", "Сердце штольни"],
  ),
  "butcher-court": g(
    ["Крюк", "Двор", "Корона без головы", "Жертвенный стол"],
    ["Мясницкая", "Багровый жрец", "Костяной бык", "Цепь крючьев"],
    ["Сток крови", "Трон мясника", "Нож врат", "Сердце двора"],
  ),
  "salt-descent": g(
    ["Белая ступень", "Соль", "Рёбра спуска", "Капеж"],
    ["Тихий пролёт", "Крабий ход", "Утопленный след", "Соляной щит"],
    ["Нижняя площадка", "Пиявки", "Белый обвал", "Стража спуска"],
  ),
  "silent-wharf": g(
    ["Причал", "Без вёсел", "Туманный бакен", "Немой груз"],
    ["Палуба тишины", "Боцманская", "Якорь соли", "Лоцманский огонь"],
    ["Трюм", "Мокрый канат", "Пустой кубрик", "Капитанский мостик"],
  ),
  "drowned-bell": g(
    ["Звон", "Мокрый неф", "Якорный двор", "Соляной хор"],
    ["Колокольня бездны", "Палач волны", "Иловый престол", "Язык колокола"],
    ["Глубина", "Мокрый трон", "Разрыв звона", "Сердце колокола"],
  ),
  "leviathan-maw": g(
    ["Зуб", "Десна", "Между клыков", "Глотка"],
    ["Тропа во рту", "Иловый титан", "Печёночный зал", "Уж в складке"],
    ["Корень зуба", "Чёрная слюна", "Пасть-двор", "Сердце пасти"],
  ),
  "still-heart": g(
    ["Недвижная вода", "Тихий двор", "Глубинный глаз", "Соляной серафим"],
    ["Камера сердца", "Недвижный рыцарь", "Пульс без удара", "Белая кровь"],
    ["Предсердие", "Клапан", "Трон бездны", "Сердце моря"],
  ),
  "veil-tear": g(
    ["Шов", "Рваная ночь", "Нитка реальности", "Клинок вуали"],
    ["Разрыв", "Эхо-вор", "Фантомный двор", "Портновский стол"],
    ["Изнанка", "Скрытый шов", "Ночной край", "Игла портнихи"],
  ),
  "echo-city": g(
    ["Переулок эха", "Фонарь", "Крыша", "Карта-ложь"],
    ["Дуэль на эхе", "Двойник у стены", "Стрелковая кровля", "Пустая площадь"],
    ["Канализационный шёпот", "Бургомистрский двор", "Зеркальная улица", "Сердце города"],
  ),
  "night-spire": g(
    ["Подъём", "Без часов", "Лунный ярус", "Колокольный двор"],
    ["Шпильный страж", "Ночной серафим", "Палач яруса", "Лунный рыцарь"],
    ["Остриё", "Пустые часы", "Корона шпиля", "Хранитель ночи"],
  ),
  "twin-moons": g(
    ["Левая луна", "Правая луна", "Две тени", "Серебряный двор"],
    ["Близнец света", "Близнец тьмы", "Затмение", "Варг луны"],
    ["Между лунами", "Ложный блик", "Сестринский трон", "Двойной удар"],
  ),
  "void-gate": g(
    ["Преддверие пустоты", "Без карты", "Безликий двор", "Око-часовой"],
    ["Рифтовый жрец", "Пустотный страж", "Чёрная створка", "Рыцарь без лица"],
    ["Порог", "Нет пути назад", "Печать врат", "Привратник Пустоты"],
  ),
  "shard-steps": g(
    ["Первая ступень", "Чужая жизнь", "Осколочный край", "Мифический след"],
    ["Лестница клятв", "Клинок ступени", "Пепельный серафим", "Дозор престола"],
    ["Предпоследняя", "Вид на двор", "Стража ступеней", "Порог короны"],
  ),
  "sovereign-court": g(
    ["Герольды", "Корона без головы", "Зеркальный герцог", "Львиный двор"],
    ["Придворный палач", "Немой бал", "Осколочный трон", "Зал клятв"],
    ["Галерея теней", "Первый соверен", "Корона элиты", "Сердце двора"],
  ),
  "void-heart": g(
    ["Последний двор", "Осколок конца", "Пустотный серафим", "Тень Соверена"],
    ["Клинок конца", "Нет второго удара", "Миф-рана", "Престол пустоты"],
    ["Изнанка мира", "Последнее имя", "Корона охоты", "Сердце Пустоты"],
  ),
  "abyss-rift": g(
    ["Край шва", "Рваная ткань", "Нерождённый ход", "Жнец изнанки"],
    ["Шовный титан", "Пожиратель имён", "Обратная сторона", "Игла разлома"],
    ["Тихий распор", "Кровь ткани", "Гнездо нерождённых", "Первый Шов"],
  ),
  "throne-eclipse": g(
    ["Ступень затмения", "Чёрное солнце", "Зал весов", "Герольдов ряд"],
    ["Весовщик судьбы", "Корона без света", "Тень без хозяина", "Престол затмения"],
    ["Последний вес", "Немой приговор", "Венец конца", "Затмённый Соверен"],
  ),
};

export const FARM_SPOTS: FarmSpotDef[] = LOCATIONS.flatMap((loc) => {
  const names = SPOT_NAMES[loc.id] ?? SPOT_NAMES.woods!;
  const grid = gridForKind(loc.kind);
  const spots: FarmSpotDef[] = [];
  for (let r = 0; r < FARM_ROWS; r++) {
    for (let c = 0; c < FARM_COLS; c++) {
      const tier = grid[r]![c]!;
      const mods = TIER_MODS[tier];
      spots.push({
        id: `${loc.id}-${r}-${c}`,
        locationId: loc.id,
        row: r,
        col: c,
        name: names[r]?.[c] ?? `Квадрат ${r + 1}-${c + 1}`,
        tier,
        ...mods,
        requiredBm: Math.round(
          spotRequiredBm(loc.baseLevel, tier, loc.kind) * (loc.bmScale ?? 1),
        ),
      });
    }
  }
  return spots;
});

export const FARM_SPOT_BY_ID: Record<string, FarmSpotDef> = Object.fromEntries(
  FARM_SPOTS.map((s) => [s.id, s]),
);

export const DEFAULT_SPOT_ID = "woods-2-0";

export function spotsForLocation(locationId: string) {
  return FARM_SPOTS.filter((s) => s.locationId === locationId);
}

export function occupantPower(
  zoneLevel: number,
  tier: SpotTier,
  kind: LocationKind = "normal",
  bmScale = 1,
) {
  const base = Math.round(occupantBmBudget(zoneLevel, tier, kind) * bmScale);
  const jitter = Math.max(8, Math.round(base * 0.035));
  return Math.max(1, base + irand(-jitter, jitter));
}

export function createFarmState(): Record<string, FarmSpotState> {
  const farm: Record<string, FarmSpotState> = {};
  for (const spot of FARM_SPOTS) {
    const loc = LOCATIONS.find((l) => l.id === spot.locationId)!;
    let occupant: SpotOccupant | null = null;
    const occupy =
      spot.tier === "apex" ||
      spot.tier === "hot" ||
      (spot.tier === "rich" && Math.random() < 0.45);
    if (occupy && spot.id !== DEFAULT_SPOT_ID) {
      occupant = {
        id: uid(),
        name: pick(NPC_HUNTERS),
        guild: pick(NPC_GUILDS),
        power: occupantPower(loc.baseLevel, spot.tier, loc.kind, loc.bmScale ?? 1),
        isPlayer: false,
      };
    }
    farm[spot.id] = { occupant };
  }
  return farm;
}

export function refillSpotIfAbandoned(
  farm: Record<string, FarmSpotState>,
  spotId: string,
) {
  const def = FARM_SPOT_BY_ID[spotId];
  if (!def) return;
  if (def.tier !== "hot" && def.tier !== "apex") {
    farm[spotId] = { occupant: null };
    return;
  }
  const loc = LOCATIONS.find((l) => l.id === def.locationId);
  if (!loc) return;
  farm[spotId] = {
    occupant: {
      id: uid(),
      name: pick(NPC_HUNTERS),
      guild: pick(NPC_GUILDS),
      power: occupantPower(loc.baseLevel, def.tier, loc.kind, loc.bmScale ?? 1),
      isPlayer: false,
    },
  };
}

export function vacatePlayerSpots(farm: Record<string, FarmSpotState>, exceptId?: string) {
  for (const [id, spot] of Object.entries(farm)) {
    if (id === exceptId) continue;
    if (!spot.occupant?.isPlayer) continue;
    const def = FARM_SPOT_BY_ID[id];
    if (def && (def.tier === "hot" || def.tier === "apex")) {
      refillSpotIfAbandoned(farm, id);
    } else {
      farm[id] = { occupant: null };
    }
  }
}

export function occupySpot(farm: Record<string, FarmSpotState>, spotId: string, occupant: SpotOccupant) {
  vacatePlayerSpots(farm, spotId);
  farm[spotId] = { occupant };
}

/** Merge newly added spots into an old save without touching existing occupants.
 *  NPC hunters are snapped onto the current BM curve so old saves don't keep inflated power. */
export function ensureFarmState(farm?: Record<string, FarmSpotState> | null) {
  const current = farm ?? {};
  const missing = FARM_SPOTS.some((spot) => !current[spot.id]);
  const next = missing ? { ...createFarmState(), ...current } : current;
  for (const spot of FARM_SPOTS) {
    const occ = next[spot.id]?.occupant;
    if (!occ || occ.isPlayer) continue;
    const loc = LOCATIONS.find((l) => l.id === spot.locationId);
    if (!loc) continue;
    const target = Math.round(
      occupantBmBudget(loc.baseLevel, spot.tier, loc.kind) * (loc.bmScale ?? 1),
    );
    if (Math.abs(occ.power - target) / Math.max(1, target) > 0.2) {
      occ.power = target;
    }
  }
  return next;
}
