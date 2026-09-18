"use client";

import { useMemo, useState } from "react";
import { Anvil, FlaskConical, MapPin, Package, Shirt, Sparkles, Sword } from "lucide-react";
import { cn } from "@/lib/cn";
import { RARITY_COLOR, RARITY_LABEL, SLOT_LABEL } from "@/lib/game/constants";
import {
  countEchoShards,
  ECHO_CHESTS,
  ECHO_SHARD_PLURAL,
  type EchoChestRarity,
} from "@/lib/game/echoCraft";
import { formatFullDigits, formatNumber } from "@/lib/game/formulas";
import { countMaterial } from "@/lib/game/materials";
import {
  POTION_INGREDIENT_BY_ID,
  POTION_KIND_LABEL,
  POTION_RECIPES,
  potionBlurb,
  type PotionKind,
} from "@/lib/game/potions";
import type { EquipSlot } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { spotsForLocation } from "@/lib/game/spots";

type CraftCat =
  | "chests"
  | "weapon"
  | "armor"
  | "accessories"
  | "artifacts"
  | "potions"
  | "materials";

const CATS: { id: CraftCat; label: string; icon: typeof Anvil }[] = [
  { id: "chests", label: "Сундуки эха", icon: Package },
  { id: "weapon", label: "Оружие", icon: Sword },
  { id: "armor", label: "Броня", icon: Shirt },
  { id: "accessories", label: "Аксессуары", icon: Sparkles },
  { id: "artifacts", label: "Артефакты", icon: Anvil },
  { id: "potions", label: "Зелья", icon: FlaskConical },
  { id: "materials", label: "Материалы", icon: Package },
];

const SLOT_GROUPS: Record<Exclude<CraftCat, "chests" | "potions" | "materials">, EquipSlot[]> = {
  weapon: ["weapon", "offhand"],
  armor: ["helmet", "armor", "gloves", "boots"],
  accessories: ["ring", "amulet"],
  artifacts: ["artifact1", "artifact2", "artifact3"],
};

const POTION_KINDS: PotionKind[] = ["attack", "defense", "accuracy", "crit", "haste"];

