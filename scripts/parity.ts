/**
 * Class parity with averaging.
 *
 * A single run swings by 30%+ on gear rolls alone, which is enough to make a
 * class look broken when it isn't. Averages several independent runs per class
 * so the spread you see is the real one.
 */
import { run, build } from "./harness";
import { TARGETS } from "../src/lib/game/balance";
import type { CoreStat, HunterClass } from "../src/lib/game/types";

const CLASSES: HunterClass[] = ["warrior", "archer", "assassin", "mage"];
const LEVELS = (process.env.LEVELS ?? "16,40,60,80,100").split(",").map(Number);
const BALANCED: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const RUNS = Number(process.env.RUNS ?? 5);
const SECONDS = Number(process.env.SIM_SECONDS ?? 150);

console.log(`паритет классов · ${RUNS} прогонов по ${SECONDS}с · сплит 50/30/15/5\n`);
console.log(" lvl      класс     TTK   смертей   мин.HP   к лучшему");
console.log("-".repeat(58));

for (const level of LEVELS) {
  const results = CLASSES.map((cls) => {
    const runs = Array.from({ length: RUNS }, () =>
      run(build({ level, cls, split: BALANCED, tier: "commons", floor: 3 }), SECONDS, { freezeLevel: true }),
    );
    const mean = (f: (r: (typeof runs)[number]) => number) => runs.reduce((s, r) => s + f(r), 0) / runs.length;
    return { cls, ttk: mean((r) => r.ttk), deaths: mean((r) => r.deaths), minHp: mean((r) => r.minHpPct) };
  });
  const best = Math.min(...results.map((r) => r.ttk));
  for (const r of results) {
    console.log(
      [
        String(level).padStart(4),
        r.cls.padStart(11),
        r.ttk.toFixed(2).padStart(8),
        r.deaths.toFixed(1).padStart(10),
        `${(r.minHp * 100).toFixed(0)}%`.padStart(9),
        `${(r.ttk / best).toFixed(2)}x`.padStart(12),
      ].join(""),
    );
  }
  const worst = Math.max(...results.map((r) => r.ttk));
  console.log(`     разброс ${(worst / best).toFixed(2)}x${worst / best > 1.25 ? "  ← слишком широко" : ""}`);
  console.log("-".repeat(58));
}
console.log(`цель TTK ${TARGETS.trashTtkSec[0]}–${TARGETS.trashTtkSec[1]}с, разброс между классами < 1.25x`);
