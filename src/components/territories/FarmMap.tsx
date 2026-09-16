"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatFullDigits, formatNumber } from "@/lib/game/formulas";
import { isDungeonLocationId } from "@/lib/game/dungeons";
import type { LocationDef } from "@/lib/game/locations";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { Crosshair, Lock, Minus, Plus, Swords, X } from "lucide-react";

const VW = 1000;
const VH = 700;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.8;
const ZOOM_STEP = 0.22;

/** Deterministic jitter so locations fan out around their region pin. */
function locPin(regionX: number, regionY: number, index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = total <= 1 ? 0 : 28 + (index % 2) * 10;
  return {
    x: clamp(regionX + Math.cos(angle) * radius, 40, VW - 40),
    y: clamp(regionY + Math.sin(angle) * radius * 0.72, 36, VH - 36),
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pctToMap(x: number, y: number) {
  return { x: (x / 100) * VW, y: (y / 100) * VH };
}

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

function TerrainBackdrop() {
  return (
    <g aria-hidden>
      <defs>
        <pattern id="farm-grain" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 18V0H18" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
        <radialGradient id="farm-fog" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="rgba(228,195,106,0.07)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect width={VW} height={VH} fill="url(#farm-grain)" />
      <rect width={VW} height={VH} fill="url(#farm-fog)" />
      <path
        d="M40 520 C120 480, 180 560, 280 540 C380 520, 420 460, 520 480 C640 510, 720 560, 820 530 C900 510, 960 560, 980 600 L980 680 L40 680 Z"
        fill="rgba(228,195,106,0.04)"
        stroke="rgba(228,195,106,0.12)"
        strokeWidth="1.5"
      />
      <path
        d="M60 180 C140 120, 220 160, 300 130 C400 90, 480 140, 560 110 C660 70, 760 100, 860 80 C920 70, 960 110, 980 90 L980 20 L60 20 Z"
        fill="rgba(46,229,157,0.03)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1.2"
      />
      <path
        d="M120 360 C200 300, 280 340, 360 310 C480 260, 560 340, 680 300 C780 270, 860 320, 920 290"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="2"
        strokeDasharray="6 10"
      />
    </g>
  );
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

  const [panelLocId, setPanelLocId] = useState<string | null>(null);
  const [pendingSpotId, setPendingSpotId] = useState<string | null>(null);
  const [hoverLocId, setHoverLocId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
  } | null>(null);

  zoomRef.current = zoom;
  panRef.current = pan;

  const panelOpen = panelLocId != null;
  const loc =
    LOCATIONS.find((l) => l.id === panelLocId) ??
    LOCATIONS.find((l) => l.id === combatLoc) ??
    LOCATIONS[0]!;
  const region = regionForLocation(loc.id);
  const spots = spotsForLocation(loc.id);
  const current = FARM_SPOT_BY_ID[spotId];
  const prog = locations[loc.id];
  const locEntryBm = locationEntryBm(loc);
  const locOpen =
    unlocked.includes(loc.id) && level >= loc.minLevel && derived.powerScore >= locEntryBm;
  const suggested = recommendedLocationId(level, derived.powerScore);
  const dropBonus = derived.dropBonus;
  const focusRegionId = panelOpen ? loc.regionId : regionForLocation(combatLoc).id;

  const pins = useMemo(() => {
    const out: Array<{
      loc: LocationDef;
      x: number;
      y: number;
      regionAccent: string;
      bmMin: number;
      bmMax: number;
    }> = [];
    for (const r of REGIONS) {
      const center = pctToMap(r.mapX, r.mapY);
      const list = locationsForRegion(r.id);
      list.forEach((l, i) => {
        const p = locPin(center.x, center.y, i, list.length);
        const bm = locationBmRange(l.id);
        out.push({
          loc: l,
          x: p.x,
          y: p.y,
          regionAccent: r.accent,
          bmMin: bm.min,
          bmMax: bm.max,
        });
      });
    }
    return out;
  }, []);

  useEffect(() => {
    if (!panelLocId) {
      setPendingSpotId(null);
      setActionMsg(null);
      return;
    }
    const list = spotsForLocation(panelLocId);
    const sameLoc = !isDungeonLocationId(combatLoc) && combatLoc === panelLocId;
    const preferred =
      (sameLoc && list.some((s) => s.id === spotId) ? spotId : null) ??
      list.find((s) => farm[s.id]?.occupant?.isPlayer)?.id ??
      list.find((s) => !farm[s.id]?.occupant)?.id ??
      list[0]?.id ??
      null;
    setPendingSpotId(preferred);
    setActionMsg(null);
    // Only re-seed when opening a different city — not on farm ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelLocId]);

  useEffect(() => {
    if (!panelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelLocId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  // Non-passive wheel so preventDefault actually stops page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      zoomBy(dir * 0.12, e.clientX, e.clientY);
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // zoomBy closes over stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: VW / 2, y: VH / 2 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: VW / 2, y: VH / 2 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function clampPan(nextZoom: number, nextPan: { x: number; y: number }) {
    if (nextZoom <= 1.02) return { x: 0, y: 0 };
    const maxX = (VW / 2) * (nextZoom - 1) + 48;
    const maxY = (VH / 2) * (nextZoom - 1) + 48;
    return {
      x: clamp(nextPan.x, -maxX, maxX),
      y: clamp(nextPan.y, -maxY, maxY),
    };
  }

  function applyZoom(nextZoom: number, pivot?: { x: number; y: number }) {
    const z0 = zoomRef.current;
    const p0 = panRef.current;
    const z1 = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(z1 - z0) < 0.001) return;

    const P = pivot ?? { x: VW / 2, y: VH / 2 };
    const cx = VW / 2;
    const cy = VH / 2;
    const contentX = cx + (P.x - cx - p0.x) / z0;
    const contentY = cy + (P.y - cy - p0.y) / z0;
    const pan1 = clampPan(z1, {
      x: P.x - cx - z1 * (contentX - cx),
      y: P.y - cy - z1 * (contentY - cy),
    });
    setZoom(z1);
    setPan(pan1);
  }

  function zoomBy(delta: number, clientX?: number, clientY?: number) {
    const pivot =
      clientX != null && clientY != null ? clientToSvg(clientX, clientY) : undefined;
    applyZoom(zoomRef.current * (1 + delta), pivot);
  }

  function openLocation(id: string) {
    setPanelLocId(id);
  }

  function closePanel() {
    setPanelLocId(null);
  }

  function onConfirmSpot() {
    if (!pendingSpotId || !locOpen) return;
    const occ = farm[pendingSpotId]?.occupant ?? null;
    const result =
      occ && !occ.isPlayer ? challengeSpot(pendingSpotId) : selectSpot(pendingSpotId);
    if (result.ok) closePanel();
    else setActionMsg(result.message);
  }

  function onMapPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if ((e.target as Element).closest?.(".farm-map-node")) return;
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onMapPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    if (!drag.moved && dx * dx + dy * dy < 9) return;
    drag.moved = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    // Screen pixels → SVG root units (ignore content zoom; pan is in root space).
    const scaleX = ctm.a || 1;
    const scaleY = ctm.d || 1;
    const z = zoomRef.current;
    setPan((p) =>
      clampPan(z, {
        x: p.x + dx / scaleX,
        y: p.y + dy / scaleY,
      }),
    );
  }

  function onMapPointerUp(e: React.PointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  function onMapTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      pinchRef.current = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        zoom: zoomRef.current,
      };
      dragRef.current = null;
    }
  }

  function onMapTouchMove(e: React.TouchEvent) {
    const pinch = pinchRef.current;
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const a = e.touches[0]!;
    const b = e.touches[1]!;
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    if (pinch.dist < 8) return;
    const midX = (a.clientX + b.clientX) / 2;
    const midY = (a.clientY + b.clientY) / 2;
    applyZoom(pinch.zoom * (dist / pinch.dist), clientToSvg(midX, midY));
  }

  function onMapTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  const pendingOcc = pendingSpotId ? (farm[pendingSpotId]?.occupant ?? null) : null;
  const pendingHostile = !!pendingOcc && !pendingOcc.isPlayer;
  const confirmLabel = pendingHostile ? "Напасть" : "Идти на спот";
  const worldTransform = `translate(${VW / 2 + pan.x} ${VH / 2 + pan.y}) scale(${zoom}) translate(${-VW / 2} ${-VH / 2})`;

  return (
    <div className="farm-map-root">
      <div className="farm-world-map">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Карта охоты"
          className={cn(zoom > 1.02 && "is-panning")}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
          onTouchStart={onMapTouchStart}
          onTouchMove={onMapTouchMove}
          onTouchEnd={onMapTouchEnd}
        >
          <g transform={worldTransform}>
            <TerrainBackdrop />

            {REGIONS.map((r) => {
              const c = pctToMap(r.mapX, r.mapY);
              return (
                <g key={r.id}>
                  <ellipse
                    cx={c.x}
                    cy={c.y}
                    rx={78}
                    ry={52}
                    fill={r.accent}
                    opacity={focusRegionId === r.id ? 0.14 : 0.06}
                  />
                  <text
                    x={c.x}
                    y={c.y - 58}
                    textAnchor="middle"
                    fill={r.accent}
                    opacity={0.55}
                    fontSize="11"
                    fontFamily="var(--font-onest), sans-serif"
                    letterSpacing="0.06em"
                  >
                    {r.name.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {REGIONS.map((r) => {
              const list = pins.filter((p) => p.loc.regionId === r.id);
              if (list.length < 2) return null;
              const d = list
                .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                .join(" ");
              return (
                <path
                  key={`road-${r.id}`}
                  d={d}
                  fill="none"
                  stroke={r.accent}
                  strokeOpacity={0.22}
                  strokeWidth={1.5}
                />
              );
            })}

            {pins.map(({ loc: l, x, y, regionAccent, bmMin, bmMax }) => {
              const open = unlocked.includes(l.id) && level >= l.minLevel;
              const active = panelLocId === l.id;
              const farming = combatLoc === l.id;
              const hover = hoverLocId === l.id;
              const r = active ? 11 : hover ? 9.5 : 8;
              return (
                <g
                  key={l.id}
                  className={cn("farm-map-node", !open && "is-locked")}
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openLocation(l.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLocation(l.id);
                    }
                  }}
                  onMouseEnter={() => setHoverLocId(l.id)}
                  onMouseLeave={() => setHoverLocId(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${l.name}, ур. ${l.minLevel}+, ${formatBmRange(bmMin, bmMax)}${open ? "" : ", закрыто"}`}
                  aria-pressed={active}
                >
                  {(active || farming) && (
                    <circle
                      r={r + 8}
                      fill="none"
                      stroke={farming ? "var(--accent)" : "#fff"}
                      strokeOpacity={farming ? 0.55 : 0.28}
                      strokeWidth={1.5}
                    />
                  )}
                  <circle
                    r={r}
                    fill={open ? l.accent : "#3f4650"}
                    stroke={active ? "#fff" : regionAccent}
                    strokeWidth={active ? 2 : 1.25}
                    opacity={open ? 1 : 0.7}
                  />
                  {l.kind !== "normal" ? (
                    <circle r={2.4} cy={-r - 6} fill={l.kind === "boss" ? "#e4c36a" : "#fbbf24"} />
                  ) : null}
                  <text
                    y={-r - (l.kind !== "normal" ? 28 : 20)}
                    textAnchor="middle"
                    fill="var(--color-amber)"
                    fillOpacity={0.85}
                    fontSize="8"
                    fontFamily="var(--font-inter), sans-serif"
                  >
                    ур. {l.minLevel}+
                  </text>
                  <text
                    y={-r - (l.kind !== "normal" ? 17 : 9)}
                    textAnchor="middle"
                    fill="var(--muted)"
                    fontSize="7.5"
                    fontFamily="var(--font-inter), sans-serif"
                  >
                    {formatBmRange(bmMin, bmMax)}
                  </text>
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fill={active ? "#fff" : "rgba(255,255,255,0.72)"}
                    fontSize="10"
                    fontFamily="var(--font-onest), sans-serif"
                  >
                    {l.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="farm-map-zoom" role="group" aria-label="Масштаб карты">
          <button
            type="button"
            className="farm-map-zoom-btn"
            aria-label="Приблизить"
            disabled={zoom >= MAX_ZOOM - 0.01}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="farm-map-zoom-btn"
            aria-label="Отдалить"
            disabled={zoom <= MIN_ZOOM + 0.01}
            onClick={() => {
              if (zoomRef.current - ZOOM_STEP <= MIN_ZOOM + 0.01) {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              } else {
                zoomBy(-ZOOM_STEP);
              }
            }}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="farm-map-hint" aria-hidden>
          Клик по городу — выбор спота · колесо / pinch — масштаб
        </div>

        <button
          type="button"
          className={cn("farm-spot-scrim", panelOpen && "is-open")}
          aria-label="Закрыть"
          tabIndex={panelOpen ? 0 : -1}
          onClick={closePanel}
        />

        <aside
          className={cn("farm-spot-drawer es-plate", panelOpen && "is-open")}
          aria-hidden={!panelOpen}
          aria-modal={panelOpen}
          role="dialog"
          aria-label={loc.name}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {region.name}
              </div>
              <div className="font-display text-[16px] text-white">{loc.name}</div>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{loc.blurb}</p>
            </div>
            <button
              type="button"
              className="es-btn h-8 w-8 shrink-0 p-0"
              onClick={closePanel}
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-white/55">
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
              <span className="rounded border border-[#e4c36a]/35 px-1.5 py-0.5 text-[#e4c36a]">
                под вас
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-[10px] text-[var(--muted)]">
            Сейчас: {current?.name ?? "—"}
            {mode === "pvp" ? " · PvP" : ""}
          </div>

          {!locOpen ? (
            <p className="mt-3 inline-flex items-start gap-1.5 text-[12px] text-[var(--muted)]">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {level >= loc.minLevel && derived.powerScore < locEntryBm
                ? `Проход закрыт: нужно ${formatFullDigits(locEntryBm)} БМ`
                : `Нужен ${loc.minLevel} уровень · ${formatFullDigits(locationRecommendedBm(loc))} БМ`}
            </p>
          ) : (
            <div className="farm-spot-drawer-body mt-3">
              <div className="es-label">Споты</div>
              <div className="farm-spot-list mt-2 space-y-2">
                {spots.map((spot) => {
                  const occ = farm[spot.id]?.occupant ?? null;
                  const mining = spotId === spot.id;
                  const hostile = !!occ && !occ.isPlayer;
                  const mine = occ?.isPlayer;
                  const selected = pendingSpotId === spot.id;
                  const fit = bmFit(derived.powerScore, spot.requiredBm);
                  const dropPct = Math.round(
                    finalDropChance("trash", dropBonus, spot.dropChanceMult) * 100,
                  );
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => {
                        setPendingSpotId(spot.id);
                        setActionMsg(null);
                      }}
                      className={cn(
                        "es-well w-full p-2.5 text-left transition hover:border-white/16",
                        selected && "border-[var(--accent)]/45",
                        mining && !selected && "border-[#e4c36a]/35",
                        hostile && "bg-[#ff5a5f]/08",
                      )}
                      style={{ borderColor: selected ? undefined : SPOT_TIER_COLOR[spot.tier] + "66" }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[13px] font-medium text-white">{spot.name}</span>
                        {hostile ? <Swords className="h-3.5 w-3.5 text-[#ff5a5f]" /> : null}
                        {mining ? <Crosshair className="h-3.5 w-3.5 text-[#e4c36a]" /> : null}
                      </div>
                      <div
                        className="mt-1 text-[10px] uppercase tracking-wide"
                        style={{ color: SPOT_TIER_COLOR[spot.tier] }}
                      >
                        {SPOT_TIER_LABEL[spot.tier]} · {formatFullDigits(spot.requiredBm)} БМ ·{" "}
                        {BM_FIT_LABEL[fit]}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[var(--muted)]">
                        <span>дроп {dropPct}%</span>
                        <span>опыт ×{spot.xpMult.toFixed(2)}</span>
                        <span>золото ×{spot.goldMult.toFixed(2)}</span>
                      </div>
                      <div className="mt-1.5 text-[12px] text-[var(--muted)]">
                        {hostile ? (
                          <>
                            {occ.name}
                            <span className="mt-0.5 block font-mono text-[#ff8a8e]">
                              {formatFullDigits(occ.power)} БМ · напасть
                            </span>
                          </>
                        ) : null}
                        {mine ? <span className="text-[#e4c36a]">Ваш спот</span> : null}
                        {!occ ? <span>Свободно</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {locOpen ? (
            <div className="farm-spot-drawer-footer mt-3">
              {actionMsg ? (
                <p className="mb-2 text-[11px] text-[#ff8a8e]">{actionMsg}</p>
              ) : null}
              <button
                type="button"
                className={cn(
                  "es-btn w-full",
                  pendingHostile ? "es-btn-danger" : "es-btn-cyan",
                )}
                disabled={!pendingSpotId}
                onClick={onConfirmSpot}
              >
                {pendingHostile ? <Swords className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />}
                {confirmLabel}
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
