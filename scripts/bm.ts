/** Fast check of invested expectedBm() vs live powerScore. npm run balance:bm */
import { build, statsOf } from "./harness";
import { expectedBm, investedGearProfile, spotRequiredBm } from "../src/lib/game/balance";
import { dungeonRecommendedBm, DUNGEON_HALLS } from "../src/lib/game/dungeons";
import { locationRecommendedBm, LOCATIONS } from "../src/lib/game/locations";
import type { CoreStat } from "../src/lib/game/types";

const BALANCED: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const RUNS = 10;

function avgInvested(level: number) {
  const { rarity, enhance } = investedGearProfile(level);
  let s = 0;
  for (let i = 0; i < RUNS; i++) {
    s += statsOf(build({ level, cls: "warrior", split: BALANCED, rarity, enhance })).powerScore;
  }
  return s / RUNS;
}

console.log(" lvl  profile     expected  liveInv  inv/exp  openWorld  dungGold  L100/L40");
console.log("-".repeat(88));
const at40 = { exp: 0, open: 0, dung: 0 };
for (const level of [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
  const { rarity, enhance } = investedGearProfile(level);
  const exp = expectedBm(level);
  const live = avgInvested(level);
  const loc = [...LOCATIONS]
    .filter((l) => l.minLevel <= level && !l.bmGated)
    .sort((a, b) => b.minLevel - a.minLevel)[0]!;
  const hall =
    DUNGEON_HALLS.find((h) => h.type === "gold" && h.minLevel === level) ??
    DUNGEON_HALLS.find((h) => h.type === "gold" && h.minLevel <= level)!;
  const open = locationRecommendedBm(loc);
  const dung = dungeonRecommendedBm(hall);
  if (level === 40) {
    at40.exp = exp;
    at40.open = open;
    at40.dung = dung;
  }
  const vs40 =
    level === 40
      ? "1.00"
      : at40.exp > 0
        ? (exp / at40.exp).toFixed(2)
        : "-";
  console.log(
    [
      String(level).padStart(4),
      `${rarity}+${enhance}`.padEnd(11),
      String(Math.round(exp)).padStart(9),
      String(Math.round(live)).padStart(8),
      (live / exp).toFixed(2).padStart(8),
      String(open).padStart(9),
      String(dung).padStart(8),
      vs40.padStart(8),
    ].join(" "),
  );
}
console.log(
  `\nspot commons L40=${spotRequiredBm(40, "commons")}  L100=${spotRequiredBm(100, "commons")}  ratio=${(
    spotRequiredBm(100, "commons") / spotRequiredBm(40, "commons")
  ).toFixed(2)}`,
);
