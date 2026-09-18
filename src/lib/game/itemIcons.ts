import { RARITY_COLOR } from "./constants";
import type { EquipSlot, Item, Rarity } from "./types";

/**
 * Local painted / paint-over-3D PNG icons (Flare CC0 set under /public/icons).
 * Longer / more specific name phrases first.
 */
const NAME_RULES: Array<{ match: RegExp; icons: string[] }> = [
  {
    match: /кинжал\s*тени/i,
    icons: ["bases/kinzhal_teni.png", "bases/kinzhal.png", "bases/kinzhal_b.png"],
  },
  {
    match: /парирующий\s*клинок/i,
    icons: ["bases/pariruyushchiy_klinok.png", "bases/kinzhal.png", "bases/klinok_c.png"],
  },
  {
    match: /клинок\s*тени/i,
    icons: ["bases/klinok_teni.png", "bases/klinok_c.png", "bases/kinzhal.png"],
  },
  {
    match: /стилет/i,
    icons: ["bases/stilet.png", "bases/kinzhal.png", "bases/kinzhal_b.png"],
  },
  {
    match: /кинжал/i,
    icons: ["bases/kinzhal.png", "bases/kinzhal_b.png", "bases/stilet.png"],
  },
  {
    match: /длинный\s*лук/i,
    icons: ["bases/dlinnyy_luk.png", "bases/dlinnyy_luk_b.png", "bases/luk.png"],
  },
  {
    match: /короткий\s*лук/i,
    icons: ["bases/korotkiy_luk.png", "bases/korotkiy_luk_b.png", "bases/luk.png"],
  },
  {
    match: /лук/i,
    icons: ["bases/luk.png", "bases/luk_b.png", "bases/dlinnyy_luk.png"],
  },
  {
    match: /эфирный\s*стержень/i,
    icons: ["bases/efirnyy_sterzhen.png", "bases/efirnyy_sterzhen_b.png", "bases/posokh.png"],
  },
  {
    match: /посох/i,
    icons: ["bases/posokh.png", "bases/posokh_b.png", "bases/efirnyy_sterzhen.png"],
  },
  {
    match: /жезл/i,
    icons: ["bases/zhezl.png", "bases/zhezl_b.png", "bases/zhezl_c.png"],
  },
  {
    match: /копь[её]/i,
    icons: ["bases/kopye.png", "bases/efirnyy_sterzhen.png", "bases/klinok_d.png"],
  },
  {
    match: /топор/i,
    icons: ["bases/topor.png", "bases/topor_b.png", "bases/topor_c.png"],
  },
  {
    match: /клинок/i,
    icons: ["bases/klinok.png", "bases/klinok_b.png", "bases/klinok_d.png"],
  },
  {
    match: /баклер/i,
    icons: ["bases/bakler.png", "bases/bakler_b.png", "bases/shchit.png"],
  },
  {
    match: /щит/i,
    icons: ["bases/shchit.png", "bases/shchit_b.png", "bases/shchit_c.png"],
  },
  {
    match: /колчан/i,
    icons: ["bases/kolchan.png", "bases/luk.png", "bases/dlinnyy_luk.png"],
  },
  {
    match: /налучье/i,
    icons: ["bases/naluchye.png", "bases/kolchan.png", "bases/luk.png"],
  },
  {
    match: /сфера/i,
    icons: ["bases/sfera.png", "bases/sfera_b.png", "bases/amulet.png"],
  },
  {
    match: /фолиант/i,
    icons: ["bases/foliant.png", "bases/zhezl_b.png", "bases/posokh.png"],
  },
  {
    match: /капюшон/i,
    icons: ["bases/kapushon.png", "bases/kapushon_leather.png", "bases/maska.png"],
  },
  {
    match: /корона/i,
    icons: ["bases/korona.png", "bases/shlem.png", "bases/amulet.png"],
  },
  {
    match: /маска/i,
    icons: ["bases/maska.png", "bases/kapushon.png", "bases/shlem_b.png"],
  },
  {
    match: /шлем/i,
    icons: ["bases/shlem.png", "bases/shlem_b.png", "bases/korona.png"],
  },
  {
    match: /мантия/i,
    icons: ["bases/mantya.png", "bases/mantya_b.png", "bases/mantya_c.png"],
  },
  {
    match: /кираса/i,
    icons: ["bases/kirasa.png", "bases/dospekh.png", "bases/dospekh_b.png"],
  },
  {
    match: /доспех/i,
    icons: ["bases/dospekh.png", "bases/kirasa.png", "bases/dospekh_b.png"],
  },
  {
    match: /жилет/i,
    icons: ["bases/zhilet.png", "bases/zhilet_b.png", "bases/mantya.png"],
  },
  {
    match: /боевые\s*рукавицы|рукавиц/i,
    icons: ["bases/rukavitsy.png", "bases/perchatki.png", "bases/naruchi.png"],
  },
  {
    match: /наручи/i,
    icons: ["bases/naruchi.png", "bases/naruchi_b.png", "bases/perchatki_b.png"],
  },
  {
    match: /перчатк/i,
    icons: ["bases/perchatki.png", "bases/perchatki_b.png", "bases/perchatki_c.png"],
  },
  {
    match: /сапог/i,
    icons: ["bases/sapogi.png", "bases/sapogi_b.png", "bases/sapogi_c.png"],
  },
  {
    match: /понож/i,
    icons: ["bases/ponozhi.png", "bases/sapogi.png", "bases/sapogi_b.png"],
  },
  {
    match: /след/i,
    icons: ["bases/sledy.png", "bases/sledy_b.png", "bases/sapogi_c.png"],
  },
  {
    match: /перстень/i,
    icons: ["bases/persten.png", "bases/koltso.png", "bases/koltso_b.png"],
  },
  {
    match: /обруч/i,
    icons: ["bases/obruch.png", "bases/koltso_c.png", "bases/koltso.png"],
  },
  {
    match: /кольц/i,
    icons: ["bases/koltso.png", "bases/koltso_b.png", "bases/persten.png"],
  },
  {
    match: /талисман/i,
    icons: ["bases/talisman.png", "bases/amulet.png", "bases/kulon.png"],
  },
  {
    match: /кулон/i,
    icons: ["bases/kulon.png", "bases/amulet_b.png", "bases/talisman.png"],
  },
  {
    match: /амулет/i,
    icons: ["bases/amulet.png", "bases/amulet_b.png", "bases/talisman.png"],
  },
  {
    match: /осколок\s*эха|осколки\s*эха/i,
    icons: ["materials/echo-shard.png", "bases/sfera.png", "bases/sfera_b.png"],
  },
];

