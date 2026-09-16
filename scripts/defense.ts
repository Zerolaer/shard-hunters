/**
 * Does investing in survivability buy anything measurable?
 *
 * Endurance and armour are only real if incoming damage is real. Three splits
 * farm the same content; the reference split is what the survival window in
 * TARGETS describes, and the tank/glass ratio is what endurance actually buys.
 *
 * Gear is resolved once from the reference split's BM target and shared across
 * all three — otherwise a glass build climbs the rarity ladder further (less
 * END → less powerScore) and out-tanks the tank on gear alone.
 *
 * Run this on apex. Commons is the tier you can leave unattended, so nothing
 * defensive can pay off there by design — judging armour on commons is what
 * previously made endurance look like a dead stat.
 */
import { TARGETS, REGEN, armorConstant } from "../src/lib/game/balance";
import { statsOf } from "../src/lib/game/formulas";
import { build, gearRungForSpot, run } from "./harness";
import type { CoreStat } from "../src/lib/game/types";

const BUILDS: Record<string, Partial<Record<CoreStat, number>>> = {
  стекло: { strength: 55, agility: 40, endurance: 0, intelligence: 5 },
  эталон: { strength: 50, agility: 30, endurance: 15, intelligence: 5 },
  танк: { strength: 30, agility: 20, endurance: 45, intelligence: 5 },
};
const REFERENCE = "эталон";
/** Survival a tank should buy over a glass build before endurance is worth taking. */
const MIN_TANK_GAIN = 1.35;

const LEVELS = (process.env.LEVELS ?? "16,40,80,100").split(",").map(Number);
const TIER = (process.env.TIER ?? "apex") as "commons" | "rich" | "hot" | "apex";
const RUNS = Number(process.env.RUNS ?? 3);
const SECONDS = Number(process.env.SIM_SECONDS ?? 200);
/** Gear the build to this fraction of the square's requiredBm before measuring. */
const BM = Number(process.env.BM ?? 1);

const isApex = TIER === "apex";
const [lo, hi] = TARGETS.playerSurviveSec;
const [costLo, costHi] = isApex ? TARGETS.apexHpCostPerKill : TARGETS.commonsHpCostPerKill;

console.log(`устойчивость на тире "${TIER}" · ${RUNS} прогонов по ${SECONDS}с · воин`);
console.log(
  isApex
    ? `цель: эталонный сплит живёт ${lo}–${hi}с, убийство стоит ${(costLo * 100).toFixed(0)}–${(costHi * 100).toFixed(0)}% HP, танк даёт ≥${MIN_TANK_GAIN}x живучести`
    : `цель: убийство стоит ${(costLo * 100).toFixed(0)}–${(costHi * 100).toFixed(0)}% HP; окно выживания не проверяется — тир безопасен по замыслу`,
);
console.log(`реген в бою ${(REGEN.inCombat * 100).toFixed(2)}%/с, вампиризм и лечения в цену убийства не входят`);
console.log(`снаряжение подобрано под ${(BM * 100).toFixed(0)}% требуемого БМ квадрата (одна ступень на все сплиты)\n`);
console.log(" lvl      билд   макс.HP   защита   поглощ.   БМ%   входящий/с   выжив.с   HP/убий   смертей");
console.log("-".repeat(102));

for (const level of LEVELS) {
  const survivals: Record<string, number> = {};
  // Resolve gear from the reference split once so END is the only variable.
  const rung = gearRungForSpot({
    level,
    cls: "warrior",
    split: BUILDS[REFERENCE]!,
    tier: TIER,
    floor: 3,
    matchSpotBm: BM,
  });

  for (const [name, split] of Object.entries(BUILDS)) {
    const mk = () =>
      build({
        level,
        cls: "warrior",
        split,
        tier: TIER,
        floor: 3,
        rarity: rung.rarity,
        enhance: rung.enhance,
      });
    const runs = Array.from({ length: RUNS }, () => run(mk(), SECONDS, { freezeLevel: true }));
    // Boss-kind locations carry no commons square, and the harness quietly
    // substitutes the nearest tier. Say so rather than mislabelling the row.
    const actual = runs[0]!.spotTier;
    const mean = (f: (r: (typeof runs)[number]) => number) =>
      runs.reduce((s, r) => s + f(r), 0) / runs.length;
    const d = statsOf(mk());
    const bmPct = mean((r) => r.bm / r.requiredBm) * 100;
    const survive = mean((r) => (Number.isFinite(r.survivalSec) ? r.survivalSec : Infinity));
    const cost = mean((r) => r.hpCostPerKill);
    survivals[name] = survive;

    // Only the reference split is held to the survival window: a tank running
    // long and a glass build dying fast are the point of the stat, not drift.
    const notes: string[] = [];
    if (actual !== TIER) notes.push(`тира "${TIER}" тут нет, замер на "${actual}"`);
    if (cost > costHi) notes.push("дорогие убийства");
    else if (cost < costLo) notes.push("дешёвые убийства");
    if (name === REFERENCE && isApex && actual === TIER) {
      if (survive > hi) notes.push("слишком живуч");
      else if (survive < lo) notes.push("слишком хрупок");
    }

    console.log(
      [
        String(level).padStart(4),
        name.padStart(10),
        Math.round(d.maxHp).toString().padStart(10),
        Math.round(d.defense).toString().padStart(9),
        // Armour mitigation against a same-level attacker.
        `${((d.defense / (d.defense + armorConstant(level))) * 100).toFixed(0)}%`.padStart(10),
        `${bmPct.toFixed(0)}%`.padStart(6),
        `${(mean((r) => r.incomingPerSec) * 100).toFixed(2)}%`.padStart(13),
        (Number.isFinite(survive) ? survive.toFixed(0) : "∞").padStart(10),
        `${(cost * 100).toFixed(1)}%`.padStart(10),
        mean((r) => r.deaths).toFixed(1).padStart(10),
        notes.length ? `  ← ${notes.join(", ")}` : "",
      ].join(""),
    );
  }

  const gain = survivals["танк"]! / survivals["стекло"]!;
  console.log(
    `     выносливость покупает ${gain.toFixed(2)}x живучести${gain < MIN_TANK_GAIN ? `  ← мало, нужно ≥${MIN_TANK_GAIN}x` : ""}  · шмот ${rung.rarity}+${rung.enhance}`,
  );
  console.log("-".repeat(102));
}
