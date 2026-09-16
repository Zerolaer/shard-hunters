"use client";

import { useMemo, useState } from "react";
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
  Wrench,
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
import { formatAffix, formatNumber, itemPower } from "@/lib/game/formulas";
import {
  BLESSING,
  BLESSING_MATERIAL_LABEL,
  canBlessItem,
  canPunchItem,
  GEM_BAG_SIZE,
  GEM_RANK_ACCENT,
  SOCKET,
} from "@/lib/game/workshop";
import type { EquipSlot, Gem, GemRank, Item } from "@/lib/game/types";
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

  function run(action: () => { ok: boolean; message: string }) {
    const res = action();
    setMessage(res.message);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="es-plate flex items-center gap-2 p-2.5">
        <Wrench className="h-4 w-4 text-[var(--accent)]" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] text-white">Мастерская</div>
          <div className="text-[10px] text-[#8aa0b4]">+{MAX_ENHANCE} предметы · благословение, гнёзда и крафт</div>
        </div>
        {mode === "craft" ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#e9d5ff]">
            <Sparkles className="h-3.5 w-3.5 text-[#c084fc]" />
            {formatNumber(echoShards)} {ECHO_SHARD_PLURAL.toLowerCase()}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#8aa0b4]">
            <Sparkles className="h-3.5 w-3.5 text-[#f43f5e]" />
            {formatNumber(sparks)} {BLESSING_MATERIAL_LABEL.toLowerCase()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 bg-black/20 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("bless");
            setPendingSocket(null);
            setMessage(null);
          }}
          className={cn(
            "es-btn h-9 text-xs",
            mode === "bless" && "es-btn-amber",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" /> Благословить
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("socket");
            setMessage(null);
          }}
          className={cn(
            "es-btn h-9 text-xs",
            mode === "socket" && "es-btn-cyan",
          )}
        >
          <Hammer className="h-3.5 w-3.5" /> Пробить
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("craft");
            setPendingSocket(null);
            setMessage(null);
          }}
          className={cn(
            "es-btn h-9 text-xs",
            mode === "craft" && "es-btn-cyan",
          )}
        >
          <Anvil className="h-3.5 w-3.5" /> Крафт
        </button>
      </div>

      {mode === "craft" ? (
        <EchoCraftPanel />
      ) : candidates.length === 0 ? (
        <div className="es-plate flex flex-col items-center gap-1.5 py-10 text-center">
          <PackageOpen className="h-8 w-8 text-white/20" />
          <p className="text-xs text-[#8aa0b4]">Нужен предмет +{MAX_ENHANCE}</p>
        </div>
      ) : (
        <>
          <div className="es-plate p-2.5">
            <div className="es-label mb-2">Предмет</div>
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
              <div className="es-well mt-2.5 flex items-center gap-2.5 px-2.5 py-2">
                <div
                  className="es-slot relative h-12 w-12 shrink-0 overflow-hidden"
                  style={{
                    boxShadow: `inset 0 0 0 1.5px ${RARITY_COLOR[item.rarity]}`,
                  }}
                >
                  <ItemGlyph item={item} compact />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate font-display text-sm leading-tight"
                    style={{ color: RARITY_COLOR[item.rarity] }}
                  >
                    {item.name} +{item.enhanceLevel}
                    {item.blessed && <span className="ml-1 text-[#f43f5e]">Блеснутая</span>}
                  </div>
                  <div className="text-[10px] text-[#8aa0b4]">
                    {SLOT_LABEL[item.slot]} · ур. {item.itemLevel}
                    {equippedIds.has(item.id) ? " · надето" : ""}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-white">сила {itemPower(item)}</span>
              </div>
            ) : null}
          </div>

          {item && mode === "bless" ? (
            <div className="es-plate space-y-2 p-2.5">
              <div className="es-label">Благословение</div>
              <p className="text-[11px] leading-snug text-[#8aa0b4]">
                +{Math.round((BLESSING.statMult - 1) * 100)}% ко всем статам. Шанс{" "}
                <span className="font-mono text-white/80">{(BLESSING.chance * 100).toFixed(0)}%</span>.
                Провал сжигает искры, предмет цел.
              </p>
              <Cost gold={BLESSING.cost.gold} shards={BLESSING.cost.shards} sparks={BLESSING.cost.sparks} />
              <button
                type="button"
                onClick={() => run(() => blessItem(item.id))}
                disabled={!blessGate.ok || !canAffordBless}
                className="es-btn es-btn-amber es-inv-control px-3"
                title={blessGate.ok ? "Благословить предмет" : blessGate.reason}
              >
                <Sparkles className="h-3.5 w-3.5" /> Благословить
              </button>
            </div>
          ) : null}

          {item && mode === "socket" ? (
            <div className="es-plate space-y-2 p-2.5">
              <div className="es-label">Пробивка гнёзд</div>
              <p className="text-[11px] leading-snug text-[#8aa0b4]">
                1–{SOCKET.max} гнезда, случайно и навсегда. Затем вставьте камни ниже.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => run(() => punchItem(item.id))}
                  disabled={!punchGate.ok || !canAffordPunch}
                  className="es-btn es-btn-cyan es-inv-control px-3"
                  title={punchGate.ok ? "Пробить гнёзда" : punchGate.reason}
                >
                  <Hammer className="h-3.5 w-3.5" /> Пробить
                </button>
                {punchGate.ok ? (
                  <Cost gold={SOCKET.cost.gold} shards={SOCKET.cost.shards} sparks={SOCKET.cost.sparks} />
                ) : (
                  <span className="text-[11px] text-[#6a7c8c]">{punchGate.reason}</span>
                )}
              </div>

              {item.sockets && item.sockets.length > 0 ? (
                <div className="border-t border-white/10 pt-2">
                  <div className="es-label mb-1.5">Гнёзда</div>
                  <div className="flex flex-wrap gap-1.5">
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
                          "es-slot flex h-12 w-12 items-center justify-center",
                          pendingSocket === i && "is-selected",
                        )}
                        style={gem ? { boxShadow: `inset 0 0 0 1px ${GEM_RANK_ACCENT[gem.rank]}` } : undefined}
                        title={
                          gem
                            ? `${GEM_NAME[gem.rank]} — нажмите, чтобы вынуть`
                            : "Пустое гнездо — выберите камень"
                        }
                      >
                        <GemIcon
                          className="h-4 w-4"
                          style={{ color: gem ? GEM_RANK_ACCENT[gem.rank] : "rgba(255,255,255,0.18)" }}
                        />
                      </button>
                    ))}
                  </div>
                  {item.sockets.some((g) => g) ? (
                    <div className="mt-1.5 space-y-0.5">
                      {item.sockets
                        .filter((g): g is Gem => !!g)
                        .flatMap((g) => g.affixes)
                        .map((a, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#8aa0b4]">{STAT_LABEL[a.stat]}</span>
                            <span className="font-mono text-white">{formatAffix(a.stat, a.value)}</span>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {message && <p className="text-xs text-white/70">{message}</p>}

      <div className="es-plate p-2.5">
        <div className="es-label mb-1.5 flex items-center gap-1.5">
          <GemIcon className="h-3.5 w-3.5 text-[#60a5fa]" />
          Камни
          <span className="ml-auto text-[10px] normal-case text-[#8aa0b4]">
            {(gems ?? []).length}/{GEM_BAG_SIZE}
          </span>
        </div>

        <div className="space-y-1.5">
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
                  {next && (
                    <button
                      type="button"
                      onClick={() => run(() => fuseGems(rank))}
                      disabled={list.length < GEMS_PER_FUSION}
                      className="es-btn es-inv-control ml-auto px-2"
                      title={`${GEMS_PER_FUSION} × ${GEM_RANK_LABEL[rank]} → 1 × ${GEM_RANK_LABEL[next]}`}
                    >
                      <Merge className="h-3 w-3" /> Скрестить
                    </button>
                  )}
                </div>
                {list.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {list.slice(0, 24).map((gem) => (
                      <GemChip
                        key={gem.id}
                        gem={gem}
                        armed={mode === "socket" && pendingSocket !== null && !!item?.sockets}
                        onUse={() => {
                          if (pendingSocket === null || !item) return;
                          run(() => socketGem(item.id, pendingSocket, gem.id));
                          setPendingSocket(null);
                        }}
                        onDiscard={() => discardGem(gem.id)}
                      />
                    ))}
                    {list.length > 24 && (
                      <span className="self-center text-[10px] text-[#8aa0b4]">+{list.length - 24}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
        <GemIcon className="h-3 w-3 text-[#c4b5fd]" />
        {shards}
      </span>
      <span className="inline-flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-[#f43f5e]" />
        {sparks}
      </span>
    </span>
  );
}
