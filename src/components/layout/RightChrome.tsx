"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function RpHead({
  icon: Icon,
  title,
  meta,
  action,
}: {
  icon: LucideIcon;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="rp-icon text-[#c4b5fd]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[15px] font-semibold leading-tight tracking-tight text-white">{title}</div>
        {meta ? <div className="mt-1 text-[11px] leading-snug text-[#8aa0b4]">{meta}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function RpChip({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] leading-none text-[#8aa0b4]",
        "bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_12px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RpRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rp-inset flex items-center gap-2.5 px-3 py-2 text-[13px]" title={hint}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-white/40" /> : null}
      <span className="min-w-0 flex-1 truncate text-[#8aa0b4]">{label}</span>
      <span className="shrink-0 font-display font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}
