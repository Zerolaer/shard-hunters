"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  KILLS_FOR_BOSS,
  LOCATION_KIND_LABEL,
  LOCATIONS,
  locationsForRegion,
  locationEntryBm,
  locationRecommendedBm,
  MAX_FLOOR,
  recommendedLocationId,
  REGIONS,
} from "@/lib/game/constants";
import { BM_FIT_LABEL, bmFit } from "@/lib/game/balance";
import {
  FARM_SPOT_BY_ID,
  SPOT_TIER_COLOR,
  SPOT_TIER_LABEL,
  spotsForLocation,
} from "@/lib/game/spots";
import { formatFullDigits, formatNumber } from "@/lib/game/formulas";
import { isDungeonLocationId } from "@/lib/game/dungeons";
import type { LocationDef } from "@/lib/game/locations";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Crosshair, Crown, Flame, Lock, MapPin, Swords } from "lucide-react";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

function locationBmRange(locationId: string) {
  const spots = spotsForLocation(locationId);
  if (spots.length === 0) return { min: 0, max: 0 };
  let min = spots[0]!.requiredBm;
  let max = min;
  for (const s of spots) {
    if (s.requiredBm < min) min = s.requiredBm;
    if (s.requiredBm > max) max = s.requiredBm;
  }
  return { min, max };
}

function formatBmRange(min: number, max: number) {
  if (min === max) return `${formatNumber(min)} БМ`;
  return `${formatNumber(min)}–${formatNumber(max)} БМ`;
}

function LocIcon({ loc, open }: { loc: LocationDef; open: boolean }) {
  if (!open) return <Lock className="h-4 w-4" />;
  if (loc.kind === "boss") return <Crown className="h-4 w-4" />;
  if (loc.kind === "elite") return <Flame className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
}

