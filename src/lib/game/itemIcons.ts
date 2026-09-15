import { RARITY_COLOR } from "./constants";
import type { EquipSlot, Item, Rarity } from "./types";

/**
 * Iconify PNG endpoint is dead (404). We use the JSON API body → SVG data URI
 * so icons stay colored PNGs visually without a broken remote PNG host.
 */
const ICONIFY_JSON = "https://api.iconify.design/game-icons.json";

/** Longer / more specific phrases first. */
const NAME_RULES: Array<{ match: RegExp; icons: string[] }> = [
  { match: /кинжал\s*тени|парирующий\s*клинок|стилет|кинжал/i, icons: ["plain-dagger", "stiletto", "bone-knife"] },
  { match: /клинок\s*тени|клинок/i, icons: ["broadsword", "crossed-swords", "spinning-sword"] },
  { match: /топор/i, icons: ["battle-axe", "sharp-axe", "wood-axe"] },
  { match: /копь[её]/i, icons: ["spear-feather", "trident", "arrowhead"] },
  { match: /длинный\s*лук|короткий\s*лук|лук/i, icons: ["bow-arrow", "high-shot", "arrow-dunk"] },
  { match: /посох|эфирный\s*стержень/i, icons: ["wizard-staff", "crystal-wand", "magic-gate"] },
  { match: /жезл/i, icons: ["crystal-wand", "lunar-wand", "fairy-wand"] },
  { match: /баклер|щит/i, icons: ["round-shield", "shield", "viking-shield"] },
  { match: /колчан|налучье/i, icons: ["quiver", "arrow-cluster", "target-arrows"] },
  { match: /сфера/i, icons: ["crystal-ball", "orb-direction", "crystal-shine"] },
  { match: /фолиант/i, icons: ["book-cover", "spell-book", "book-aura"] },
  { match: /капюшон/i, icons: ["hood", "cowled", "cloak"] },
  { match: /корона/i, icons: ["crown", "crown-coin", "crowned-skull"] },
  { match: /маска/i, icons: ["domino-mask", "cultist"] },
  { match: /шлем/i, icons: ["visored-helm", "barbute", "horned-helm"] },
  { match: /мантия/i, icons: ["robe", "cloak", "kimono"] },
  { match: /кираса|доспех/i, icons: ["chest-armor", "breastplate", "armor-vest"] },
  { match: /жилет/i, icons: ["leather-armor", "shirt", "armor-vest"] },
  { match: /боевые\s*рукавицы|рукавиц/i, icons: ["gauntlet", "mailed-fist", "fist"] },
  { match: /наручи/i, icons: ["bracer", "arm-bandage", "gloves"] },
  { match: /перчатк/i, icons: ["gauntlet", "gloves", "hand"] },
  { match: /сапог/i, icons: ["boots", "steeltoe-boots", "leg-armor"] },
  { match: /понож/i, icons: ["leg-armor", "greaves", "boots"] },
  { match: /след/i, icons: ["footprint", "barefoot", "boots"] },
  { match: /перстень|обруч|кольц/i, icons: ["ring", "diamond-ring"] },
  { match: /талисман|кулон|амулет/i, icons: ["gem-necklace", "pendant", "glowing-artifact"] },
];

const SLOT_FALLBACK: Record<EquipSlot, string[]> = {
  helmet: ["visored-helm", "barbute", "horned-helm"],
  armor: ["chest-armor", "breastplate", "leather-armor"],
  gloves: ["gauntlet", "gloves", "bracer"],
  boots: ["boots", "steeltoe-boots", "leg-armor"],
  weapon: ["broadsword", "battle-axe", "plain-dagger"],
  offhand: ["round-shield", "crystal-ball", "book-cover"],
  ring: ["ring", "diamond-ring"],
  amulet: ["gem-necklace", "pendant", "glowing-artifact"],
};

const RARITY_BIAS: Record<Rarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 1,
  legendary: 2,
  mythic: 2,
};

const svgCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function pickIcon(pool: string[], itemId: string, rarity: Rarity): string {
  const idx = (hashId(itemId) + RARITY_BIAS[rarity]) % pool.length;
  return pool[idx]!;
}

export function itemIconName(item: Pick<Item, "id" | "name" | "slot" | "rarity">): string {
  for (const rule of NAME_RULES) {
    if (rule.match.test(item.name)) {
      return pickIcon(rule.icons, item.id, item.rarity);
    }
  }
  return pickIcon(SLOT_FALLBACK[item.slot], item.id, item.rarity);
}

/** @deprecated PNG API 404 — prefer resolveItemIconDataUrl / ItemGlyph. Kept for callers. */
export function itemIconUrl(
  item: Pick<Item, "id" | "name" | "slot" | "rarity">,
  size = 64,
): string {
  const color = encodeURIComponent(RARITY_COLOR[item.rarity]);
  return `https://api.iconify.design/game-icons/${itemIconName(item)}.svg?color=${color}&height=${size}`;
}

function cacheKey(name: string, color: string, size: number) {
  return `${name}|${color}|${size}`;
}

function toDataUrl(body: string, color: string, size: number): string {
  const colored = body.includes("currentColor")
    ? body.replaceAll("currentColor", color)
    : body;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${colored}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function resolveItemIconDataUrl(
  item: Pick<Item, "id" | "name" | "slot" | "rarity">,
  size = 64,
): Promise<string | null> {
  const name = itemIconName(item);
  const color = RARITY_COLOR[item.rarity];
  const key = cacheKey(name, color, size);
  const hit = svgCache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    try {
      const res = await fetch(`${ICONIFY_JSON}?icons=${encodeURIComponent(name)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        icons?: Record<string, { body?: string }>;
        not_found?: string[];
      };
      const body = data.icons?.[name]?.body;
      if (!body) return null;
      const url = toDataUrl(body, color, size);
      svgCache.set(key, url);
      return url;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export function rarityGlow(rarity: Rarity): string {
  return RARITY_COLOR[rarity];
}
