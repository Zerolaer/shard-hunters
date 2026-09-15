"use client";

import { useEffect, useState } from "react";
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
  regionForLocation,
} from "@/lib/game/constants";
import { finalDropChance } from "@/lib/game/generators";
import { BM_FIT_LABEL, bmFit } from "@/lib/game/balance";
import {
  FARM_COLS,
  FARM_SPOT_BY_ID,
  SPOT_TIER_COLOR,
  SPOT_TIER_LABEL,
  spotsForLocation,
} from "@/lib/game/spots";
import { formatFullDigits } from "@/lib/game/formulas";
import { isDungeonLocationId } from "@/lib/game/dungeons";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Crown, Crosshair, Flame, Lock, MapPin, Swords } from "lucide-react";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

export function FarmMap() {
  const combatLoc = useGameStore((s) => s.combat.locationId);
  const unlocked = useGameStore((s) => s.progression.unlockedLocationIds);
  const locations = useGameStore((s) => s.progression.locations);
  const level = useGameStore((s) => s.character.level);
  const farm = useGameStore((s) => s.farm);
  const spotId = useGameStore((s) => s.combat.spotId);
  const mode = useGameStore((s) => s.combat.mode);
  const selectSpot = useGameStore((s) => s.selectSpot);
  const challengeSpot = useGameStore((s) => s.challengeSpot);
  const derived = useDerivedStats();

  const combatRegion = regionForLocation(combatLoc);
  const [viewRegionId, setViewRegionId] = useState(combatRegion.id);
  const [viewId, setViewId] = useState(combatLoc);

  useEffect(() => {
    if (isDungeonLocationId(combatLoc)) return;
    setViewRegionId(regionForLocation(combatLoc).id);
    setViewId(combatLoc);
  }, [combatLoc]);

  const region = REGIONS.find((r) => r.id === viewRegionId) ?? REGIONS[0]!;
  const regionLocs = locationsForRegion(region.id);
  const loc = LOCATIONS.find((l) => l.id === viewId) ?? regionLocs[0] ?? LOCATIONS[0]!;
  const spots = spotsForLocation(loc.id);
  const current = FARM_SPOT_BY_ID[spotId];
  const prog = locations[loc.id];
  const locEntryBm = locationEntryBm(loc);
  const locOpen =
    unlocked.includes(loc.id) && level >= loc.minLevel && derived.powerScore >= locEntryBm;
  const suggested = recommendedLocationId(level, derived.powerScore);

  return (
    <div className="flex flex-col gap-4">
      <div className="rp-card p-4">
        <RpHead
          icon={MapPin}
          title="Регионы и локации"
          meta={
            <>
              {region.name} · {loc.name} · этаж {prog?.floor ?? 1}/{MAX_FLOOR}
              {prog?.bossReady
                ? " · босс готов"
                : ` · ${((prog?.killsOnFloor ?? 0) % KILLS_FOR_BOSS)}/${KILLS_FOR_BOSS} до босса`}
            </>
          }
          action={
            <RpChip className={mode === "pvp" ? "text-[#ff8a8e]" : "text-[var(--accent)]"}>
              <Crosshair className="h-3 w-3" />
              {current?.name ?? "—"}
              {mode === "pvp" ? " · PvP" : ""}
            </RpChip>
          }
        />

        <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/35">Карта регионов</div>
        <div className="es-well relative mt-1.5 h-[148px] overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute left-[6%] top-[78%] h-px w-[88%] bg-white/10" />
            <div className="absolute left-[20%] top-[20%] h-[60%] w-px bg-white/10" />
            <div className="absolute left-[50%] top-[12%] h-[70%] w-px bg-white/10" />
            <div className="absolute left-[78%] top-[18%] h-[62%] w-px bg-white/10" />
          </div>
          {REGIONS.map((r) => {
            const anyOpen = locationsForRegion(r.id).some(
              (l) => unlocked.includes(l.id) && level >= l.minLevel,
            );
            const active = viewRegionId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                title={`${r.name} · ${r.blurb}`}
                onClick={() => {
                  setViewRegionId(r.id);
                  const inRegion = locationsForRegion(r.id);
                  const stay = inRegion.find((l) => l.id === combatLoc) ?? inRegion[0];
                  if (stay) setViewId(stay.id);
                }}
                className={cn(
                  "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-1 text-[10px] leading-none shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
                  active ? "border-[#fbbf24]/55 bg-black/75 text-white" : "border-white/15 bg-black/55 text-[#c5d0dc]",
                  !anyOpen && "opacity-55",
                )}
                style={{ left: `${r.mapX}%`, top: `${r.mapY}%` }}
              >
                {anyOpen ? (
                  <MapPin className="h-3 w-3" style={{ color: r.accent }} />
                ) : (
                  <Lock className="h-3 w-3 text-[#6a7c8c]" />
                )}
                <span className="max-w-[92px] truncate">{r.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Локации региона</div>
        {regionLocs.map((l) => {
          const entryBm = locationEntryBm(l);
          const open =
            unlocked.includes(l.id) && level >= l.minLevel && derived.powerScore >= entryBm;
          const active = viewId === l.id;
          const farming = combatLoc === l.id;
          const lp = locations[l.id];
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setViewId(l.id);
              }}
              className={cn(
                "rp-card w-full p-3 text-left transition hover:-translate-y-0.5",
                active && "border-[#fbbf24]/40",
                !open && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rp-icon" style={{ color: open ? l.accent : "#6a7c8c" }}>
                    {!open ? (
                      <Lock className="h-4 w-4" />
                    ) : l.kind === "boss" ? (
                      <Crown className="h-4 w-4" />
                    ) : l.kind === "elite" ? (
                      <Flame className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[14px] text-white">{l.name}</span>
                    <span className="mt-0.5 block text-[11px] text-[#8aa0b4]">{l.blurb}</span>
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <RpChip>
                    {LOCATION_KIND_LABEL[l.kind]} · ур. {l.minLevel}+ · {formatFullDigits(locationRecommendedBm(l))} БМ
                  </RpChip>
                  {suggested === l.id && open ? (
                    <span className="text-[10px] uppercase tracking-wide text-[#fbbf24]">под вас</span>
                  ) : null}
                  {farming ? (
                    <span className="text-[10px] uppercase tracking-wide text-[#fbbf24]">фарм</span>
                  ) : null}
                </div>
              </div>
              {open && lp ? (
                <p className="mt-2 text-[11px] text-[#8aa0b4]">
                  Этаж {lp.floor}/{MAX_FLOOR}
                  {lp.bossReady ? " · босс готов" : ` · ${lp.killsOnFloor % KILLS_FOR_BOSS}/${KILLS_FOR_BOSS} до босса`}
                  {lp.cleared ? " · зачищено" : ""}
                  {l.kind !== "normal" ? ` · опасность ×${l.threat.toFixed(2)}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#6a7c8c]">
                  {level >= l.minLevel && derived.powerScore < entryBm
                    ? `Проход закрыт: нужно ${formatFullDigits(entryBm)} БМ`
                    : `Нужен ${l.minLevel} уровень · ${formatFullDigits(locationRecommendedBm(l))} БМ`}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {locOpen ? (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Споты · {loc.name}</div>
              <p className="mt-0.5 text-[11px] text-[#8aa0b4]">Клик — занять / напасть. БМ спота сравнивается с вашей мощью.</p>
            </div>
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${FARM_COLS}, minmax(0, 1fr))` }}>
          {spots.map((spot) => {
            const occ = farm[spot.id]?.occupant ?? null;
            const mining = spotId === spot.id;
            const hostile = !!occ && !occ.isPlayer;
            const mine = occ?.isPlayer;
            const fit = bmFit(derived.powerScore, spot.requiredBm);
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  if (hostile) challengeSpot(spot.id);
                  else selectSpot(spot.id);
                }}
                className={cn(
                  "rp-card relative min-h-[118px] overflow-visible p-3 text-left transition hover:-translate-y-0.5",
                  mining && "border-[#fbbf24]/45 shadow-[0_0_22px_rgba(251,191,36,0.14)]",
                  mine && "bg-amber/10",
                  hostile && "bg-[#ff5a5f]/10",
                )}
                style={{ borderColor: SPOT_TIER_COLOR[spot.tier] + "99" }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[13px] font-medium text-white">{spot.name}</span>
                  {hostile && <Swords className="h-3.5 w-3.5 text-[#ff5a5f]" />}
                  {mining && <Crosshair className="h-3.5 w-3.5 text-amber" />}
                </div>
                <div className="mt-1.5 text-[10px] uppercase tracking-wide" style={{ color: SPOT_TIER_COLOR[spot.tier] }}>
                  {SPOT_TIER_LABEL[spot.tier]} · {formatFullDigits(spot.requiredBm)} БМ · {BM_FIT_LABEL[fit]}
                </div>
                <div className="text-[10px] text-[#6a7c8c]">
                  дроп {Math.round(finalDropChance("trash", 0, spot.dropChanceMult) * 100)}% · опыт ×{spot.xpMult.toFixed(2)} · золото ×
                  {spot.goldMult.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#6a7c8c]">
                  мобы ×{spot.danger.toFixed(2)} прочнее
                </div>
                <div className="mt-2 text-[12px] text-[#8aa0b4]">
                  {hostile && (
                    <>
                      {occ.name}
                      <span className="mt-0.5 block font-mono text-[#ff8a8e]">
                        {formatFullDigits(occ.power)} БМ · напасть
                      </span>
                    </>
                  )}
                  {mine && <span className="text-amber">Ваш спот</span>}
                  {!occ && <span>Свободно</span>}
                </div>
                {hostile && derived.powerScore < occ.power && (
                  <div className="mt-1.5 text-[10px] text-[#6a7c8c]">Сильнее вас · наберите БМ</div>
                )}
                {fit === "weak" && !hostile && (
                  <div className="mt-1.5 text-[10px] text-[#ff8a8e]">Мало БМ для спота</div>
                )}
              </button>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="rp-card p-4 text-[13px] text-[#8aa0b4]">
          {level >= loc.minLevel && derived.powerScore < locEntryBm
            ? `Зона держится на БМ: нужно ${formatFullDigits(locEntryBm)}. Точите, благословляйте, вставляйте камни.`
            : `Зона запечатана до ${loc.minLevel} уровня. Выберите открытую точку региона или вернитесь на карту.`}
        </div>
      )}
    </div>
  );
}
