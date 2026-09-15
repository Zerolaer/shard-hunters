/**
 * What content does a player of level L actually land on, and can they hurt it?
 *
 * Written to explain why level 100 on the *safest* tier was deadlier than apex:
 * the answer is what the location gate hands a max-level player, not the tier.
 */
import { LOCATIONS, LOCATION_BY_ID } from "../src/lib/game/locations";
import { monsterHp, monsterAttack, monsterLevelOf, expectedBm } from "../src/lib/game/balance";
import { statsOf } from "../src/lib/game/formulas";
import { build, bestLocationFor, pickSpot } from "./harness";

const LEVELS = (process.env.LEVELS ?? "16,40,60,80,90,100").split(",").map(Number);
const TIER = (process.env.TIER ?? "commons") as "commons" | "rich" | "hot" | "apex";
const FLOOR = Number(process.env.FLOOR ?? 3);

console.log(`куда попадает игрок · тир "${TIER}", этаж ${FLOOR}\n`);
console.log(" lvl        локация  баз.ур   ур.моба   разрыв       HP моба   атака   треб.БМ    БМ игрока   БМ%");
console.log("-".repeat(108));

for (const level of LEVELS) {
  // Exactly what the harness does, so this explains harness numbers.
  const locId = bestLocationFor(level, TIER);
  const loc = LOCATION_BY_ID[locId]!;
  const spot = pickSpot(locId, TIER);
  const mLevel = monsterLevelOf(loc.baseLevel, FLOOR, false);
  const hp = monsterHp(mLevel, FLOOR, false, spot.danger, 1);
  const atk = monsterAttack(mLevel, FLOOR, false, spot.danger, 1);
  const d = statsOf(build({ level, cls: "warrior", split: { strength: 50, agility: 30, endurance: 15, intelligence: 5 }, tier: TIER, floor: FLOOR }));
  const gap = mLevel - level;
  const req = spot.requiredBm ?? expectedBm(level);

  console.log(
    [
      String(level).padStart(4),
      loc.id.padStart(15),
      String(loc.baseLevel).padStart(8),
      String(mLevel).padStart(10),
      (gap > 0 ? `+${gap}` : String(gap)).padStart(9),
      hp.toLocaleString("ru-RU").padStart(14),
      String(atk).padStart(8),
      Math.round(req).toLocaleString("ru-RU").padStart(10),
      Math.round(d.powerScore).toLocaleString("ru-RU").padStart(13),
      `${((d.powerScore / req) * 100).toFixed(0)}%`.padStart(6),
      spot.tier !== TIER ? `  ← тира "${TIER}" нет, взят "${spot.tier}"` : gap > 6 ? "  ← моб сильно выше игрока" : "",
    ].join(""),
  );
}

console.log("\nвсе локации:");
console.log("        локация   мин.ур   баз.ур");
console.log("-".repeat(40));
for (const l of [...LOCATIONS].sort((a, b) => a.minLevel - b.minLevel)) {
  console.log([l.id.padStart(15), String(l.minLevel).padStart(9), String(l.baseLevel).padStart(9)].join(""));
}
