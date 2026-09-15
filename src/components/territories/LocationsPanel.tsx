"use client";

import { cn } from "@/lib/cn";
import {
  KILLS_FOR_BOSS,
  LOCATION_KIND_LABEL,
  locationsForRegion,
  locationEntryBm,
  locationRecommendedBm,
  MAX_FLOOR,
  recommendedLocationId,
  REGIONS,
} from "@/lib/game/constants";
import { formatFullDigits } from "@/lib/game/formulas";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Crown, Flame, Lock, MapPin } from "lucide-react";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

export function LocationsPanel() {
  const unlocked = useGameStore((s) => s.progression.unlockedLocationIds);
  const current = useGameStore((s) => s.combat.locationId);
  const locations = useGameStore((s) => s.progression.locations);
  const level = useGameStore((s) => s.character.level);
  const setLocation = useGameStore((s) => s.setLocation);
  const derived = useDerivedStats();
  const suggested = recommendedLocationId(level, derived.powerScore);

  return (
    <div className="flex flex-col gap-3">
      <div className="rp-card p-4">
        <RpHead icon={MapPin} title="Зоны" meta="Открытие по уровню. Фарм — по БМ." />
      </div>
      {REGIONS.map((region) => {
        const locs = locationsForRegion(region.id);
        return (
          <div key={region.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full" style={{ background: region.accent }} />
              <span className="font-display text-[13px] text-white">{region.name}</span>
              <span className="text-[11px] text-[#6a7c8c]">{region.blurb}</span>
            </div>
            {locs.map((loc) => {
              const entryBm = locationEntryBm(loc);
              const bmOk = derived.powerScore >= entryBm;
              const open = unlocked.includes(loc.id) && level >= loc.minLevel && bmOk;
              const prog = locations[loc.id];
              const active = current === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  disabled={!open}
                  onClick={() => setLocation(loc.id)}
                  className={cn(
                    "rp-card w-full p-4 text-left transition hover:-translate-y-0.5",
                    active && "border-[#fbbf24]/40",
                    !open && "opacity-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="rp-icon" style={{ color: open ? loc.accent : "#6a7c8c" }}>
                        {!open ? (
                          <Lock className="h-4 w-4" />
                        ) : loc.kind === "boss" ? (
                          <Crown className="h-4 w-4" />
                        ) : loc.kind === "elite" ? (
                          <Flame className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-[15px] text-white">{loc.name}</span>
                        <span className="mt-0.5 block text-[11px] text-[#8aa0b4]">{loc.blurb}</span>
                      </span>
                    </div>
                    <RpChip>
                      {LOCATION_KIND_LABEL[loc.kind]} · ур. {loc.minLevel}+ · {formatFullDigits(locationRecommendedBm(loc))} БМ
                    </RpChip>
                  </div>
                  {open && prog && (
                    <p className="mt-2 text-[12px] text-[#8aa0b4]">
                      Этаж {prog.floor}/{MAX_FLOOR}
                      {prog.bossReady ? " · босс готов" : ` · ${prog.killsOnFloor % KILLS_FOR_BOSS}/${KILLS_FOR_BOSS} до босса`}
                      {prog.cleared ? " · зачищено" : ""}
                      {suggested === loc.id ? " · под вас" : ""}
                    </p>
                  )}
                  {!open && (
                    <p className="mt-2 text-[12px] text-[#6a7c8c]">
                      {level >= loc.minLevel && !bmOk
                        ? `Проход закрыт: нужно ${formatFullDigits(entryBm)} БМ`
                        : `Нужен ${loc.minLevel} уровень · ${formatFullDigits(locationRecommendedBm(loc))} БМ`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
