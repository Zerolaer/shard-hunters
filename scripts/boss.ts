/**
 * Boss encounters against TARGETS.bossTtkSec.
 *
 * Bosses must read as a distinct phase: longer TTK than trash, real incoming
 * pressure (deaths / low min HP), and gear matched to the spot so we measure
 * the fight — not undergeared failure.
 */
import { TARGETS, MONSTER, monsterHp, monsterAttack, monsterDefense, monsterLevelOf, bossHpLevelMult } from "../src/lib/game/balance";
import { DROP } from "../src/lib/game/balance";
import { LOCATIONS } from "../src/lib/game/constants";
import { WORKSHOP_BOSS_MULT, WORKSHOP_BOSS_ROLL_MULT } from "../src/lib/game/workshop";
import { build, run } from "./harness";
import type { CoreStat, HunterClass } from "../src/lib/game/types";

const LEVELS = (process.env.LEVELS ?? "16,40,60,80,100").split(",").map(Number);
const CLASSES: HunterClass[] = ["warrior", "archer", "assassin", "mage"];
const BALANCED: Partial<Record<CoreStat, number>> = {
  strength: 50,
  agility: 30,
  endurance: 15,
  intelligence: 5,
};
const RUNS = Number(process.env.RUNS ?? 3);
const SECONDS = Number(process.env.SIM_SECONDS ?? 600);

const [lo, hi] = TARGETS.bossTtkSec;
const [tLo, tHi] = TARGETS.trashTtkSec;
console.log(`боссы · ${RUNS} прогонов по ${SECONDS}с · цель TTK ${lo}–${hi}с (трэш ${tLo}–${tHi}с)`);
console.log(`снаряжение: matchSpotBm=1.15 + defensiveSlot · давление: смерти / мин.HP\n`);
console.log(" lvl      класс   боссов   TTK босса   смертей   мин.HP");
console.log("-".repeat(58));

for (const level of LEVELS) {
  for (const cls of CLASSES) {
    const runs = Array.from({ length: RUNS }, () =>
      run(
        build({
          level,
          cls,
          split: BALANCED,
          tier: "commons",
          floor: 3,
          defensiveSlot: true,
          // Slightly above commons requiredBm: ready for the phase without
          // melting it. UI advertises boss ~1.55× spot BM; 1.15 is the
          // practical "I swapped a defensive skill" band after farming trash.
          matchSpotBm: 1.15,
        }),
        SECONDS,
        { freezeLevel: true, autoBoss: true },
      ),
    );
    const mean = (f: (r: (typeof runs)[number]) => number) => runs.reduce((s, r) => s + f(r), 0) / runs.length;
    const bosses = mean((r) => r.bossKills);
    const timed = runs.map((r) => r.bossTtk).filter(Number.isFinite);
    const ttk = timed.length ? timed.reduce((s, x) => s + x, 0) / timed.length : NaN;
    const deaths = mean((r) => r.deaths);
    const minHp = mean((r) => r.minHpPct);
    const notes: string[] = [];
    if (!Number.isFinite(ttk)) notes.push("ни одного не убил");
    else if (ttk < lo) notes.push("слишком быстро");
    else if (ttk > hi) notes.push("слишком долго");
    if (Number.isFinite(ttk) && deaths < 0.3 && minHp > 0.85) notes.push("слишком безопасно");
    const mark = notes.length ? ` ← ${notes.join(", ")}` : "";
    console.log(
      [
        String(level).padStart(4),
        cls.padStart(11),
        bosses.toFixed(1).padStart(9),
        (Number.isFinite(ttk) ? ttk.toFixed(1) : "—").padStart(12),
        deaths.toFixed(1).padStart(10),
        `${(minHp * 100).toFixed(0)}%`.padStart(9),
        mark,
      ].join(""),
    );
  }
  console.log("-".repeat(58));
}

console.log("\nиз чего собран босс (этаж 5, danger 1):");
console.log(" lvl  ур.босса      HP    атака   защита   HP/трэш  ATK/трэш");
console.log("-".repeat(62));
for (const level of LEVELS) {
  let loc = LOCATIONS[0]!;
  for (const l of LOCATIONS) if (l.minLevel <= level && l.minLevel >= loc.minLevel) loc = l;
  const bl = monsterLevelOf(loc.baseLevel, 5, true);
  const tl = monsterLevelOf(loc.baseLevel, 5, false);
  const bhp = monsterHp(bl, 5, true, 1, loc.threat);
  const thp = monsterHp(tl, 5, false, 1, loc.threat);
  const batk = monsterAttack(bl, 5, true, 1, loc.threat);
  const tatk = monsterAttack(tl, 5, false, 1, loc.threat);
  console.log(
    [
      String(level).padStart(4),
      String(bl).padStart(10),
      Math.round(bhp).toLocaleString("ru-RU").padStart(8),
      Math.round(batk).toString().padStart(9),
      Math.round(monsterDefense(bl, 5, true)).toString().padStart(9),
      `${(bhp / thp).toFixed(1)}x`.padStart(10),
      `${(batk / Math.max(1, tatk)).toFixed(2)}x`.padStart(10),
    ].join(""),
  );
}
console.log(
  `множители: HP ×${MONSTER.bossHp} × (ур/${MONSTER.bossHpPivot})^${MONSTER.bossHpLevelExp}, атака ×${MONSTER.bossAtk}, защита ×${MONSTER.bossDef}, интервал ${MONSTER.bossInterval}с`,
);
console.log(
  `лут: drop ${DROP.bossChance}, bonusItem ${DROP.bossBonusItem}, rarityBias +${DROP.bossRarity}, gold ×${MONSTER.bossGold}, shards ×${MONSTER.bossShards}, XP ×${MONSTER.bossXp}`,
);
console.log(`мастерская: bundle ×${WORKSHOP_BOSS_MULT}, roll ×${WORKSHOP_BOSS_ROLL_MULT}`);
for (const level of LEVELS) {
  const m = MONSTER.bossHp * bossHpLevelMult(monsterLevelOf(level, 5, true));
  console.log(`  эфф. HP× @${level}: ${m.toFixed(2)}`);
}
