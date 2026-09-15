/**
 * Endgame audit: what blessing and gems do to БМ, and whether the two new
 * locations are actually gated by it. npx tsx scripts/gems.ts
 */
import { LOCATIONS, locationRecommendedBm } from "../src/lib/game/constants";
import { createGem, GEM_BUDGET, GEM_RANK_LABEL, GEM_RANKS } from "../src/lib/game/gems";
import { statsOf } from "../src/lib/game/formulas";
import { FARM_SPOTS } from "../src/lib/game/spots";
import { bmFit, BM_FIT_LABEL } from "../src/lib/game/balance";
import { EQUIP_SLOTS, type GameData, type GemRank } from "../src/lib/game/types";
import { build, table } from "./harness";

const SPLIT = { strength: 0.5, agility: 0.3, endurance: 0.15, intelligence: 0.05 };

/**
 * Every row is the same rolled kit with one thing changed. Re-rolling gear per
 * row swings BM by 20% on affix luck alone, which drowns out the effect being
 * measured.
 */
const REFERENCE: GameData = build({
  level: 100,
  cls: "warrior",
  split: SPLIT,
  rarity: "mythic",
  enhance: 15,
  ilvl: 100,
});

function kit(opts: { blessed?: boolean; gem?: GemRank; sockets?: number } = {}) {
  const state: GameData = structuredClone(REFERENCE);
  for (const slot of EQUIP_SLOTS) {
    const item = state.equipment[slot];
    if (!item) continue;
    if (opts.blessed) item.blessed = true;
    if (opts.gem && opts.sockets) {
      item.sockets = Array.from({ length: opts.sockets }, () => createGem(opts.gem!));
    }
  }
  return statsOf(state).powerScore;
}

const base = kit();

table(
  "Камни: бюджет и вклад",
  GEM_RANKS.map((rank) => rank),
  [
    { h: "грейд", w: 14, f: (r) => GEM_RANK_LABEL[r] },
    { h: "юнитов", w: 8, f: (r) => GEM_BUDGET[r].units },
    { h: "статов", w: 7, f: (r) => GEM_BUDGET[r].stats },
    { h: "пример", w: 44, f: (r) => createGem(r).affixes.map((a) => `${a.stat} ${a.value}`).join(", ") },
  ],
);

const rows: { name: string; bm: number }[] = [
  { name: "mythic +15", bm: base },
  { name: "mythic +15 блеснут", bm: kit({ blessed: true }) },
];
for (const rank of GEM_RANKS) {
  for (const sockets of [1, 3]) {
    rows.push({
      name: `блеснут + ${sockets * 8}× ${GEM_RANK_LABEL[rank]}`,
      bm: kit({ blessed: true, gem: rank, sockets }),
    });
  }
}

table("БМ на 100 уровне (эталон mythic +15 = 100%)", rows, [
  { h: "сборка", w: 34, f: (r) => r.name },
  { h: "БМ", w: 9, f: (r) => r.bm },
  { h: "к базе", w: 8, f: (r) => `${((r.bm / base - 1) * 100).toFixed(0)}%` },
]);

const blessedEpic = kit({ blessed: true, gem: "epic", sockets: 3 });
const endgame = LOCATIONS.filter((l) => l.bmScale);
table(
  "Новые локации",
  endgame.flatMap((l) =>
    FARM_SPOTS.filter((s) => s.locationId === l.id)
      .filter((s, i, arr) => arr.findIndex((x) => x.tier === s.tier) === i)
      .map((s) => ({ loc: l, spot: s })),
  ),
  [
    { h: "локация", w: 20, f: (r) => r.loc.name },
    { h: "тир", w: 8, f: (r) => r.spot.tier },
    { h: "нужно БМ", w: 10, f: (r) => r.spot.requiredBm },
    { h: "mythic+15", w: 10, f: (r) => BM_FIT_LABEL[bmFit(base, r.spot.requiredBm)] },
    {
      h: "блеснут+3×фиол",
      w: 15,
      f: (r) => BM_FIT_LABEL[bmFit(blessedEpic, r.spot.requiredBm)],
    },
  ],
);

table(
  "Вход в локации (порог БМ)",
  LOCATIONS.slice(-5),
  [
    { h: "локация", w: 22, f: (l) => l.name },
    { h: "minLv", w: 6, f: (l) => l.minLevel },
    { h: "мобLv", w: 6, f: (l) => l.baseLevel },
    { h: "threat", w: 7, f: (l) => l.threat },
    { h: "реком. БМ", w: 10, f: (l) => locationRecommendedBm(l) },
  ],
);
