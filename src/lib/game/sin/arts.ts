import type { SinArtId } from "../types";
import type { SinArtDef, SinSkillTag } from "./types";

export const SIN_ARTS: SinArtDef[] = [
  {
    id: "art-haste",
    name: "Молниеносность",
    description: "−22% перезарядки искусства. Ставится на любой навык.",
    supports: [],
  },
  {
    id: "art-crit",
    name: "Смертельный удар",
    description: "+12% шанса крита и +20% крит. урона этого навыка.",
    supports: ["attack", "crit", "melee"],
  },
  {
    id: "art-multistrike",
    name: "Серия клинков",
    description: "Навык бьёт ещё раз на 62% силы.",
    supports: ["attack", "melee", "aoe"],
  },
  {
    id: "art-poison",
    name: "Яд в ране",
    description: "Попадание накладывает +2 стака яда.",
    supports: ["attack", "poison", "bleed"],
  },
  {
    id: "art-duration",
    name: "Затяжное искусство",
    description: "+40% к длительности баффов, яда, скрытности, метки, клона.",
    supports: ["duration", "buff", "poison", "bleed", "stealth", "mark", "shade"],
  },
  {
    id: "art-execute",
    name: "Добивание",
    description: "+35% урона, если у цели меньше 40% HP.",
    supports: ["attack", "execute", "burst", "spender"],
  },
  {
    id: "art-economy",
    name: "Холодный расчёт",
    description: "Спендер тратит на 1 комбо / тень меньше (минимум 0).",
    supports: ["spender", "combo", "shade", "execute"],
  },
  {
    id: "art-fortify",
    name: "Теневой покров",
    description: "После применения следующие 2 удара по вам ослаблены на 25%.",
    supports: [],
  },
  {
    id: "art-bloodlust",
    name: "Жажда",
    description: "+18% урона, если на цели яд или кровотечение.",
    supports: ["attack", "poison", "bleed", "burst"],
  },
  {
    id: "art-mark",
    name: "Охотник",
    description: "+22% урона по меченой цели.",
    supports: ["attack", "mark", "execute", "opener"],
  },
  {
    id: "art-combo",
    name: "Ритм",
    description: "Генераторы дают +1 комбо.",
    supports: ["combo", "attack", "opener"],
  },
  {
    id: "art-echo",
    name: "Эхо тени",
    description: "20% шанс повторить навык на 50% силы (без стоимости ресурса).",
    supports: ["attack", "shade", "aoe", "burst"],
  },
];

export const SIN_ART_BY_ID: Record<SinArtId, SinArtDef> = Object.fromEntries(
  SIN_ARTS.map((a) => [a.id, a]),
) as Record<SinArtId, SinArtDef>;

export function artSupports(art: SinArtDef, tags: SinSkillTag[]) {
  if (art.supports.length === 0) return true;
  return art.supports.some((t) => tags.includes(t));
}
