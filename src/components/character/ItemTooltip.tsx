"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, PackageOpen, Sparkles, Zap } from "lucide-react";
import { CLASS_DEFS } from "@/lib/game/classes";
import { RARITY_COLOR, RARITY_LABEL, SLOT_LABEL, STAT_LABEL } from "@/lib/game/constants";
import { canWearItem } from "@/lib/game/equipment";
import { echoQty, isMaterialItem } from "@/lib/game/echoCraft";
import {
  formatAffix,
  isPercentAffix,
  itemPower,
  itemStatMultiplier,
} from "@/lib/game/formulas";
import { GEM_NAME, socketedGems } from "@/lib/game/gems";
import { itemIconName, rarityGlow, resolveItemIconSrc } from "@/lib/game/itemIcons";
import { GEM_RANK_ACCENT } from "@/lib/game/workshop";
import type { AffixStat, EquipSlot, Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { cn } from "@/lib/cn";
import {
  INSPECTOR_STAT_ORDER,
  RARITY_ICONS,
  SLOT_ICONS,
  STAT_ICONS,
  asDefaultItem,
  withEnhanceLevel,
} from "./itemUi";

const CARD_W = "w-[20rem]";

function affixMap(item: Item | null) {
  const m = new Map<AffixStat, number>();
  if (!item) return m;
  const mul = itemStatMultiplier(item);
  if (item.implicitAttack) m.set("attack", (m.get("attack") ?? 0) + item.implicitAttack * mul);
  if (item.implicitDefense) m.set("defense", (m.get("defense") ?? 0) + item.implicitDefense * mul);
  if (item.implicitHealth) m.set("health", (m.get("health") ?? 0) + item.implicitHealth * mul);
  for (const a of item.affixes) {
    m.set(a.stat, (m.get(a.stat) ?? 0) + a.value * mul);
  }
  for (const gem of socketedGems(item)) {
    for (const a of gem.affixes) m.set(a.stat, (m.get(a.stat) ?? 0) + a.value);
  }
  return m;
}

function Delta({ stat, delta }: { stat: AffixStat; delta: number }) {
  if (Math.abs(delta) < 0.05) return null;
  const text = isPercentAffix(stat)
    ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
    : `${delta > 0 ? "+" : ""}${Math.round(delta)}`;
  return <span className={delta > 0 ? "ml-1 text-[#3ee0a0]" : "ml-1 text-[#ff5a5f]"}>{text}</span>;
}

function TooltipIcon({ item }: { item: Item }) {
  const glow = rarityGlow(item.rarity);
  const accent = RARITY_COLOR[item.rarity];
  const src = resolveItemIconSrc(item);
  const Fallback = SLOT_ICONS[item.slot];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.id, item.name, item.slot, item.rarity, item.kind, item.materialId]);

  return (
    <div
      className={cn(
        "es-slot relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden",
        item.blessed && "item-blessed",
      )}
      style={{ boxShadow: `inset 0 0 0 1.5px ${accent}` }}
      title={itemIconName(item)}
    >
      <span
        className="item-glyph-glow pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[58%]"
        style={{
          background: `radial-gradient(ellipse 95% 85% at 50% 115%, ${glow}65 0%, ${glow}32 35%, transparent 75%)`,
        }}
        aria-hidden
      />
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="item-glyph-art relative z-[1] h-full w-full object-contain p-2"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <Fallback className="relative z-[1] h-6 w-6 opacity-70" style={{ color: accent }} />
      )}
    </div>
  );
}

