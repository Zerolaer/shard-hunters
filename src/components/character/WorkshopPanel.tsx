"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Anvil,
  Coins,
  Gem as GemIcon,
  Hammer,
  Merge,
  PackageOpen,
  Shirt,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_ENHANCE, RARITY_COLOR, SLOT_LABEL, STAT_LABEL } from "@/lib/game/constants";
import {
  GEM_NAME,
  GEM_RANK_LABEL,
  GEM_RANKS,
  GEMS_PER_FUSION,
  gemScore,
  nextGemRank,
} from "@/lib/game/gems";
import {
  enhanceMultiplier,
  formatAffix,
  formatNumber,
  itemPower,
} from "@/lib/game/formulas";
import {
  BLESSING,
  BLESSING_MATERIAL_LABEL,
  canBlessItem,
  canPunchItem,
  GEM_BAG_SIZE,
  GEM_RANK_ACCENT,
  SOCKET,
} from "@/lib/game/workshop";
import type { AffixStat, EquipSlot, Gem, GemRank, Item } from "@/lib/game/types";
import { useGameStore } from "@/store/useGameStore";
import { useUiStore } from "@/store/useUiStore";
import { ItemGlyph } from "./EquipmentDoll";
import { EchoCraftPanel } from "./EchoCraftPanel";
import { countEchoShards, ECHO_SHARD_PLURAL, isMaterialItem } from "@/lib/game/echoCraft";

function eligibleItems(inventory: Array<Item | null>, equipment: Record<EquipSlot, Item | null>) {
  const worn = Object.values(equipment).filter((it): it is Item => !!it);
  const bag = inventory.filter((it): it is Item => !!it);
  return [...worn, ...bag].filter((it) => !isMaterialItem(it) && it.enhanceLevel >= MAX_ENHANCE);
}

type BlessFx = "idle" | "charge" | "success" | "fail";

function blessPreviewRows(item: Item) {
  const m = enhanceMultiplier(item.enhanceLevel);
  const after = m * BLESSING.statMult;
  const rows: { label: string; before: string; after: string }[] = [];
  if (item.implicitAttack > 0) {
    rows.push({
      label: STAT_LABEL.attack,
      before: formatAffix("attack", item.implicitAttack * m),
      after: formatAffix("attack", item.implicitAttack * after),
    });
  }
  if (item.implicitDefense > 0) {
    rows.push({
      label: STAT_LABEL.defense,
      before: formatAffix("defense", item.implicitDefense * m),
      after: formatAffix("defense", item.implicitDefense * after),
    });
  }
  if (item.implicitHealth > 0) {
    rows.push({
      label: STAT_LABEL.health,
      before: formatAffix("health", item.implicitHealth * m),
      after: formatAffix("health", item.implicitHealth * after),
    });
  }
  for (const a of item.affixes) {
    rows.push({
      label: STAT_LABEL[a.stat as AffixStat],
      before: formatAffix(a.stat, a.value * m),
      after: formatAffix(a.stat, a.value * after),
    });
  }
  return rows;
}

