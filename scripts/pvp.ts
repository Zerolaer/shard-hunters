/**
 * Equal-BM PvP probe against TARGETS.pvp*.
 *
 * Duel-only: the harness stops when the rival dies or the player dies, so a
 * follow-up PvE spawn cannot pollute TTK / HP-cost.
 */
import { TARGETS } from "../src/lib/game/balance";
import { build, run } from "./harness";
import { generateRival } from "../src/lib/game/generators";
import { statsOf } from "../src/lib/game/formulas";
import type { CoreStat } from "../src/lib/game/types";

const SPLIT: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const LEVELS = (process.env.LEVELS ?? "16,40,80").split(",").map(Number);
const RUNS = Number(process.env.RUNS ?? 5);
const SECONDS = Number(process.env.SIM_SECONDS ?? 90);

const [ttkLo, ttkHi] = TARGETS.pvpTtkSec;
const [survLo, survHi] = TARGETS.pvpSurviveSec;
const [costLo, costHi] = TARGETS.pvpHpCostPerKill;

console.log(`PvP · равный БМ · дуэль-only · ${RUNS}× до ${SECONDS}с · воин`);
console.log(
  `цель: TTK ${ttkLo}–${ttkHi}с, выживание ${survLo}–${survHi}с, HP/убий ${(costLo * 100).toFixed(0)}–${(costHi * 100).toFixed(0)}%\n`,
);
console.log(" lvl     TTK  смертей  мин.HP  HP/убий  выжив.с  rivalHP  rivalAtk");
console.log("-".repeat(72));

for (const level of LEVELS) {
  const rows: { ttk: number; deaths: number; minHp: number; cost: number; survive: number; hp: number; atk: number }[] =
    [];
  for (let i = 0; i < RUNS; i++) {
    const state = build({ level, cls: "warrior", split: SPLIT, tier: "hot", floor: 3, matchSpotBm: 1 });
    const bm = statsOf(state).powerScore;
    const rival = generateRival({ name: "Соперник", power: bm });
    state.combat.monster = rival;
    state.combat.mode = "pvp";
    state.character.hp = statsOf(state).maxHp;
    const r = run(state, SECONDS, { freezeLevel: true, duelOnly: true });
    rows.push({
      ttk: r.ttk,
      deaths: r.deaths,
      minHp: r.minHpPct,
      cost: r.hpCostPerKill,
      survive: r.survivalSec,
      hp: rival.maxHp,
      atk: rival.attack,
    });
  }
  const mean = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
  const ttk = mean((r) => r.ttk);
  const survive = mean((r) => (Number.isFinite(r.survive) ? r.survive : 999));
  const cost = mean((r) => r.cost);
  const notes: string[] = [];
  if (Number.isFinite(ttk) && ttk < ttkLo) notes.push("быстрый TTK");
  else if (Number.isFinite(ttk) && ttk > ttkHi) notes.push("долгий TTK");
  if (survive < survLo) notes.push("хрупкий");
  else if (survive > survHi && survive < 999) notes.push("живуч");
  if (Number.isFinite(cost) && cost < costLo) notes.push("дешёвый");
  else if (Number.isFinite(cost) && cost > costHi) notes.push("дорогой");
  console.log(
    [
      String(level).padStart(4),
      (Number.isFinite(ttk) ? ttk.toFixed(1) : "—").padStart(8),
      mean((r) => r.deaths).toFixed(1).padStart(9),
      `${(mean((r) => r.minHp) * 100).toFixed(0)}%`.padStart(8),
      `${(Number.isFinite(cost) ? cost * 100 : NaN).toFixed(1)}%`.padStart(9),
      (survive >= 999 ? "∞" : survive.toFixed(0)).padStart(9),
      Math.round(mean((r) => r.hp)).toString().padStart(9),
      Math.round(mean((r) => r.atk)).toString().padStart(10),
      notes.length ? `  ← ${notes.join(", ")}` : "",
    ].join(""),
  );
}
