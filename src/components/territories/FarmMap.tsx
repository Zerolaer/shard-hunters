"use client";

import { useEffect, useMemo, useState } from "react";
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
  FARM_SPOT_BY_ID,
  SPOT_TIER_COLOR,
  SPOT_TIER_LABEL,
  spotsForLocation,
} from "@/lib/game/spots";
import { formatFullDigits } from "@/lib/game/formulas";
import { isDungeonLocationId } from "@/lib/game/dungeons";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Crown, Crosshair, Flame, Lock, MapPin, Swords } from "lucide-react";

function pinForLocation(locationId: string, index: number, total: number, regionX: number, regionY: number) {
  const spread = Math.min(9, 4 + total * 1.4);
  const t = total <= 1 ? 0 : (index / (total - 1)) * Math.PI - Math.PI / 2;
  return {
    x: Math.min(96, Math.max(4, regionX + Math.cos(t) * spread)),
    y: Math.min(92, Math.max(8, regionY + Math.sin(t) * spread * 0.62)),
  };
}

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
  const dropBonus = derived.dropBonus;

  const pins = useMemo(() => {
    return regionLocs.map((l, i) => ({
      loc: l,
      ...pinForLocation(l.id, i, regionLocs.length, region.mapX, region.mapY),
    }));
  }, [region.mapX, region.mapY, regionLocs]);

  return (
    <div className="flex flex-col gap-3">
      <div className="world-map relative min-h-[280px] overflow-hidden rounded-xl border border-white/10">
        <div className="pointer-events-none absolute inset-0 world-map-bg" />
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
                "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center",
                !anyOpen && "opacity-50",
              )}
              style={{ left: `${r.mapX}%`, top: `${r.mapY}%` }}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full border shadow-[0_0_16px_rgba(0,0,0,0.45)]",
                  active ? "scale-125 border-white" : "border-white/30",
                )}
                style={{ background: r.accent, boxShadow: active ? `0 0 18px ${r.accent}` : undefined }}
              />
              <span
                className={cn(
                  "mt-1 max-w-[88px] truncate rounded-md px-1.5 py-0.5 text-[10px] leading-none",
                  active ? "bg-black/75 text-white" : "bg-black/45 text-[#c5d0dc]",
                )}
              >
                {r.name}
              </span>
            </button>
          );
        })}
        {pins.map(({ loc: l, x, y }) => {
          const open = unlocked.includes(l.id) && level >= l.minLevel;
          const active = viewId === l.id;
          const farming = combatLoc === l.id;
          return (
            <button
              key={l.id}
              type="button"
              title={l.name}
              onClick={() => setViewId(l.id)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {open ? (
                l.kind === "boss" ? (
                  <Crown className="h-3.5 w-3.5" style={{ color: active ? "#fff" : l.accent }} />
                ) : l.kind === "elite" ? (
                  <Flame className="h-3.5 w-3.5" style={{ color: active ? "#fff" : l.accent }} />
                ) : (
                  <MapPin className="h-3.5 w-3.5" style={{ color: active ? "#fff" : l.accent }} />
                )
              ) : (
                <Lock className="h-3 w-3 text-[#6a7c8c]" />
              )}
              {farming ? (
                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rp-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-[15px] text-white">{loc.name}</div>
            <p className="mt-0.5 text-[11px] text-[#8aa0b4]">{loc.blurb}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-white/55">
              <span className="rounded border border-white/10 px-1.5 py-0.5">
                {LOCATION_KIND_LABEL[loc.kind]} · ур. {loc.minLevel}+
              </span>
              <span className="rounded border border-white/10 px-1.5 py-0.5 tabular-nums">
                {formatFullDigits(locationRecommendedBm(loc))} БМ
              </span>
              {prog ? (
                <span className="rounded border border-white/10 px-1.5 py-0.5">
                  этаж {prog.floor}/{MAX_FLOOR}
                  {prog.bossReady
                    ? " · босс"
                    : ` · ${prog.killsOnFloor % KILLS_FOR_BOSS}/${KILLS_FOR_BOSS}`}
                </span>
              ) : null}
              {suggested === loc.id && locOpen ? (
                <span className="rounded border border-[#fbbf24]/35 px-1.5 py-0.5 text-[#fbbf24]">под вас</span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right text-[10px] text-[#8aa0b4]">
            {current?.name ?? "—"}
            {mode === "pvp" ? " · PvP" : ""}
          </div>
        </div>
        {!locOpen ? (
          <p className="mt-2 text-[12px] text-[#6a7c8c]">
            {level >= loc.minLevel && derived.powerScore < locEntryBm
              ? `Проход закрыт: нужно ${formatFullDigits(locEntryBm)} БМ`
              : `Нужен ${loc.minLevel} уровень · ${formatFullDigits(locationRecommendedBm(loc))} БМ`}
          </p>
        ) : null}
      </div>

      {locOpen ? (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Споты · клик занять / напасть</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {spots.map((spot) => {
              const occ = farm[spot.id]?.occupant ?? null;
              const mining = spotId === spot.id;
              const hostile = !!occ && !occ.isPlayer;
              const mine = occ?.isPlayer;
              const fit = bmFit(derived.powerScore, spot.requiredBm);
              const dropPct = Math.round(finalDropChance("trash", dropBonus, spot.dropChanceMult) * 100);
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => {
                    if (hostile) challengeSpot(spot.id);
                    else selectSpot(spot.id);
                  }}
                  className={cn(
                    "rp-card p-3 text-left transition hover:-translate-y-0.5",
                    mining && "border-[#fbbf24]/45",
                    hostile && "bg-[#ff5a5f]/10",
                  )}
                  style={{ borderColor: SPOT_TIER_COLOR[spot.tier] + "99" }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-medium text-white">{spot.name}</span>
                    {hostile && <Swords className="h-3.5 w-3.5 text-[#ff5a5f]" />}
                    {mining && <Crosshair className="h-3.5 w-3.5 text-amber" />}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: SPOT_TIER_COLOR[spot.tier] }}>
                    {SPOT_TIER_LABEL[spot.tier]} · {formatFullDigits(spot.requiredBm)} БМ · {BM_FIT_LABEL[fit]}
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] text-[#8aa0b4]">
                    <span>дроп {dropPct}%</span>
                    <span>опыт ×{spot.xpMult.toFixed(2)}</span>
                    <span>золото ×{spot.goldMult.toFixed(2)}</span>
                  </div>
                  <div className="mt-1.5 text-[12px] text-[#8aa0b4]">
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
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
