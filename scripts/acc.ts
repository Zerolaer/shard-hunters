/**
 * Fits the to-hit requirement against the reference hunter's accuracy curve.
 *
 * Accuracy only matters if `required` tracks it closely; if the gap drifts
 * positive the clamp in hitChancePercent eats every point you invest. Run this
 * after touching PLAYER.accPerAgi, the accuracy affix or monsterDefense.
 */
import { statsOf, hitChancePercent } from "../src/lib/game/formulas";
import { HIT, monsterDefense } from "../src/lib/game/balance";
import { build } from "./harness";
import type { CoreStat } from "../src/lib/game/types";

const LEVELS = [1, 5, 10, 16, 25, 40, 60, 80, 100];
const BALANCED: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const AGI: Partial<Record<CoreStat, number>> = {
  strength: 20,
  agility: 60,
  endurance: 15,
  intelligence: 5,
};
const SAMPLES = 24;

function meanAcc(level: number, split: Partial<Record<CoreStat, number>>) {
  let sum = 0;
  for (let i = 0; i < SAMPLES; i++) {
    sum += statsOf(build({ level, cls: "warrior", split, floor: 3 })).accuracy;
  }
  return sum / SAMPLES;
}

console.log("lvl   acc(бал)  acc(агил)   защита    треб  шанс(бал) шанс(агил)");
console.log("-".repeat(66));
const pts: { level: number; acc: number; def: number }[] = [];
for (const level of LEVELS) {
  const acc = meanAcc(level, BALANCED);
  const accAgi = meanAcc(level, AGI);
  const def = monsterDefense(level, 3, false);
  const req =
    HIT.base + level * HIT.perTargetLevel + def * HIT.perTargetDefense;
  pts.push({ level, acc, def });
  console.log(
    [
      String(level).padStart(3),
      acc.toFixed(1).padStart(10),
      accAgi.toFixed(1).padStart(10),
      def.toFixed(0).padStart(9),
      req.toFixed(1).padStart(8),
      `${hitChancePercent(acc, req).toFixed(0)}%`.padStart(10),
      `${hitChancePercent(accAgi, req).toFixed(0)}%`.padStart(11),
    ].join(""),
  );
}

// Monster defense is a deterministic function of level, so the two predictors
// are collinear and a joint fit is meaningless. Level is the honest predictor;
// perTargetDefense stays small so armoured/boss targets still cost extra.
const lm = pts.reduce((s, p) => s + p.level, 0) / pts.length;
const am = pts.reduce((s, p) => s + (p.acc - p.def * HIT.perTargetDefense), 0) / pts.length;
const sxy = pts.reduce((s, p) => s + (p.level - lm) * (p.acc - p.def * HIT.perTargetDefense - am), 0);
const sxx = pts.reduce((s, p) => s + (p.level - lm) ** 2, 0);
const slope = sxy / sxx;
const intercept = am - slope * lm;
const gaps = pts.map((p) => p.acc - (intercept + p.level * slope + p.def * HIT.perTargetDefense));
const swing = Math.max(...gaps) - Math.min(...gaps);

console.log(`\nвыборок: ${pts.length}`);
console.log(`подгонка: base=${intercept.toFixed(2)} perTargetLevel=${slope.toFixed(4)} (при perTargetDefense=${HIT.perTargetDefense})`);
console.log(`сейчас:   base=${HIT.base} perTargetLevel=${HIT.perTargetLevel}`);
console.log(`разброс шанса попасть при идеальной подгонке: ${swing.toFixed(1)} п.п.`);
