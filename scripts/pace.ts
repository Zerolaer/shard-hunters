/**
 * Levelling pace against TARGETS.hoursToLevel100.
 *
 * Measures XP/sec at a sample of levels with the real combat loop and
 * interpolates between them, which is ~10x cheaper than simulating all 99
 * levels and lands within a few percent of the full sweep.
 */
import { TARGETS, xpToNext } from "../src/lib/game/balance";
import { build, run } from "./harness";
import type { CoreStat } from "../src/lib/game/types";

const BALANCED: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const PROBES = [1, 5, 10, 16, 25, 40, 55, 70, 85, 100];
const SECONDS = Number(process.env.SIM_SECONDS ?? 200);

const probe = PROBES.map((level) => {
  const r = run(build({ level, cls: "warrior", split: BALANCED, tier: "commons", floor: 3 }), SECONDS, {
    freezeLevel: true,
  });
  return { level, xpPerSec: r.xpPerSec };
});

function xpPerSecAt(level: number) {
  if (level <= PROBES[0]!) return probe[0]!.xpPerSec;
  for (let i = 1; i < probe.length; i++) {
    const a = probe[i - 1]!;
    const b = probe[i]!;
    if (level <= b.level) {
      const t = (level - a.level) / (b.level - a.level);
      return a.xpPerSec + t * (b.xpPerSec - a.xpPerSec);
    }
  }
  return probe[probe.length - 1]!.xpPerSec;
}

console.log("замеры XP/с:");
for (const p of probe) console.log(`  lvl ${String(p.level).padStart(3)}  ${p.xpPerSec.toFixed(1)}`);

const marks = new Set([10, 25, 40, 55, 70, 85, 95, 100]);
let hours = 0;
console.log("\nдо lvl     часов   доля пути   XP на уровень");
console.log("-".repeat(48));
const rows: { level: number; hours: number; need: number }[] = [];
for (let level = 1; level < 100; level++) {
  const rate = xpPerSecAt(level);
  hours += rate > 0 ? xpToNext(level) / rate / 3600 : Infinity;
  if (marks.has(level + 1)) rows.push({ level: level + 1, hours, need: xpToNext(level) });
}
const total = hours;
for (const r of rows) {
  console.log(
    [
      String(r.level).padStart(6),
      r.hours.toFixed(1).padStart(10),
      `${((r.hours / total) * 100).toFixed(0)}%`.padStart(12),
      Math.round(r.need).toLocaleString("ru-RU").padStart(16),
    ].join(""),
  );
}

const [lo, hi] = TARGETS.hoursToLevel100;
const verdict = total < lo ? "БЫСТРО" : total > hi ? "МЕДЛЕННО" : "в цели";
console.log(`\nитого ${total.toFixed(1)}ч · цель ${lo}–${hi}ч · ${verdict}`);
