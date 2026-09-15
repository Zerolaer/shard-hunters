/**
 * Why a class dies: splits BM into its parts and shows the incoming-damage
 * multiplier each class actually eats on the same spot.
 *
 * bmDefenseMult keys off powerScore, so any class whose real power is invisible
 * to powerScore gets hit twice — it reads weak, then takes extra damage for it.
 */
import { statsOf } from "../src/lib/game/formulas";
import { bmDefenseMult, bmOffenseMult, spotRequiredBm } from "../src/lib/game/balance";
import { LOCATIONS } from "../src/lib/game/constants";
import { FARM_SPOT_BY_ID } from "../src/lib/game/spots";
import { build } from "./harness";
import type { CoreStat, HunterClass } from "../src/lib/game/types";

const CLASSES: HunterClass[] = ["warrior", "archer", "assassin", "mage"];
const LEVELS = [16, 40, 80];
const BALANCED: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const SAMPLES = 12;

console.log("класс/уровень · среднее по", SAMPLES, "роллам шмота\n");
console.log(" lvl      класс    макс.HP   защита    атака      DPS       БМ   треб.БМ   входящий   исходящий   вампиризм");
console.log("-".repeat(116));

for (const level of LEVELS) {
  const rows = CLASSES.map((cls) => {
    const acc = { maxHp: 0, defense: 0, attack: 0, dps: 0, bm: 0, req: 0, lifesteal: 0 };
    for (let i = 0; i < SAMPLES; i++) {
      const state = build({ level, cls, split: BALANCED, tier: "commons", floor: 3 });
      const d = statsOf(state);
      const spot = FARM_SPOT_BY_ID[state.combat.spotId]!;
      const loc = LOCATIONS.find((l) => l.id === spot.locationId)!;
      acc.maxHp += d.maxHp;
      acc.defense += d.defense;
      acc.attack += d.attack;
      acc.dps += d.dps;
      acc.bm += d.powerScore;
      acc.lifesteal += d.lifesteal;
      acc.req += spotRequiredBm(loc.baseLevel, spot.tier, loc.kind);
    }
    const m = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v / SAMPLES])) as typeof acc;
    return { cls, ...m, taken: bmDefenseMult(m.bm, m.req), dealt: bmOffenseMult(m.bm, m.req) };
  });
  for (const r of rows) {
    console.log(
      [
        String(level).padStart(4),
        r.cls.padStart(11),
        Math.round(r.maxHp).toString().padStart(11),
        Math.round(r.defense).toString().padStart(9),
        Math.round(r.attack).toString().padStart(9),
        Math.round(r.dps).toString().padStart(9),
        Math.round(r.bm).toString().padStart(9),
        Math.round(r.req).toString().padStart(10),
        `${r.taken.toFixed(2)}x`.padStart(11),
        `${r.dealt.toFixed(2)}x`.padStart(12),
        `${(r.lifesteal * 100).toFixed(1)}%`.padStart(12),
      ].join(""),
    );
  }
  console.log("-".repeat(116));
}
