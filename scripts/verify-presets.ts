/**
 * Quick verification: sin/classic presets maximize point spend and assemble a full build.
 * Run: npx tsx scripts/verify-presets.ts
 */
import {
  planSinPresetBuild,
  SIN_PRESETS,
  sinPresetTreePoints,
} from "../src/lib/game/sin/presets";
import { planTalentPresetRanks, TALENT_PRESETS } from "../src/lib/game/talentPresets";
import { spentTalentRanks } from "../src/lib/game/talents";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log("=== Sin presets ===");
for (const preset of SIN_PRESETS) {
  for (const pts of [0, 5, 12, 25, 40, 80, 120]) {
    const plan = planSinPresetBuild(preset, pts);
    assert(plan.leftover === 0 || plan.spent === 0, `${preset.id}@${pts}: leftover ${plan.leftover}`);
    assert(plan.spent <= pts || pts === 0, `${preset.id}@${pts}: spent ${plan.spent} > budget`);
    assert(
      plan.spent === plan.treeSpent + plan.powerSpent,
      `${preset.id}@${pts}: spend accounting`,
    );
    const unlockedHotbar = plan.hotbar.filter(Boolean).length;
    if (pts >= 12) {
      assert(unlockedHotbar >= 2, `${preset.id}@${pts}: hotbar too empty (${unlockedHotbar})`);
    } else if (pts >= 4) {
      assert(unlockedHotbar >= 1, `${preset.id}@${pts}: hotbar empty`);
    }
    // Guide cost includes power ranks to cap — only assert tree completion vs tree size.
    if (pts >= sinPresetTreePoints(preset)) {
      assert(!plan.trimmed, `${preset.id}@${pts}: should complete tree`);
      assert(Object.keys(plan.arts).length >= 1, `${preset.id}@${pts}: expected arts`);
    }
    console.log(
      `  ${preset.id} pts=${pts}: spent=${plan.spent} tree=${plan.treeSpent} power=${plan.powerSpent} leftover=${plan.leftover} arts=${Object.keys(plan.arts).length} hotbar=[${plan.hotbar.filter(Boolean).join(",")}] trimmed=${plan.trimmed}`,
    );
  }
}

console.log("=== Classic presets ===");
for (const preset of TALENT_PRESETS) {
  for (const pts of [5, 20, 50, 100]) {
    const plan = planTalentPresetRanks(preset, pts);
    const spent = spentTalentRanks(plan.ranks);
    assert(plan.leftover === 0, `${preset.id}@${pts}: leftover ${plan.leftover}`);
    assert(spent === plan.spent, `${preset.id}@${pts}: spent mismatch`);
    console.log(`  ${preset.id} pts=${pts}: spent=${plan.spent} leftover=${plan.leftover}`);
  }
}

console.log("OK");
