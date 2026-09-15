"use client";

import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";
import type { SinGemKind } from "@/lib/game/sin/icons";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-[3.35rem] w-[3.35rem]",
};

const ICON: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function SinGem({
  icon: Icon,
  kind = "skill",
  accent,
  size = "md",
  rank,
  maxRank,
  selected,
  available,
  owned,
  locked,
  className,
  title,
  ariaLabel,
  onClick,
  onDoubleClick,
  onHoverAnchor,
}: {
  icon: LucideIcon;
  kind?: SinGemKind;
  accent: string;
  size?: Size;
  rank?: number;
  maxRank?: number;
  selected?: boolean;
  available?: boolean;
  owned?: boolean;
  locked?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onHoverAnchor?: (rect: DOMRect | null) => void;
}) {
  const interactive = Boolean(onClick || onDoubleClick);
  const Comp = interactive ? "button" : "span";

  function setAnchor(el: HTMLElement | null) {
    onHoverAnchor?.(el ? el.getBoundingClientRect() : null);
  }

  return (
    <Comp
      type={interactive ? "button" : undefined}
      title={onHoverAnchor ? undefined : title}
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={(e) => setAnchor(e.currentTarget)}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(e) => setAnchor(e.currentTarget)}
      onBlur={() => setAnchor(null)}
      className={cn(
        "sin-gem",
        kind === "keystone" && "is-key",
        kind === "art" && "is-art",
        kind === "passive" && "is-pass",
        kind === "path" && "is-path",
        SIZE[size],
        selected && "is-selected",
        available && "is-can",
        owned && "is-on",
        locked && "is-locked",
        !interactive && !onHoverAnchor && "pointer-events-none",
        className,
      )}
      style={{ ["--gem" as string]: accent }}
    >
      <span className="sin-gem-face">
        <Icon className={ICON[size]} strokeWidth={2.1} />
      </span>
      {typeof rank === "number" && rank > 0 && (
        <span className="sin-gem-rank">
          {typeof maxRank === "number" && maxRank > 0 ? `${rank}/${maxRank}` : `r${rank}`}
        </span>
      )}
    </Comp>
  );
}
