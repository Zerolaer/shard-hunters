/** Level coverage of the location list. npx tsx scripts/locs.ts */
import { LOCATIONS } from "../src/lib/game/constants";
import { monsterLevelOf } from "../src/lib/game/balance";
import { bestLocationFor } from "./harness";

console.log("\n=== Локации ===");
console.log(" minLv  baseLv  этаж5  вид     threat  название");
console.log("-".repeat(70));
for (const l of LOCATIONS) {
  console.log(
    [
      String(l.minLevel).padStart(6), String(l.baseLevel).padStart(7),
      String(monsterLevelOf(l.baseLevel, 5, false)).padStart(6),
      l.kind.padEnd(7), String(l.threat ?? 1).padStart(7), " " + l.name,
    ].join(" "),
  );
}

console.log("\n=== Что видит игрок на своём уровне (этаж 3) ===");
console.log(" lvl  локация                        мобLv  разрыв");
console.log("-".repeat(60));
for (let lv = 1; lv <= 100; lv += 3) {
  const id = bestLocationFor(lv);
  const loc = LOCATIONS.find((l) => l.id === id)!;
  const m = monsterLevelOf(loc.baseLevel, 3, false);
  console.log(
    [String(lv).padStart(4), " " + loc.name.padEnd(30), String(m).padStart(5), String(m - lv).padStart(7)].join(" "),
  );
}