function SocketRow({ item }: { item: Item }) {
  if (!item.sockets?.length) return null;
  const filled = item.sockets.filter((g): g is NonNullable<typeof g> => !!g);
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">Гнёзда</span>
        <div className="flex items-center gap-1">
          {item.sockets.map((gem, i) => (
            <span
              key={i}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border"
              style={{
                borderColor: gem ? GEM_RANK_ACCENT[gem.rank] : "rgba(255,255,255,0.22)",
                background: gem ? `${GEM_RANK_ACCENT[gem.rank]}55` : "transparent",
                boxShadow: gem ? `0 0 8px ${GEM_RANK_ACCENT[gem.rank]}66` : undefined,
              }}
              title={gem ? GEM_NAME[gem.rank] : "Пустое гнездо"}
            />
          ))}
        </div>
        <span className="text-[10px] tabular-nums text-white/30">
          {filled.length}/{item.sockets.length}
        </span>
      </div>
      {filled.length > 0 ? (
        <div className="space-y-1">
          {item.sockets.map((gem, i) => {
            if (!gem) return null;
            const summary = gem.affixes
              .map((a) => `${STAT_LABEL[a.stat]} ${formatAffix(a.stat, a.value)}`)
              .join(" · ");
            return (
              <div
                key={`${gem.id}-${i}`}
                className="flex items-start gap-2 rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5"
              >
                <span
                  className="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: GEM_RANK_ACCENT[gem.rank] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium" style={{ color: GEM_RANK_ACCENT[gem.rank] }}>
                    {GEM_NAME[gem.rank]}
                  </div>
                  <div className="text-[10px] leading-snug text-white/50">{summary}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StatBlock({
  item,
  versus,
}: {
  item: Item;
  versus?: Item | null;
}) {
  const mine = affixMap(item);
  const theirs = affixMap(versus ?? null);
  const keys = INSPECTOR_STAT_ORDER.filter(
    (stat) => (mine.get(stat) ?? 0) !== 0 || (versus !== undefined && (theirs.get(stat) ?? 0) !== 0),
  );
  const leftovers = [...mine.keys(), ...theirs.keys()].filter((s) => !keys.includes(s));
  const ordered = [...keys, ...leftovers];

  if (ordered.length === 0) {
    return <div className="text-[12px] text-white/35">Нет характеристик</div>;
  }

  return (
    <div className="space-y-0.5">
      {ordered.map((stat) => {
        const a = mine.get(stat) ?? 0;
        const b = theirs.get(stat) ?? 0;
        const StatIcon = STAT_ICONS[stat];
        const better = versus !== undefined && a > b + 0.05;
        const worse = versus !== undefined && a < b - 0.05;
        return (
          <div
            key={stat}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px]",
              better && "bg-emerald-500/[0.06]",
              worse && "bg-rose-500/[0.06]",
            )}
          >
            <StatIcon className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <span className="min-w-0 flex-1 truncate text-white/55">{STAT_LABEL[stat]}</span>
            <span className="shrink-0 font-display text-[13px] font-medium tabular-nums text-white">
              {formatAffix(stat, a)}
              {versus !== undefined && <Delta stat={stat} delta={a - b} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MaterialCard({ item, className = CARD_W }: { item: Item; className?: string }) {
  const accent = RARITY_COLOR[item.rarity];
  const qty = echoQty(item);
  return (
    <div
      className={cn("es-tooltip overflow-hidden p-0", className)}
      style={{
        borderColor: `${accent}66`,
        boxShadow: `0 28px 70px rgba(0,0,0,0.78), 0 0 0 1px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div
        className="relative border-b border-white/10 px-3.5 pb-3 pt-3"
        style={{
          background: `linear-gradient(135deg, ${accent}28 0%, rgba(8,8,10,0.2) 55%, transparent 100%)`,
        }}
      >
        <div className="flex items-start gap-3">
          <TooltipIcon item={item} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#c084fc]">Материал · крафт</div>
            <div className="mt-1 font-display text-[16px] font-medium leading-snug tracking-tight" style={{ color: accent }}>
              {item.name}
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 items-center rounded-md border border-[#c084fc]/30 bg-[#c084fc]/10 px-2 text-[11px] tabular-nums text-[#e9d5ff]">
            ×{qty}
          </span>
        </div>
      </div>
      <div className="px-2.5 py-2.5 text-[11px] leading-snug text-[#8aa0b4]">
        Падает с любого врага. В мастерской, вкладка «Крафт», из осколков собирается сундук со случайной шмоткой вашего уровня.
      </div>
    </div>
  );
}

function ItemCard({
  item,
  badge,
  versus,
  className = CARD_W,
}: {
  item: Item;
  badge?: string;
  versus?: Item | null;
  className?: string;
}) {
  if (isMaterialItem(item)) {
    return <MaterialCard item={item} className={className} />;
  }
  return <GearItemCard item={item} badge={badge} versus={versus} className={className} />;
}

function GearItemCard({
  item,
  badge,
  versus,
  className = CARD_W,
}: {
  item: Item;
  badge?: string;
  versus?: Item | null;
  className?: string;
}) {
  const classId = useGameStore((s) => s.character.classId);
  const wear = canWearItem(classId, item);
  const power = itemPower(item);
  const versusPower = versus ? itemPower(versus) : versus === null ? 0 : null;
  const powerDelta = versusPower !== null ? power - versusPower : 0;
  const accent = RARITY_COLOR[item.rarity];
  const RarityIcon = RARITY_ICONS[item.rarity];
  const SlotIcon = SLOT_ICONS[item.slot];

  return (
    <div
      className={cn("es-tooltip overflow-hidden p-0", className)}
      style={{
        borderColor: `${accent}66`,
        boxShadow: `0 28px 70px rgba(0,0,0,0.78), 0 0 0 1px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Rarity ribbon header */}
      <div
        className="relative border-b border-white/10 px-3.5 pb-3 pt-3"
        style={{
          background: `linear-gradient(135deg, ${accent}28 0%, rgba(8,8,10,0.2) 55%, transparent 100%)`,
        }}
      >
        {badge ? (
          <div
            className="mb-2 inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em]"
            style={{ background: `${accent}22`, color: accent }}
          >
            {badge}
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <TooltipIcon item={item} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: accent }}>
              <RarityIcon className="h-3 w-3" />
              {RARITY_LABEL[item.rarity]}
              <span className="text-white/20">·</span>
              <SlotIcon className="h-3 w-3 text-white/45" />
              <span className="text-white/45">{SLOT_LABEL[item.slot]}</span>
            </div>
            <div className="mt-1 font-display text-[16px] font-medium leading-snug tracking-tight" style={{ color: accent }}>
              {item.name}
              {item.enhanceLevel > 0 ? (
                <span className="ml-1.5 tabular-nums text-amber-200/90">+{item.enhanceLevel}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 items-center rounded-md border border-white/10 bg-black/35 px-2 text-[11px] tabular-nums text-white/70">
            ур. {item.itemLevel}
          </span>
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-amber-300/20 bg-amber-400/10 px-2 text-[11px] text-amber-100/90">
            <Zap className="h-3 w-3 shrink-0 opacity-80" />
            <span className="tabular-nums">{power}</span>
            {versusPower !== null && powerDelta !== 0 ? (
              <span className={cn("tabular-nums", powerDelta > 0 ? "text-[#3ee0a0]" : "text-[#ff5a5f]")}>
                {powerDelta > 0 ? "+" : ""}
                {powerDelta}
              </span>
            ) : null}
          </span>
          {item.blessed ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/10 px-2 text-[11px] text-[#f43f5e]">
              <Sparkles className="h-3 w-3 shrink-0" />
              Блеснутая
            </span>
          ) : null}
          {item.classLock ? (
            <span
              className="inline-flex h-6 items-center rounded-md border px-2 text-[11px]"
              style={{
                color: CLASS_DEFS[item.classLock].accent,
                borderColor: `${CLASS_DEFS[item.classLock].accent}44`,
                background: `${CLASS_DEFS[item.classLock].accent}14`,
              }}
            >
              {CLASS_DEFS[item.classLock].name}
            </span>
          ) : null}
        </div>
        {!wear.ok ? <div className="mt-2 text-[11px] text-[#ff5a5f]">{wear.reason}</div> : null}
        <SocketRow item={item} />
      </div>

      <div className="px-2.5 py-2.5">
        <div className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.14em] text-white/30">Характеристики</div>
        <StatBlock item={item} versus={versus} />
      </div>
    </div>
  );
}

function EmptySlotCard({ slot }: { slot: EquipSlot }) {
  const SlotIcon = SLOT_ICONS[slot];
  return (
    <div className={cn("es-tooltip flex flex-col justify-center border-dashed p-4", CARD_W)}>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/35">
        <PackageOpen className="h-3 w-3" />
        Слот пуст
      </div>
      <div className="flex items-center gap-2 text-sm text-white/55">
        <SlotIcon className="h-4 w-4" />
        {SLOT_LABEL[slot]}
      </div>
    </div>
  );
}

export function ItemTooltip({ item, compare = true }: { item: Item; compare?: boolean }) {
  if (isMaterialItem(item)) return <ItemCard item={item} />;
  return <GearTooltip item={item} compare={compare} />;
}

function GearTooltip({ item, compare }: { item: Item; compare: boolean }) {
  const equipped = useGameStore((s) => s.equipment[item.slot]);
  const other = compare && equipped && equipped.id !== item.id ? equipped : undefined;
  return <ItemCard item={item} versus={other} />;
}

export function ItemInspector({
  item,
  previewLevel,
  compareDefaults = false,
}: {
  item: Item;
  previewLevel: number;
  compareDefaults?: boolean;
}) {
  if (isMaterialItem(item)) return <MaterialInspector item={item} />;
  return <GearInspector item={item} previewLevel={previewLevel} compareDefaults={compareDefaults} />;
}

function MaterialInspector({ item }: { item: Item }) {
  const accent = RARITY_COLOR[item.rarity];
  const qty = echoQty(item);
  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-xl border border-white/10"
        style={{
          borderColor: `${accent}44`,
          background: `linear-gradient(135deg, ${accent}18 0%, rgba(8,8,10,0.4) 60%)`,
        }}
      >
        <div className="flex items-start gap-3 p-3">
          <TooltipIcon item={item} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#c084fc]">Материал · крафт</div>
            <div className="mt-1 font-display text-lg font-medium leading-tight" style={{ color: accent }}>
              {item.name}
            </div>
            <div className="mt-1.5 text-[11px] tabular-nums text-[#e9d5ff]">×{qty}</div>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-snug text-[#8aa0b4]">
        Собирайте осколки с мобов и открывайте сундуки эха в мастерской. Уровень вещи = уровень персонажа.
      </p>
    </div>
  );
}

function GearInspector({
  item,
  previewLevel,
  compareDefaults = false,
}: {
  item: Item;
  previewLevel: number;
  compareDefaults?: boolean;
}) {
  const classId = useGameStore((s) => s.character.classId);
  const equipped = useGameStore((s) => s.equipment[item.slot]);
  const preview = compareDefaults ? asDefaultItem(item) : withEnhanceLevel(item, previewLevel);
  const emptySlot = !equipped;
  const versusBase = equipped && equipped.id !== item.id ? equipped : emptySlot ? null : equipped;
  const versus = compareDefaults
    ? versusBase
      ? asDefaultItem(versusBase)
      : null
    : versusBase ?? withEnhanceLevel(item, 0);
  const mine = affixMap(preview);
  const theirs = affixMap(versus);
  const stats = INSPECTOR_STAT_ORDER.filter((stat) => (mine.get(stat) ?? 0) !== 0 || (theirs.get(stat) ?? 0) !== 0);
  const wear = canWearItem(classId, item);
  const power = itemPower(preview);
  const versusPower = versus ? itemPower(versus) : 0;
  const powerDelta = versus ? power - versusPower : 0;
  const previewing = !compareDefaults && previewLevel !== item.enhanceLevel;
  const RarityIcon = RARITY_ICONS[item.rarity];
  const SlotIcon = SLOT_ICONS[item.slot];
  const accent = RARITY_COLOR[item.rarity];

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-xl border border-white/10"
        style={{
          borderColor: `${accent}44`,
          background: `linear-gradient(135deg, ${accent}18 0%, rgba(8,8,10,0.4) 60%)`,
        }}
      >
        <div className="flex items-start gap-3 p-3">
          <TooltipIcon item={item} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: accent }}>
              <RarityIcon className="h-3 w-3" />
              {RARITY_LABEL[item.rarity]}
              <span className="text-white/20">·</span>
              <SlotIcon className="h-3 w-3 text-white/45" />
              <span className="text-white/45">{SLOT_LABEL[item.slot]}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-display text-lg font-medium leading-tight" style={{ color: accent }}>
              <span className="min-w-0 truncate">{item.name}</span>
              {compareDefaults ? (
                <span className="shrink-0 text-[12px] font-normal text-white/45">базовый</span>
              ) : (
                <span className={cn("shrink-0 tabular-nums", previewing ? "text-[#fbbf24]" : "text-amber-200/90")}>
                  +{previewLevel}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/45">
              <span>ур. {item.itemLevel}</span>
              {item.blessed && !compareDefaults && <span className="text-[#f43f5e]">Блеснутая</span>}
              {item.classLock && (
                <span style={{ color: CLASS_DEFS[item.classLock].accent }}>{CLASS_DEFS[item.classLock].name}</span>
              )}
              {!wear.ok && <span className="text-[#ff5a5f]">{wear.reason}</span>}
            </div>
            {!compareDefaults ? <SocketRow item={item} /> : null}
          </div>
        </div>
      </div>

      <div className="es-well flex items-center gap-2 px-2.5 py-2">
        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]/80" />
        <div className="min-w-0 flex-1 text-[11px] leading-tight">
          {compareDefaults ? (
            <>
              <span className="text-white/80">дефолт</span>
              <span className="mx-1 text-white/30">vs</span>
              {emptySlot || !versusBase ? (
                <span className="text-[#8aa0b4]">не надето</span>
              ) : (
                <span className="text-white/80">
                  {versusBase.id === item.id ? "надето" : versusBase.name} · дефолт
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-[#fbbf24]">+{previewLevel}</span>
              <span className="mx-1 text-white/30">vs</span>
              {emptySlot ? (
                <span className="text-[#8aa0b4]">не надето</span>
              ) : (
                <span className="text-white/80">
                  {equipped!.id === item.id ? "надето" : equipped!.name} +{equipped!.enhanceLevel}
                </span>
              )}
            </>
          )}
        </div>
        <span className="shrink-0 font-display text-[12px] font-medium tabular-nums text-white">
          {power}
          {versus && powerDelta !== 0 && (
            <span className={powerDelta > 0 ? "ml-1 text-[#3ee0a0]" : "ml-1 text-[#ff5a5f]"}>
              {powerDelta > 0 ? "+" : ""}
              {powerDelta}
            </span>
          )}
        </span>
      </div>

      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-white/30">
          {compareDefaults ? "Базовые характеристики" : "Характеристики"}
        </div>
        <div className="space-y-0.5">
          {stats.map((stat) => {
            const a = mine.get(stat) ?? 0;
            const b = theirs.get(stat) ?? 0;
            const StatIcon = STAT_ICONS[stat];
            return (
              <div key={stat} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs">
                <StatIcon className="h-3.5 w-3.5 shrink-0 text-white/35" />
                <span className="min-w-0 flex-1 truncate text-white/55">{STAT_LABEL[stat]}</span>
                <span className="font-display font-medium tabular-nums text-white">
                  {formatAffix(stat, a)}
                  {versus ? <Delta stat={stat} delta={a - b} /> : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ItemCompareTooltip({ item, compare = true }: { item: Item; compare?: boolean }) {
  if (isMaterialItem(item)) return <ItemCard item={item} />;
  return <GearCompareTooltip item={item} compare={compare} />;
}

function GearCompareTooltip({ item, compare }: { item: Item; compare: boolean }) {
  const equipped = useGameStore((s) => s.equipment[item.slot]);
  if (!compare || (equipped && equipped.id === item.id)) {
    return <ItemCard item={item} badge={equipped?.id === item.id ? "Надето" : undefined} />;
  }
  const other = equipped && equipped.id !== item.id ? equipped : null;
  return (
    <div className="flex items-start gap-2.5">
      {other ? <ItemCard item={other} badge="Надето" /> : <EmptySlotCard slot={item.slot} />}
      <ItemCard item={item} badge="Новый" versus={other} />
    </div>
  );
}

export function ItemHoverTooltip({
  item,
  anchor,
  compare = true,
}: {
  item: Item;
  anchor: DOMRect;
  compare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: anchor.right + 10, top: anchor.top });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    let left = anchor.right + 10;
    let top = anchor.top;
    if (left + tw > window.innerWidth - 8) left = Math.max(8, anchor.left - tw - 10);
    if (top + th > window.innerHeight - 8) top = Math.max(8, window.innerHeight - th - 8);
    setPos({ left, top });
  }, [anchor, item.id, compare]);

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-none fixed z-[300]"
      style={{ left: pos.left, top: pos.top }}
    >
      <ItemCompareTooltip item={item} compare={compare} />
    </div>,
    document.body,
  );
}
