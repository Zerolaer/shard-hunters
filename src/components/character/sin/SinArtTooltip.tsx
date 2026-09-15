"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SIN_TAG_LABEL } from "@/lib/game/sin";
import type { SinArtDef } from "@/lib/game/sin/types";

export function SinArtCard({
  art,
  compatible,
  occupiedOn,
  equipped,
  accent,
  rank,
  nextPreview,
}: {
  art: SinArtDef;
  compatible: boolean;
  occupiedOn: string | null;
  equipped: boolean;
  accent: string;
  rank?: number;
  nextPreview?: string | null;
}) {
  const universal = art.supports.length === 0;

  return (
    <div className="es-tooltip w-60 p-3" style={{ borderColor: accent, borderTopWidth: 3 }}>
      <div className="es-label mb-1">Искусство поддержки</div>
      <div className="font-display text-base leading-tight text-white">{art.name}</div>
      {typeof rank === "number" && rank > 0 && (
        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-[#8aa0b4]">Ранг {rank}/20</div>
      )}
      {equipped && <div className="mt-1 text-[11px] text-[#3ee0a0]">Вставлено в этот навык</div>}
      {!equipped && occupiedOn && (
        <div className="mt-1 text-[11px] text-[#e8c07a]">Занят · {occupiedOn}</div>
      )}
      {!compatible && (
        <div className="mt-1 text-[11px] text-[#ff5a5f]">Не подходит к тегам этого навыка</div>
      )}
      {compatible && universal && (
        <div className="mt-1 text-[11px] text-[#8aa0b4]">Подходит к любому навыку</div>
      )}
      <p className="mt-2 text-[11px] leading-4 text-[#c5d4e0]">{art.description}</p>
      {nextPreview && <p className="mt-1 text-[10px] leading-4 text-[#3ee0a0]">{nextPreview}</p>}
      {art.supports.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-2">
          {art.supports.map((tag) => (
            <span key={tag} className="es-chip px-1.5 py-0 text-[9px] text-[#8aa0b4]">
              {SIN_TAG_LABEL[tag]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SinArtHoverTooltip({
  art,
  compatible,
  occupiedOn,
  equipped,
  accent,
  anchor,
  rank,
  nextPreview,
}: {
  art: SinArtDef;
  compatible: boolean;
  occupiedOn: string | null;
  equipped: boolean;
  accent: string;
  anchor: DOMRect;
  rank?: number;
  nextPreview?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: anchor.left - 10, top: anchor.top });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    let left = anchor.left - tw - 10;
    let top = anchor.top;
    if (left < 8) left = Math.min(window.innerWidth - tw - 8, anchor.right + 10);
    if (top + th > window.innerHeight - 8) top = Math.max(8, window.innerHeight - th - 8);
    setPos({ left, top });
  }, [anchor, art.id]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[300]"
      style={{ left: pos.left, top: pos.top }}
    >
      <SinArtCard
        art={art}
        compatible={compatible}
        occupiedOn={occupiedOn}
        equipped={equipped}
        accent={accent}
        rank={rank}
        nextPreview={nextPreview}
      />
    </div>,
    document.body,
  );
}