export function WorkshopPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const equipment = useGameStore((s) => s.equipment);
  const gems = useGameStore((s) => s.gems);
  const resources = useGameStore((s) => s.resources);
  const blessItem = useGameStore((s) => s.blessItem);
  const punchItem = useGameStore((s) => s.punchItem);
  const socketGem = useGameStore((s) => s.socketGem);
  const unsocketGem = useGameStore((s) => s.unsocketGem);
  const fuseGems = useGameStore((s) => s.fuseGems);
  const discardGem = useGameStore((s) => s.discardGem);

  const mode = useUiStore((s) => s.workshopMode);
  const setMode = useUiStore((s) => s.setWorkshopMode);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [pendingSocket, setPendingSocket] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [blessFx, setBlessFx] = useState<BlessFx>("idle");
  const [blessResult, setBlessResult] = useState<"ok" | "fail" | null>(null);
  const blessBusy = useRef(false);

  const candidates = useMemo(() => eligibleItems(inventory, equipment), [inventory, equipment]);
  const item = candidates.find((it) => it.id === targetId) ?? candidates[0] ?? null;
  const sparks = resources.blessing ?? 0;
  const echoShards = countEchoShards(inventory);
  const equippedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const it of Object.values(equipment)) if (it) ids.add(it.id);
    return ids;
  }, [equipment]);

  const blessGate = canBlessItem(item);
  const punchGate = canPunchItem(item);
  const canAffordBless =
    resources.gold >= BLESSING.cost.gold &&
    resources.shards >= BLESSING.cost.shards &&
    sparks >= BLESSING.cost.sparks;
  const canAffordPunch =
    resources.gold >= SOCKET.cost.gold &&
    resources.shards >= SOCKET.cost.shards &&
    sparks >= SOCKET.cost.sparks;

  const byRank = useMemo(() => {
    const map = new Map<GemRank, Gem[]>();
    for (const rank of GEM_RANKS) map.set(rank, []);
    for (const gem of gems ?? []) map.get(gem.rank)?.push(gem);
    for (const list of map.values()) list.sort((a, b) => gemScore(b) - gemScore(a));
    return map;
  }, [gems]);

  const previewRows = useMemo(() => (item && mode === "bless" ? blessPreviewRows(item) : []), [item, mode]);
  const powerBefore = item ? itemPower(item) : 0;
  const powerAfter = useMemo(() => {
    if (!item || item.blessed) return powerBefore;
    return itemPower({ ...item, blessed: true });
  }, [item, powerBefore]);

  useEffect(() => {
    setBlessFx("idle");
    setBlessResult(null);
  }, [targetId, mode]);

  function run(action: () => { ok: boolean; message: string }) {
    const res = action();
    setMessage(res.message);
  }

  async function runBless() {
    if (!item || blessBusy.current || !blessGate.ok || !canAffordBless) return;
    blessBusy.current = true;
    setBlessResult(null);
    setBlessFx("charge");
    setMessage(null);
    await new Promise<void>((r) => window.setTimeout(r, 720));
    const res = blessItem(item.id);
    setMessage(res.message);
    setBlessResult(res.ok ? "ok" : "fail");
    setBlessFx(res.ok ? "success" : "fail");
    await new Promise<void>((r) => window.setTimeout(r, res.ok ? 900 : 850));
    setBlessFx("idle");
    blessBusy.current = false;
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 bg-black/25 p-1">
        {(
          [
            { id: "bless" as const, label: "Благословить", icon: Sparkles, active: "es-btn-amber" },
            { id: "socket" as const, label: "Пробить", icon: Hammer, active: "es-btn-cyan" },
            { id: "craft" as const, label: "Крафт", icon: Anvil, active: "es-btn-cyan" },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setPendingSocket(null);
                setMessage(null);
                setBlessFx("idle");
                setBlessResult(null);
              }}
              className={cn("es-btn h-9 text-xs", mode === t.id && t.active)}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8aa0b4]">
        {mode === "craft" ? (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#e4c36a]" />
            {formatNumber(echoShards)} {ECHO_SHARD_PLURAL.toLowerCase()}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#f43f5e]" />
            {formatNumber(sparks)} {BLESSING_MATERIAL_LABEL.toLowerCase()}
          </span>
        )}
        {message && mode !== "bless" ? <span className="text-white/70">{message}</span> : null}
      </div>

      {mode === "craft" ? (
        <EchoCraftPanel />
      ) : candidates.length === 0 ? (
        <div className="es-plate flex flex-col items-center gap-1.5 py-12 text-center">
          <PackageOpen className="h-8 w-8 text-white/20" />
          <p className="text-xs text-[#8aa0b4]">Нужен предмет +{MAX_ENHANCE}</p>
        </div>
      ) : mode === "bless" ? (
        <div className="flex min-h-0 flex-col gap-3">
          <div className="es-plate p-3">
            <div className="es-label mb-2">Выберите предмет +{MAX_ENHANCE}</div>
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((it) => {
                const worn = equippedIds.has(it.id);
                const selected = it.id === item?.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setTargetId(it.id);
                      setMessage(null);
                    }}
                    className={cn(
                      "es-slot relative h-14 w-14 overflow-hidden",
                      selected && "is-selected",
                      it.blessed && "item-blessed",
                    )}
                    style={{
                      boxShadow: `inset 0 2px 6px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${RARITY_COLOR[it.rarity]}`,
                    }}
                    title={`${it.name} +${it.enhanceLevel}${worn ? " · надето" : ""}`}
                  >
                    <div className="absolute inset-[3px] overflow-hidden rounded-[4px]">
                      <ItemGlyph item={it} compact />
                    </div>
                    {worn ? (
                      <span className="absolute bottom-0.5 left-0.5 z-[2] rounded bg-black/75 px-0.5 text-[8px] text-[var(--accent)]">
                        <Shirt className="inline h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {item ? (
            <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.95fr)]">
              <div
                className={cn(
                  "bless-altar es-plate relative overflow-hidden p-4",
                  blessFx === "charge" && "is-charge",
                  blessFx === "success" && "is-success",
                  blessFx === "fail" && "is-fail",
                )}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(244,63,94,0.14),transparent_55%)]" />
                <div className="relative flex flex-col items-center gap-3 text-center">
                  <div className="es-label">Алтарь благословения</div>
                  <div
                    className={cn(
                      "bless-relic es-slot relative h-20 w-20 overflow-hidden",
                      item.blessed && "item-blessed",
                    )}
                    style={{ boxShadow: `inset 0 0 0 2px ${RARITY_COLOR[item.rarity]}` }}
                  >
                    <ItemGlyph item={item} compact />
                    {blessFx === "charge" ? <span className="bless-charge-ring" aria-hidden /> : null}
                  </div>
                  <div>
                    <div
                      className="font-display text-[15px] leading-tight"
                      style={{ color: RARITY_COLOR[item.rarity] }}
                    >
                      {item.name} +{item.enhanceLevel}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8aa0b4]">
                      {SLOT_LABEL[item.slot]} · ур. {item.itemLevel}
                      {item.blessed ? " · уже блеснут" : ""}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8aa0b4]">
                    Шанс {(BLESSING.chance * 100).toFixed(0)}% · статы ×{BLESSING.statMult.toFixed(2)}
                  </div>
                </div>
              </div>

              <aside className="es-plate flex min-h-0 flex-col p-3">
                <div className="es-label mb-2">Дар благословения</div>
                {item.blessed ? (
                  <p className="text-[12px] text-[#8aa0b4]">Этот предмет уже несёт благословение.</p>
                ) : (
                  <>
                    <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-white/8 pb-2">
                      <span className="text-[11px] text-[#8aa0b4]">Сила предмета</span>
                      <span className="font-display text-sm tabular-nums text-white">
                        {powerBefore}
                        <span className="mx-1 text-[#8aa0b4]">→</span>
                        <span className="text-[#e4c36a]">{powerAfter}</span>
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                      {previewRows.map((row, i) => (
                        <div
                          key={`${row.label}-${i}`}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="truncate text-[#8aa0b4]">{row.label}</span>
                          <span className="shrink-0 tabular-nums text-white/80">
                            {row.before}
                            <span className="mx-1 text-[#6a7c8c]">→</span>
                            <span className="text-[#3ee0a0]">{row.after}</span>
                          </span>
                        </div>
                      ))}
                      {previewRows.length === 0 ? (
                        <p className="text-[11px] text-[#6a7c8c]">Нет статов для превью</p>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[10px] leading-snug text-[#6a7c8c]">
                      Камни в гнёздах не умножаются — благословение только для имплицитов и аффиксов.
                    </p>
                  </>
                )}
              </aside>
            </div>
          ) : null}

          {item ? (
            <div className="es-plate space-y-2.5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Cost gold={BLESSING.cost.gold} shards={BLESSING.cost.shards} sparks={BLESSING.cost.sparks} />
                {blessResult === "ok" ? (
                  <span className="text-[12px] font-medium text-[#4ade80]">Успех — предмет блеснут</span>
                ) : null}
                {blessResult === "fail" ? (
                  <span className="text-[12px] font-medium text-[#f87171]">
                    Неудача — искры сгорели, предмет цел
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void runBless()}
                disabled={!blessGate.ok || !canAffordBless || blessFx === "charge"}
                className="bless-cta es-btn es-btn-amber relative h-12 w-full overflow-hidden px-3"
                title={blessGate.ok ? "Благословить" : blessGate.reason}
              >
                <span
                  className={cn("bless-cta-fill", blessFx === "charge" && "is-running")}
                  aria-hidden
                />
                <span className="relative z-[1] inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {blessFx === "charge" ? "Ритуал…" : "Благословить"}
                </span>
              </button>
              {!blessGate.ok ? (
                <p className="text-[11px] text-[#6a7c8c]">{blessGate.reason}</p>
              ) : null}
              {message && blessResult ? (
                <p className="text-center text-[11px] text-white/65">{message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.95fr)]">
          <div className="flex flex-col gap-3">
            <div className="es-plate p-3">
              <div className="es-label mb-2">Предмет +{MAX_ENHANCE}</div>
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((it) => {
                  const worn = equippedIds.has(it.id);
                  const selected = it.id === item?.id;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        setTargetId(it.id);
                        setPendingSocket(null);
                        setMessage(null);
                      }}
                      className={cn(
                        "es-slot relative h-14 w-14 overflow-hidden",
                        selected && "is-selected",
                        it.blessed && "item-blessed",
                      )}
                      style={{
                        boxShadow: `inset 0 2px 6px rgba(0,0,0,0.55), inset 0 0 0 1.5px ${RARITY_COLOR[it.rarity]}`,
                      }}
                      title={`${it.name} +${it.enhanceLevel}${worn ? " · надето" : ""}`}
                    >
                      <div className="absolute inset-[3px] overflow-hidden rounded-[4px]">
                        <ItemGlyph item={it} compact />
                      </div>
                      {worn ? (
                        <span className="absolute bottom-0.5 left-0.5 z-[2] rounded bg-black/75 px-0.5 text-[8px] text-[var(--accent)]">
                          <Shirt className="inline h-2.5 w-2.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {item ? (
                <div className="es-well mt-3 flex items-center gap-2.5 px-2.5 py-2">
                  <div
                    className="es-slot relative h-12 w-12 shrink-0 overflow-hidden"
                    style={{ boxShadow: `inset 0 0 0 1.5px ${RARITY_COLOR[item.rarity]}` }}
                  >
                    <ItemGlyph item={item} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate font-display text-sm leading-tight"
                      style={{ color: RARITY_COLOR[item.rarity] }}
                    >
                      {item.name} +{item.enhanceLevel}
                      {item.blessed ? <span className="ml-1 text-[#f43f5e]">Блеснутая</span> : null}
                    </div>
                    <div className="text-[10px] text-[#8aa0b4]">
                      {SLOT_LABEL[item.slot]} · ур. {item.itemLevel}
                      {equippedIds.has(item.id) ? " · надето" : ""}
                      {" · сила "}
                      {itemPower(item)}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {item ? (
              <div className="es-plate space-y-3 p-3">
                <div className="font-display text-[14px] text-white">Пробивка гнёзд</div>
                {!item.sockets?.length ? (
                  <>
                    <p className="text-[11px] text-[#8aa0b4]">
                      1–{SOCKET.max} гнезда, случайно и навсегда. Нужна блеснутая вещь.
                    </p>
                    <Cost gold={SOCKET.cost.gold} shards={SOCKET.cost.shards} sparks={SOCKET.cost.sparks} />
                    <button
                      type="button"
                      onClick={() => run(() => punchItem(item.id))}
                      disabled={!punchGate.ok || !canAffordPunch}
                      className="es-btn es-btn-cyan h-10 w-full px-3"
                      title={punchGate.ok ? "Пробить" : punchGate.reason}
                    >
                      <Hammer className="h-4 w-4" /> Пробить
                    </button>
                    {!punchGate.ok ? (
                      <p className="text-[11px] text-[#6a7c8c]">{punchGate.reason}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="es-label">Гнёзда · клик: вставить / вынуть</div>
                    <div className="flex flex-wrap gap-2">
                      {item.sockets.map((gem, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (gem) {
                              run(() => unsocketGem(item.id, i));
                              setPendingSocket(null);
                            } else {
                              setPendingSocket(pendingSocket === i ? null : i);
                            }
                          }}
                          className={cn(
                            "es-slot flex h-14 w-14 flex-col items-center justify-center gap-0.5",
                            pendingSocket === i && "is-selected",
                          )}
                          style={gem ? { boxShadow: `inset 0 0 0 1px ${GEM_RANK_ACCENT[gem.rank]}` } : undefined}
                          title={
                            gem
                              ? `${GEM_NAME[gem.rank]} — вынуть`
                              : pendingSocket === i
                                ? "Выберите камень справа"
                                : "Пустое гнездо"
                          }
                        >
                          <GemIcon
                            className="h-4 w-4"
                            style={{ color: gem ? GEM_RANK_ACCENT[gem.rank] : "rgba(255,255,255,0.18)" }}
                          />
                          {gem ? (
                            <span className="max-w-[3.2rem] truncate text-[8px] text-white/55">
                              {gem.affixes[0] ? STAT_LABEL[gem.affixes[0].stat] : "·"}
                            </span>
                          ) : (
                            <span className="text-[8px] text-white/25">{pendingSocket === i ? "…" : "пусто"}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {item.sockets.some((g) => g) ? (
                      <div className="space-y-1 border-t border-white/8 pt-2">
                        {item.sockets.map((gem, i) => {
                          if (!gem) return null;
                          return (
                            <div key={`${gem.id}-${i}`} className="text-[11px]">
                              <span style={{ color: GEM_RANK_ACCENT[gem.rank] }}>{GEM_NAME[gem.rank]}</span>
                              <span className="ml-1.5 text-[#8aa0b4]">
                                {gem.affixes
                                  .map((a) => `${STAT_LABEL[a.stat]} ${formatAffix(a.stat, a.value)}`)
                                  .join(" · ")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="es-plate flex min-h-[280px] flex-col p-3">
            <div className="es-label mb-2 flex items-center gap-1.5">
              <GemIcon className="h-3.5 w-3.5 text-[#e4c36a]" />
              Сумка камней
              <span className="ml-auto tabular-nums text-[10px] normal-case text-[#8aa0b4]">
                {(gems ?? []).length}/{GEM_BAG_SIZE}
              </span>
            </div>
            {pendingSocket !== null ? (
              <p className="mb-2 text-[11px] text-[var(--accent)]">Выберите камень для гнезда #{pendingSocket + 1}</p>
            ) : null}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {GEM_RANKS.map((rank) => {
                const list = byRank.get(rank) ?? [];
                const next = nextGemRank(rank);
                return (
                  <div key={rank} className="es-well px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="shrink-0 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: GEM_RANK_ACCENT[rank] }}
                      >
                        {GEM_RANK_LABEL[rank]}
                      </span>
                      <span className="font-mono text-[11px] text-white/70">{list.length}</span>
                      {next ? (
                        <button
                          type="button"
                          onClick={() => run(() => fuseGems(rank))}
                          disabled={list.length < GEMS_PER_FUSION}
                          className="es-btn es-inv-control ml-auto px-2"
                          title={`${GEMS_PER_FUSION} → 1 ${GEM_RANK_LABEL[next]}`}
                        >
                          <Merge className="h-3 w-3" /> Скрестить
                        </button>
                      ) : null}
                    </div>
                    {list.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {list.slice(0, 24).map((gem) => (
                          <GemChip
                            key={gem.id}
                            gem={gem}
                            armed={pendingSocket !== null && !!item?.sockets}
                            onUse={() => {
                              if (pendingSocket === null || !item) return;
                              run(() => socketGem(item.id, pendingSocket, gem.id));
                              setPendingSocket(null);
                            }}
                            onDiscard={() => discardGem(gem.id)}
                          />
                        ))}
                        {list.length > 24 ? (
                          <span className="self-center text-[10px] text-[#8aa0b4]">+{list.length - 24}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GemChip({
  gem,
  armed,
  onUse,
  onDiscard,
}: {
  gem: Gem;
  armed: boolean;
  onUse: () => void;
  onDiscard: () => void;
}) {
  const accent = GEM_RANK_ACCENT[gem.rank];
  const summary = gem.affixes
    .map((a) => `${STAT_LABEL[a.stat]} ${formatAffix(a.stat, a.value)}`)
    .join(" · ");
  return (
    <span
      className="es-chip !gap-1 !px-1.5 !py-1 text-[10px]"
      style={{ borderColor: armed ? accent : undefined }}
      title={`${GEM_NAME[gem.rank]} — ${summary}`}
    >
      <button
        type="button"
        onClick={onUse}
        disabled={!armed}
        className="inline-flex items-center gap-1 disabled:cursor-default"
      >
        <GemIcon className="h-3 w-3" style={{ color: accent }} />
        <span className="text-white/80">{summary}</span>
      </button>
      <button type="button" onClick={onDiscard} className="text-white/25 hover:text-[#ff5a5f]" title="Выбросить">
        <Trash2 className="h-3 w-3" />
      </button>
    </span>
  );
}

function Cost({ gold, shards, sparks }: { gold: number; shards: number; sparks: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-[#8aa0b4]">
      <span className="inline-flex items-center gap-1">
        <Coins className="h-3 w-3 text-[#fbbf24]" />
        {formatNumber(gold)}
      </span>
      <span className="inline-flex items-center gap-1">
        <GemIcon className="h-3 w-3 text-white/50" />
        {shards}
      </span>
      <span className="inline-flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-[#f43f5e]" />
        {sparks}
      </span>
    </span>
  );
}
