/**
 * Balance report. Every figure is produced by driving the real tickGame loop,
 * so it tracks the shipping constants automatically.
 *
 *   npx tsx scripts/report.ts
 */
import { build, run, bestLocationFor, table, statsOf, expectedBm } from "./harness";
import { BM, monsterDefense, PLAYER, TARGETS, xpToNext } from "../src/lib/game/balance";
import { hitChancePercent, hitRequirement } from "../src/lib/game/formulas";
import { FARM_SPOTS } from "../src/lib/game/spots";
import type { CoreStat, HunterClass } from "../src/lib/game/types";

const LEVELS = [1, 5, 10, 16, 25, 40, 60, 80, 100];
const BALANCED: Partial<Record<CoreStat, number>> = { strength: 50, agility: 30, endurance: 15, intelligence: 5 };
const SIM_SECONDS = Number(process.env.SIM_SECONDS ?? 900);

function pct(x: number) { return `${(x * 100).toFixed(1)}%`; }
function n(x: number, d = 1) { return Number.isFinite(x) ? x.toFixed(d) : "∞"; }

// ---------------------------------------------------------------- 1. TTK / survival
{
  const rows = LEVELS.flatMap((level) =>
    (["commons", "apex"] as const).map((tier) => {
      const state = build({ level, cls: "warrior", split: BALANCED, tier, floor: 3 });
      const derived = statsOf(state);
      const r = run(state, SIM_SECONDS, { freezeLevel: true });
      return { level, tier, r, derived };
    }),
  );
  table("1. TTK / выживание (авто-бой, uncommon-комплект по уровню)", rows, [
    { h: "lvl", w: 4, f: (r) => r.level },
    { h: "спот", w: 8, f: (r) => r.r.spotTier },
    { h: "TTK", w: 7, f: (r) => n(r.r.ttk, 2) },
    { h: "убийств/ч", w: 10, f: (r) => Math.round(r.r.killsPerHour) },
    { h: "смертей", w: 8, f: (r) => r.r.deaths },
    { h: "мин.HP", w: 8, f: (r) => pct(r.r.minHpPct) },
    { h: "HP/убий", w: 8, f: (r) => pct(r.r.hpCostPerKill) },
    { h: "выжив.с", w: 8, f: (r) => n(r.r.survivalSec, 0) },
    { h: "BM", w: 7, f: (r) => Math.round(r.r.bm) },
    { h: "нужно BM", w: 9, f: (r) => Math.round(r.r.requiredBm) },
    { h: "BM/треб", w: 8, f: (r) => n(r.r.bm / r.r.requiredBm, 2) },
  ]);
  console.log(
    `   цель: TTK ${TARGETS.trashTtkSec[0]}–${TARGETS.trashTtkSec[1]}с · выживание ${TARGETS.playerSurviveSec[0]}–${TARGETS.playerSurviveSec[1]}с` +
      ` · HP/убийство commons ${pct(TARGETS.commonsHpCostPerKill[0])}–${pct(TARGETS.commonsHpCostPerKill[1])}, apex ${pct(TARGETS.apexHpCostPerKill[0])}–${pct(TARGETS.apexHpCostPerKill[1])}`,
  );
}

