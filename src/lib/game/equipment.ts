import { CLASS_DEFS } from "./classes";
import { isMaterialItem } from "./echoCraft";
import type { EquipSlot, HunterClass, Item } from "./types";

export function canWearItem(classId: HunterClass | null | undefined, item: Item) {
  if (isMaterialItem(item)) {
    return { ok: false, reason: "Это материал для крафта, его нельзя надеть." };
  }
  if (item.slot !== "weapon" && item.slot !== "offhand") return { ok: true, reason: "" };
  if (!item.classLock) return { ok: true, reason: "" };
  if (!classId) {
    return { ok: false, reason: "Сначала выберите класс — оружие привязано к нему." };
  }
  if (item.classLock === classId) return { ok: true, reason: "" };
  const need = CLASS_DEFS[item.classLock].name;
  const have = CLASS_DEFS[classId].name;
  const slot = item.slot === "weapon" ? "Оружие" : "Вторичка";
  return {
    ok: false,
    reason: `${slot} только для класса «${need}». Вы — «${have}». Можно продать или разобрать.`,
  };
}

export function needsClassLock(slot: EquipSlot) {
  return slot === "weapon" || slot === "offhand";
}
