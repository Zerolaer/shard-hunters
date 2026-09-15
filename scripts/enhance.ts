/** Expected cost of pushing one item up the enhance ladder. npx tsx scripts/enhance.ts */
import { enhanceCost, enhanceLevelAfterFail, enhanceSuccessChance, isEnhanceSafe } from "../src/lib/game/enhance";
import { enhanceMultiplier } from "../src/lib/game/balance";
import { MAX_ENHANCE } from "../src/lib/game/constants";

const ITEM_LEVEL = Number(process.env.ITEM_LEVEL ?? 60);
const TRIALS = 4000;

/** Monte-Carlo, because failures can knock you back down the ladder. */
function simulateTo(target: number) {
  let gold = 0, ore = 0, shards = 0, attempts = 0;
  for (let t = 0; t < TRIALS; t++) {
    let lv = 0;
    let guard = 2_000_000;
    while (lv < target && guard-- > 0) {
      const c = enhanceCost(lv, ITEM_LEVEL);
      gold += c.gold; ore += c.ore; shards += c.shards; attempts++;
      if (Math.random() < enhanceSuccessChance(lv)) { lv++; continue; }
      lv = enhanceLevelAfterFail(lv);
    }
  }
  return { gold: gold / TRIALS, ore: ore / TRIALS, shards: shards / TRIALS, attempts: attempts / TRIALS };
}

console.log(`\n=== Заточка предмета ${ITEM_LEVEL} ур. (усреднено по ${TRIALS} прогонам) ===`);
console.log("  +N  множ.  прирост  шанс  безоп.   попыток      золото        руда   осколки");
console.log("-".repeat(86));
let prev = { gold: 0, ore: 0, shards: 0, attempts: 0 };
for (let target = 1; target <= MAX_ENHANCE; target++) {
  const r = simulateTo(target);
  const m = enhanceMultiplier(target);
  console.log(
    [
      String(target).padStart(4),
      m.toFixed(3).padStart(6),
      ((m / enhanceMultiplier(target - 1) - 1) * 100).toFixed(1).padStart(8) + "%",
      (enhanceSuccessChance(target - 1) * 100).toFixed(0).padStart(4) + "%",
      (isEnhanceSafe(target - 1) ? "да" : "нет").padStart(7),
      (r.attempts - prev.attempts).toFixed(1).padStart(9),
      Math.round(r.gold).toLocaleString("ru-RU").padStart(12),
      Math.round(r.ore).toLocaleString("ru-RU").padStart(11),
      Math.round(r.shards).toLocaleString("ru-RU").padStart(9),
    ].join(" "),
  );
  prev = r;
}
console.log("\n'попыток' — сколько нажатий уходит на переход с предыдущего уровня, с учётом откатов.");
console.log("золото/руда/осколки — накопительная стоимость с +0 до этого уровня.");