export function EchoCraftPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const gold = useGameStore((s) => s.resources.gold);
  const level = useGameStore((s) => s.character.level);
  const craftEchoChest = useGameStore((s) => s.craftEchoChest);
  const craftEchoSpecific = useGameStore((s) => s.craftEchoSpecific);
  const craftPotion = useGameStore((s) => s.craftPotion);
  const selectSpot = useGameStore((s) => s.selectSpot);
  const setTab = useUiStore((s) => s.setTab);
  const shards = countEchoShards(inventory);
  const [cat, setCat] = useState<CraftCat>("chests");
  const [rarity, setRarity] = useState<EchoChestRarity>("rare");
  const [slot, setSlot] = useState<EquipSlot>("weapon");
  const [potionKind, setPotionKind] = useState<PotionKind>("attack");
  const [potionGrade, setPotionGrade] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [message, setMessage] = useState<string | null>(null);

  const recipes = useMemo(
    () => POTION_RECIPES.filter((r) => r.kind === potionKind),
    [potionKind],
  );
  const potionRecipe = recipes.find((r) => r.grade === potionGrade) ?? recipes[0]!;
  const chest = ECHO_CHESTS.find((c) => c.rarity === rarity)!;
  const specificCost = chest.cost * 10;

  function goFarm(locationId: string) {
    const spots = spotsForLocation(locationId);
    const spot = spots[0];
    if (spot) selectSpot(spot.id);
    setTab("world");
  }

  return (
    <div className="es-plate flex min-h-[22rem] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-white/8 px-3 py-2.5">
        <Anvil className="h-4 w-4 text-[#e4c36a]" />
        <span className="font-display text-[14px] text-white">Кузница</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] tabular-nums text-[#f0d78c]">
          <Sparkles className="h-3.5 w-3.5" />
          {formatNumber(shards)} {ECHO_SHARD_PLURAL.toLowerCase()}
        </span>
        <span className="text-[11px] tabular-nums text-white/45">ур. {level}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_7.5rem] max-lg:grid-cols-1">
        <div className="min-h-0 space-y-1.5 overflow-y-auto border-r border-white/8 p-2 max-lg:border-r-0 max-lg:border-b">
          {cat === "chests"
            ? ECHO_CHESTS.map((c) => (
                <button
                  key={c.rarity}
                  type="button"
                  onClick={() => setRarity(c.rarity)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left",
                    rarity === c.rarity
                      ? "border-white/25 bg-white/10"
                      : "border-transparent hover:bg-white/[0.04]",
                  )}
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border"
                    style={{
                      borderColor: `${RARITY_COLOR[c.rarity]}66`,
                      background: `${RARITY_COLOR[c.rarity]}18`,
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] text-white">{c.title}</span>
                    <span className="text-[10px] text-[#8aa0b4]">
                      {c.cost} · {RARITY_LABEL[c.rarity]}
                    </span>
                  </span>
                </button>
              ))
            : null}

          {cat === "weapon" || cat === "armor" || cat === "accessories" || cat === "artifacts"
            ? SLOT_GROUPS[cat].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left",
                    slot === s
                      ? "border-white/25 bg-white/10"
                      : "border-transparent hover:bg-white/[0.04]",
                  )}
                >
                  <span className="text-[12px] text-white">{SLOT_LABEL[s]}</span>
                  <span className="text-[10px] text-[#8aa0b4]">×10</span>
                </button>
              ))
            : null}

          {cat === "potions"
            ? POTION_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPotionKind(k)}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-2 text-left text-[12px]",
                    potionKind === k
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-transparent text-white/60 hover:bg-white/[0.04]",
                  )}
                >
                  {POTION_KIND_LABEL[k]}
                </button>
              ))
            : null}

          {cat === "materials" ? (
            <p className="px-2 py-6 text-center text-[11px] text-white/35">
              Категория пока пуста — зарезервировано под расходники.
            </p>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col gap-3 border-r border-white/8 p-3 max-lg:border-r-0 max-lg:border-b">
          {cat === "chests" ? (
            <>
              <div>
                <div className="font-display text-[15px] text-white">{chest.title}</div>
                <p className="mt-1 text-[11px] text-[#8aa0b4]">{chest.hint}</p>
              </div>
              <div className="text-[11px] text-white/55">
                Случайный слот · {RARITY_LABEL[chest.rarity]} · ур. {level}
              </div>
              <button
                type="button"
                disabled={shards < chest.cost}
                onClick={() => setMessage(craftEchoChest(chest.rarity).message)}
                className="es-btn es-btn-cyan mt-auto h-11 w-full"
              >
                Крафт · {chest.cost} эха
              </button>
            </>
          ) : null}

          {cat === "weapon" || cat === "armor" || cat === "accessories" || cat === "artifacts" ? (
            <>
              <div>
                <div className="font-display text-[15px] text-white">{SLOT_LABEL[slot]}</div>
                <p className="mt-1 text-[11px] text-[#8aa0b4]">
                  Конкретный слот. Стоимость ×10 от случайного сундука той же редкости.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {ECHO_CHESTS.map((c) => (
                  <button
                    key={c.rarity}
                    type="button"
                    onClick={() => setRarity(c.rarity)}
                    className={cn(
                      "rounded border px-2 py-1 text-[10px]",
                      rarity === c.rarity ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/50",
                    )}
                  >
                    {RARITY_LABEL[c.rarity]}
                  </button>
                ))}
              </div>
              <div className="text-[11px] tabular-nums text-[#f0d78c]">
                {formatFullDigits(specificCost)} осколков эха
              </div>
              <button
                type="button"
                disabled={shards < specificCost}
                onClick={() => setMessage(craftEchoSpecific(rarity, slot).message)}
                className="es-btn es-btn-cyan mt-auto h-11 w-full"
              >
                Крафт ×10 · {SLOT_LABEL[slot]}
              </button>
            </>
          ) : null}

          {cat === "potions" && potionRecipe ? (
            <>
              <div>
                <div className="font-display text-[15px] text-white">{potionRecipe.name}</div>
                <p className="mt-1 text-[11px] text-[#8aa0b4]">{potionBlurb(potionRecipe)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {([1, 2, 3, 4, 5] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setPotionGrade(g)}
                    className={cn(
                      "rounded border px-2 py-1 text-[10px]",
                      potionGrade === g ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/50",
                    )}
                  >
                    G{g}
                  </button>
                ))}
              </div>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex justify-between text-white/60">
                  <span>Золото</span>
                  <span className={gold < potionRecipe.gold ? "text-[#fb7185]" : ""}>
                    {formatFullDigits(gold)} / {formatFullDigits(potionRecipe.gold)}
                  </span>
                </li>
                {potionRecipe.ingredients.map((ing) => {
                  const def = POTION_INGREDIENT_BY_ID[ing.id];
                  const have = countMaterial(inventory, ing.id);
                  return (
                    <li key={ing.id} className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left text-[var(--accent)] hover:underline"
                        onClick={() => def && goFarm(def.farmLocationId)}
                        title={def?.farmHint}
                      >
                        <MapPin className="h-3 w-3" />
                        {def?.name ?? ing.id}
                      </button>
                      <span className={have < ing.qty ? "text-[#fb7185]" : "text-white/60"}>
                        {have}/{ing.qty}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setMessage(craftPotion(potionRecipe.id).message)}
                className="es-btn es-btn-cyan mt-auto h-11 w-full"
              >
                Сварить · {formatFullDigits(potionRecipe.gold)} зол.
              </button>
            </>
          ) : null}

          {cat === "materials" ? (
            <p className="text-[11px] text-white/40">Выберите категорию справа.</p>
          ) : null}

          {message ? <p className="text-[11px] text-white/70">{message}</p> : null}
        </div>

        <aside className="flex flex-col gap-0.5 p-2 max-lg:flex-row max-lg:overflow-x-auto">
          {CATS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] transition max-lg:shrink-0",
                  cat === c.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {c.label}
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
