/**
 * Decomposes where player DPS growth comes from vs monster effective HP growth.
 *   npx tsx scripts/diag.ts
 */
import { build, run, statsOf } from "./harness";
import { armorMitigation, monsterHp, monsterDefense, monsterLevelOf } from "../src/lib/game/balance";
import { LOCATIONS } from "../src/lib/game/constants";
import type { CoreStat } from "../src/lib/game/types";

const LEVELS = [1, 5, 10, 16, 25, 40, 60, 80, 100];
const BALANCED: Partial<Record<CoreStat, number>> = { strength: 50, agility: 30, endurance: 15, intelligence: 5 };
const SECONDS = Number(process.env.SIM_SECONDS ?? 400);

function n(x: number, d = 2) { return Number.isFinite(x) ? x.toFixed(d) : "∞"; }

const SAMPLES = Number(process.env.SIM_SAMPLES ?? 4);

/** Gear rolls are random, so a single build per level is pure noise. */
function meanTtk(level: number, hotbar?: (null)[]) {
  let kills = 0;
  let seconds = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const state = build({ level, cls: "warrior", split: BALANCED, tier: "commons", floor: 3, ...(hotbar ? { hotbar } : {}) });
    const r = run(state, SECONDS / SAMPLES, { freezeLevel: true });
    kills += r.kills;
    seconds += SECONDS / SAMPLES;
  }
  return kills ? seconds / kills : Infinity;
}

const rows = LEVELS.map((level) => {
  const sample = build({ level, cls: "warrior", split: BALANCED, tier: "commons", floor: 3 });
  const d = statsOf(sample);
  const loc = LOCATIONS.find((l) => l.id === sample.combat.locationId)!;
  const mLevel = monsterLevelOf(loc.baseLevel, 3, false);
  const mHp = monsterHp(mLevel, 3, false, 1, loc.threat);
  const mMit = armorMitigation(monsterDefense(mLevel, 3, false), level);

  const a = { ttk: meanTtk(level) };
  const b = { ttk: meanTtk(level, [null, null, null, null]) };

  const dpsAll = mHp / a.ttk;
  const dpsAuto = mHp / b.ttk;
  return {
    level, mLevel, mHp, mMit,
    ehp: mHp / (1 - mMit),
    dpsAll, dpsAuto,
    skillShare: 1 - dpsAuto / dpsAll,
    ttk: a.ttk, ttkAuto: b.ttk,
    attack: d.attack, interval: d.attackInterval,
    crit: d.critChance, critDmg: d.critDamage,
    critMult: 1 + (d.critChance / 100) * (d.critDamage / 100 - 1),
  };
});

const base = rows[0]!;
console.log("\n=== Откуда растёт DPS игрока (commons, этаж 3) ===");
console.log(" lvl  мобLv  разрыв  мобHP  EHP моба  DPS всего  DPS авто  доля скиллов   TTK  TTK_авто");
console.log("-".repeat(93));
for (const r of rows) {
  console.log(
    [
      String(r.level).padStart(4), String(r.mLevel).padStart(6),
      String(r.mLevel - r.level).padStart(7),
      String(r.mHp).padStart(6), String(Math.round(r.ehp)).padStart(9),
      n(r.dpsAll, 0).padStart(10), n(r.dpsAuto, 0).padStart(9), (n(r.skillShare * 100, 0) + "%").padStart(14),
      n(r.ttk).padStart(6), n(r.ttkAuto).padStart(9),
    ].join(" "),
  );
}

console.log("\n=== Множители роста относительно 1 уровня ===");
console.log(" lvl   EHP  DPS всего  DPS авто  атака  1/интервал  крит-мн.  запас");
console.log("-".repeat(72));
for (const r of rows) {
  const growthEhp = r.ehp / base.ehp;
  const growthDps = r.dpsAll / base.dpsAll;
  console.log(
    [
      String(r.level).padStart(4),
      (n(growthEhp, 1) + "x").padStart(6),
      (n(growthDps, 1) + "x").padStart(10),
      (n(r.dpsAuto / base.dpsAuto, 1) + "x").padStart(9),
      (n(r.attack / base.attack, 1) + "x").padStart(6),
      (n(base.interval / r.interval, 2) + "x").padStart(11),
      (n(r.critMult / base.critMult, 2) + "x").padStart(9),
      // how much faster DPS grows than monster EHP — this is the TTK collapse
      (n(growthDps / growthEhp, 1) + "x").padStart(6),
    ].join(" "),
  );
}
console.log("\n'запас' = во сколько раз DPS обогнал EHP моба. 1.0 = TTK держится.");
