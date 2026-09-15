/**
 * Does each class have a stat split that actually works for it?
 *
 * The reference 50/30/15/5 split is strength-first, which flatters the classes
 * whose damage comes off weapon attack. A class is only badly balanced if it
 * loses on its *own* best split too.
 */
import { run, build } from "./harness";
import type { CoreStat, HunterClass } from "../src/lib/game/types";

const SPLITS: Record<string, Partial<Record<CoreStat, number>>> = {
  "сила 50/30/15/5": { strength: 50, agility: 30, endurance: 15, intelligence: 5 },
  "ловк 20/60/15/5": { strength: 20, agility: 60, endurance: 15, intelligence: 5 },
  "инт  15/20/15/50": { strength: 15, agility: 20, endurance: 15, intelligence: 50 },
  "танк 30/20/45/5": { strength: 30, agility: 20, endurance: 45, intelligence: 5 },
};
const CLASSES: HunterClass[] = ["warrior", "archer", "assassin", "mage"];
const LEVELS = (process.env.LEVELS ?? "40,80").split(",").map(Number);
const RUNS = Number(process.env.RUNS ?? 4);
const SECONDS = Number(process.env.SIM_SECONDS ?? 150);

for (const level of LEVELS) {
  console.log(`\nlvl ${level} · TTK, ${RUNS} прогонов по ${SECONDS}с`);
  console.log(
    ["класс".padEnd(11), ...Object.keys(SPLITS).map((s) => s.padStart(18))].join(""),
  );
  console.log("-".repeat(11 + Object.keys(SPLITS).length * 18));
  for (const cls of CLASSES) {
    const cells = Object.values(SPLITS).map((split) => {
      const runs = Array.from({ length: RUNS }, () =>
        run(build({ level, cls, split, tier: "commons", floor: 3 }), SECONDS, { freezeLevel: true }),
      );
      const ttk = runs.reduce((s, r) => s + r.ttk, 0) / runs.length;
      const deaths = runs.reduce((s, r) => s + r.deaths, 0) / runs.length;
      return `${ttk.toFixed(2)}${deaths >= 1 ? `†${deaths.toFixed(0)}` : ""}`;
    });
    console.log([cls.padEnd(11), ...cells.map((c) => c.padStart(18))].join(""));
  }
}
console.log("\n† — среднее число смертей за прогон");