// ---------------------------------------------------------------- 2. expectedBm vs реальность
{
  const rows = LEVELS.map((level) => {
    const out: Record<string, number> = { level, expected: expectedBm(level) };
    for (const rarity of ["common", "uncommon", "rare", "epic"] as const) {
      out[rarity] = statsOf(build({ level, cls: "warrior", split: BALANCED, rarity })).powerScore;
    }
    out.naked = statsOf(build({ level, cls: "warrior", split: BALANCED, rarity: "common", noTalents: true })).powerScore;
    return out;
  });
  table("2. powerScore игрока vs expectedBm() (invested curve)", rows, [
    { h: "lvl", w: 4, f: (r) => r.level },
    { h: "expected", w: 9, f: (r) => Math.round(r.expected) },
    { h: "common", w: 8, f: (r) => Math.round(r.common) },
    { h: "uncommon", w: 9, f: (r) => Math.round(r.uncommon) },
    { h: "rare", w: 8, f: (r) => Math.round(r.rare) },
    { h: "epic", w: 8, f: (r) => Math.round(r.epic) },
    { h: "unc/exp", w: 8, f: (r) => n(r.uncommon / r.expected, 2) },
    { h: "epic/exp", w: 9, f: (r) => n(r.epic / r.expected, 2) },
  ]);
  console.log(
    `   цель: invested live ≈ expected (см. balance:bm); unc/exp падает с уровнем; споты ${BM.tierNeed.commons}–${BM.tierNeed.apex}`,
  );
}

// ---------------------------------------------------------------- 3. классы
{
  const classes: HunterClass[] = ["warrior", "archer", "assassin", "mage"];
  const rows = [16, 40, 80].flatMap((level) =>
    classes.map((cls) => {
      const state = build({ level, cls, split: BALANCED, tier: "commons", floor: 3 });
      const d = statsOf(state);
      const r = run(state, SIM_SECONDS, { freezeLevel: true });
      return { level, cls, d, r };
    }),
  );
  table("3. Классовый паритет (одинаковый сплит и шмот)", rows, [
    { h: "lvl", w: 4, f: (r) => r.level },
    { h: "класс", w: 9, f: (r) => r.cls },
    { h: "TTK", w: 7, f: (r) => n(r.r.ttk, 2) },
    { h: "убийств/ч", w: 10, f: (r) => Math.round(r.r.killsPerHour) },
    { h: "смертей", w: 8, f: (r) => r.r.deaths },
    { h: "мин.HP", w: 8, f: (r) => pct(r.r.minHpPct) },
    { h: "атака", w: 7, f: (r) => Math.round(r.d.attack) },
    { h: "интервал", w: 9, f: (r) => n(r.d.attackInterval, 2) },
    { h: "крит", w: 6, f: (r) => n(r.d.critChance, 0) + "%" },
    { h: "BM", w: 7, f: (r) => Math.round(r.d.powerScore) },
  ]);
}