export function FarmMap() {
  const combatLoc = useGameStore((s) => s.combat.locationId);
  const unlocked = useGameStore((s) => s.progression.unlockedLocationIds);
  const locations = useGameStore((s) => s.progression.locations);
  const level = useGameStore((s) => s.character.level);
  const farm = useGameStore((s) => s.farm);
  const spotId = useGameStore((s) => s.combat.spotId);
  const selectSpot = useGameStore((s) => s.selectSpot);
  const challengeSpot = useGameStore((s) => s.challengeSpot);
  const derived = useDerivedStats();

  const [selectedLocId, setSelectedLocId] = useState<string | null>(
    isDungeonLocationId(combatLoc) ? null : combatLoc,
  );
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const suggested = recommendedLocationId(level, derived.powerScore);
  const selected =
    LOCATIONS.find((l) => l.id === selectedLocId) ??
    LOCATIONS.find((l) => l.id === combatLoc) ??
    LOCATIONS[0]!;
  const spots = spotsForLocation(selected.id);
  const prog = locations[selected.id];
  const entryBm = locationEntryBm(selected);
  const locOpen =
    unlocked.includes(selected.id) && level >= selected.minLevel && derived.powerScore >= entryBm;
  const bm = locationBmRange(selected.id);
  const fit = bmFit(derived.powerScore, locationRecommendedBm(selected));

  const regions = useMemo(
    () =>
      REGIONS.map((region) => ({
        region,
        locs: locationsForRegion(region.id),
      })).filter((r) => r.locs.length > 0),
    [],
  );

  function onPickSpot(id: string) {
    if (!locOpen) return;
    const occ = farm[id]?.occupant ?? null;
    const result = occ && !occ.isPlayer ? challengeSpot(id) : selectSpot(id);
    setActionMsg(result.ok ? null : result.message);
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rp-card p-4">
        <RpHead
          icon={MapPin}
          title="Карта охоты"
          meta="Выберите зону, затем спот. Прогресс — этажи и босс."
        />
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#8aa0b4]">
          <RpChip>Ваш БМ {formatFullDigits(derived.powerScore)}</RpChip>
          {suggested ? (
            <RpChip>
              Рекомендуем: {LOCATIONS.find((l) => l.id === suggested)?.name ?? suggested}
            </RpChip>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
          {regions.map(({ region, locs }) => (
            <div key={region.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1 pt-1">
                <span className="h-2 w-2 rounded-full" style={{ background: region.accent }} />
                <span className="font-display text-[13px] text-white">{region.name}</span>
                <span className="truncate text-[11px] text-[#6a7c8c]">{region.blurb}</span>
              </div>
              {locs.map((loc) => {
                const eBm = locationEntryBm(loc);
                const open =
                  unlocked.includes(loc.id) && level >= loc.minLevel && derived.powerScore >= eBm;
                const active = selected.id === loc.id;
                const here = combatLoc === loc.id;
                const range = locationBmRange(loc.id);
                const p = locations[loc.id];
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocId(loc.id);
                      setActionMsg(null);
                    }}
                    className={cn(
                      "rp-card w-full p-3 text-left transition hover:-translate-y-0.5",
                      active && "border-[#fbbf24]/45",
                      here && "bg-white/[0.03]",
                      !open && "opacity-55",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className="rp-icon mt-0.5"
                          style={{ color: open ? loc.accent : "#6a7c8c" }}
                        >
                          <LocIcon loc={loc} open={open} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="block font-display text-[14px] text-white">{loc.name}</span>
                            {here ? (
                              <span className="rounded bg-[#fbbf24]/15 px-1 text-[9px] uppercase tracking-wide text-[#fbbf24]">
                                здесь
                              </span>
                            ) : null}
                            {loc.id === suggested ? (
                              <span className="rounded bg-emerald-400/15 px-1 text-[9px] uppercase tracking-wide text-emerald-300/90">
                                ок
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#8aa0b4]">{loc.blurb}</span>
                        </span>
                      </div>
                      <div className="shrink-0 text-right text-[10px] leading-4 text-[#8aa0b4]">
                        <div>{LOCATION_KIND_LABEL[loc.kind]} · ур. {loc.minLevel}+</div>
                        <div className="tabular-nums text-white/70">{formatBmRange(range.min, range.max)}</div>
                        {p ? (
                          <div>
                            эт. {p.floor}/{MAX_FLOOR}
                            {p.bossReady ? " · босс!" : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rp-card flex min-h-0 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-display text-[16px] text-white">{selected.name}</div>
              <div className="mt-0.5 text-[11px] text-[#8aa0b4]">{selected.blurb}</div>
            </div>
            <RpChip>
              {BM_FIT_LABEL[fit]}
            </RpChip>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-[#8aa0b4]">
            <RpChip>{formatBmRange(bm.min, bm.max)}</RpChip>
            <RpChip>
              Этаж {prog?.floor ?? 1}/{MAX_FLOOR}
              {prog?.bossReady ? ` · босс через 0 (готов)` : ` · до босса ${(KILLS_FOR_BOSS - ((prog?.killsOnFloor ?? 0) % KILLS_FOR_BOSS)) % KILLS_FOR_BOSS || KILLS_FOR_BOSS}`}
            </RpChip>
            {!locOpen ? (
              <RpChip>
                {!unlocked.includes(selected.id) || level < selected.minLevel
                  ? `Закрыто · ур. ${selected.minLevel}+`
                  : `Нужно ${formatFullDigits(entryBm)} БМ`}
              </RpChip>
            ) : null}
          </div>

          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Споты</div>
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            {spots.map((spot) => {
              const occ = farm[spot.id]?.occupant ?? null;
              const active = spotId === spot.id && combatLoc === selected.id;
              const fitSpot = bmFit(derived.powerScore, spot.requiredBm);
              return (
                <button
                  key={spot.id}
                  type="button"
                  disabled={!locOpen}
                  onClick={() => onPickSpot(spot.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2.5 text-left transition",
                    active && "border-[#fbbf24]/40 bg-[#fbbf24]/08",
                    locOpen && "hover:border-white/20 hover:bg-white/[0.04]",
                    !locOpen && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: SPOT_TIER_COLOR[spot.tier] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] text-white">{spot.name}</span>
                      <span className="text-[10px] text-[#8aa0b4]">{SPOT_TIER_LABEL[spot.tier]}</span>
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#6a7c8c]">
                      {formatFullDigits(spot.requiredBm)} БМ · {BM_FIT_LABEL[fitSpot]}
                      {occ
                        ? occ.isPlayer
                          ? " · вы здесь"
                          : ` · ${occ.name} (${formatFullDigits(occ.power)})`
                        : " · свободно"}
                    </span>
                  </span>
                  {occ && !occ.isPlayer ? (
                    <Swords className="h-3.5 w-3.5 shrink-0 text-[#fb7185]" />
                  ) : active ? (
                    <Crosshair className="h-3.5 w-3.5 shrink-0 text-[#fbbf24]" />
                  ) : null}
                </button>
              );
            })}
            {spots.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[#6a7c8c]">В этой зоне нет спотов</p>
            ) : null}
          </div>

          {actionMsg ? <p className="text-[11px] text-[#fb7185]">{actionMsg}</p> : null}
          <p className="text-[10px] leading-snug text-[#6a7c8c]">
            Занятый спот — нападение (PvP). Свободный — сразу начать фарм. Босс этажа открывается
            после {KILLS_FOR_BOSS} убийств; его БМ = БМ зоны, но бой усилен скрытым индексом ×5.
            В дропе зоны: экип, осколки эха, камни, ингредиенты зелий и артефакты (редко).
          </p>
        </div>
      </div>
    </div>
  );
}