const SLOT_FALLBACK: Record<EquipSlot, string[]> = {
  helmet: ["slots/helmet.png", "bases/shlem.png", "bases/shlem_b.png"],
  armor: ["slots/armor.png", "bases/kirasa.png", "bases/dospekh.png"],
  gloves: ["slots/gloves.png", "bases/rukavitsy.png", "bases/perchatki.png"],
  boots: ["slots/boots.png", "bases/sapogi.png", "bases/ponozhi.png"],
  weapon: ["slots/weapon.png", "bases/klinok.png", "bases/topor.png"],
  offhand: ["slots/offhand.png", "bases/shchit.png", "bases/sfera.png"],
  ring: ["slots/ring.png", "bases/koltso.png", "bases/persten.png"],
  amulet: ["slots/amulet.png", "bases/amulet.png", "bases/talisman.png"],
  artifact1: ["bases/talisman.png", "bases/sfera.png", "bases/amulet.png"],
  artifact2: ["bases/talisman.png", "bases/sfera.png", "bases/amulet.png"],
  artifact3: ["bases/talisman.png", "bases/sfera.png", "bases/amulet.png"],
};

const MATERIAL_ICONS: Record<string, string[]> = {
  "echo-shard": ["materials/echo-shard.png", "bases/sfera.png"],
  "blessing-spark": ["bases/sfera.png", "bases/sfera_b.png", "materials/echo-shard.png"],
  "socket-hammer": ["bases/klinok.png", "bases/topor.png", "slots/weapon.png"],
};

const RARITY_BIAS: Record<Rarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 1,
  legendary: 2,
  mythic: 2,
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function pickIcon(pool: string[], itemId: string, rarity: Rarity): string {
  const idx = (hashId(itemId) + RARITY_BIAS[rarity]) % pool.length;
  return pool[idx]!;
}

function toPublicUrl(rel: string): string {
  return `/icons/${rel.replace(/^\/+/, "")}`;
}

/** Relative path under /public/icons (no leading slash). */
export function itemIconName(
  item: Pick<Item, "id" | "name" | "slot" | "rarity" | "kind" | "materialId">,
): string {
  if (item.kind === "material" && item.materialId) {
    const pool = MATERIAL_ICONS[item.materialId];
    if (pool?.length) return pickIcon(pool, item.id, item.rarity);
  }
  for (const rule of NAME_RULES) {
    if (rule.match.test(item.name)) {
      return pickIcon(rule.icons, item.id, item.rarity);
    }
  }
  return pickIcon(SLOT_FALLBACK[item.slot], item.id, item.rarity);
}

/** Absolute path for <img src> (local PNG). */
export function itemIconUrl(
  item: Pick<Item, "id" | "name" | "slot" | "rarity" | "kind" | "materialId">,
  _size = 64,
): string {
  return toPublicUrl(itemIconName(item));
}

/** Sync local PNG URL (replaces former Iconify data-URI resolver). */
export function resolveItemIconSrc(
  item: Pick<Item, "id" | "name" | "slot" | "rarity" | "kind" | "materialId">,
): string {
  return itemIconUrl(item);
}

/** @deprecated Prefer resolveItemIconSrc — kept for async call sites. */
export async function resolveItemIconDataUrl(
  item: Pick<Item, "id" | "name" | "slot" | "rarity" | "kind" | "materialId">,
  _size = 64,
): Promise<string | null> {
  return resolveItemIconSrc(item);
}

export function rarityGlow(rarity: Rarity): string {
  return RARITY_COLOR[rarity];
}