// ---------------------------------------------------------------- 4. темп прокачки
{
  // Probe a handful of levels and interpolate. Simulating all 99 levels took
  // ~15 minutes, which meant the report never got re-run after a change.
  const probes = [1, 5, 10, 16, 25, 40, 55, 70, 85, 100].map((level) => ({
    level,
    xpPerSec: run(build({ level, cls: "warrior", split: BALANCED, tier: "commons", floor: 3 }), 200, {
      freezeLevel: true,
    }).xpPerSec,
  }));
  const xpPerSecAt = (level: number) => {
    for (let i = 1; i < probes.length; i++) {
      const a = probes[i - 1]!;
      const b = probes[i]!;
      if (level <= b.level) {
        const t = Math.max(0, (level - a.level) / (b.level - a.level));
        return a.xpPerSec + t * (b.xpPerSec - a.xpPerSec);
      }
    }
    return probes[probes.length - 1]!.xpPerSec;
  };
  const rows: Record<string, number>[] = [];
  let hours = 0;
  const marks = new Set([5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  for (let level = 1; level < 100; level++) {
    const xpPerSec = xpPerSecAt(level);
    const need = xpToNext(level);
    hours += xpPerSec > 0 ? need / xpPerSec / 3600 : Infinity;
    if (marks.has(level + 1)) rows.push({ level: level + 1, hours, xpPerSec, need });
  }
  table("4. Темп прокачки (непрерывный фарм на commons)", rows, [
    { h: "до lvl", w: 7, f: (r) => r.level },
    { h: "часов", w: 9, f: (r) => n(r.hours, 1) },
    { h: "XP/с", w: 9, f: (r) => n(r.xpPerSec, 1) },
    { h: "XP на ур.", w: 10, f: (r) => Math.round(r.need) },
  ]);
  console.log(`   цель: ~${TARGETS.hoursToLevel100}ч до 100`);
}

// ---------------------------------------------------------------- 5. споты
{
  const level = 50;
  const loc = bestLocationFor(level);
  const rows = FARM_SPOTS.filter((s) => s.locationId === loc).map((spot) => {
    const state = build({ level, cls: "warrior", split: BALANCED, locationId: loc, tier: spot.tier, floor: 3 });
    const r = run(state, SIM_SECONDS, { freezeLevel: true });
    return { spot, r };
  });
  table(`5. Споты локации ${loc} (lvl ${level})`, rows, [
    { h: "тир", w: 8, f: (r) => r.spot.tier },
    { h: "TTK", w: 7, f: (r) => n(r.r.ttk, 2) },
    { h: "смертей", w: 8, f: (r) => r.r.deaths },
    { h: "мин.HP", w: 8, f: (r) => pct(r.r.minHpPct) },
    { h: "XP/с", w: 8, f: (r) => n(r.r.xpPerSec, 1) },
    { h: "золото/с", w: 9, f: (r) => n(r.r.goldPerSec, 1) },
    { h: "дропа/ч", w: 9, f: (r) => Math.round(r.r.dropsPerHour) },
    { h: "BM/треб", w: 8, f: (r) => n(r.r.bm / r.r.requiredBm, 2) },
  ]);
}

// ---------------------------------------------------------------- 6. точность
{
  const AGI_HEAVY = { strength: 20, agility: 60, endurance: 15, intelligence: 5 };
  const SAMPLES = 24;
  // Affix rolls move accuracy by ±10, which is enough to make apex read higher
  // than commons if every column rolls its own gear. Average over one shared
  // set of rolls per split so the columns are actually comparable.
  const accSamples = (level: number, split: Partial<Record<CoreStat, number>>) =>
    Array.from({ length: SAMPLES }, () => statsOf(build({ level, cls: "warrior", split, floor: 3 })).accuracy);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const chance = (level: number, accs: number[], danger: number, isBoss: boolean, gap: number) => {
    const mLevel = level + gap;
    const required = hitRequirement({
      playerLevel: level,
      monsterLevel: mLevel,
      monsterDefense: monsterDefense(mLevel, 3, isBoss),
      danger,
      isBoss,
    });
    return mean(accs.map((a) => hitChancePercent(a, required)));
  };
  const rows = LEVELS.map((level) => {
    const accs = accSamples(level, BALANCED);
    const accsAgi = accSamples(level, AGI_HEAVY);
    return {
      level,
      acc: mean(accs),
      commons: chance(level, accs, 1, false, 0),
      apex: chance(level, accs, 1.7, false, 0),
      boss: chance(level, accs, 1, true, 2),
      over: chance(level, accs, 1, false, 5),
      agiBuild: chance(level, accsAgi, 1, false, 0),
    };
  });
  table(`6. Шанс попасть (пол ${PLAYER.hitFloor}%, потолок ${PLAYER.hitCeil}%)`, rows, [
    { h: "lvl", w: 4, f: (r) => r.level },
    { h: "точность", w: 9, f: (r) => Math.round(r.acc) },
    { h: "commons", w: 8, f: (r) => n(r.commons, 0) + "%" },
    { h: "apex", w: 7, f: (r) => n(r.apex, 0) + "%" },
    { h: "босс", w: 7, f: (r) => n(r.boss, 0) + "%" },
    { h: "+5 ур.", w: 8, f: (r) => n(r.over, 0) + "%" },
    { h: "агил-билд", w: 10, f: (r) => n(r.agiBuild, 0) + "%" },
  ]);
  console.log(`   цель: commons ≈ ${TARGETS.hitChancePct}%`);
}

console.log("\n(SIM_SECONDS=" + SIM_SECONDS + " на каждую строку)");
