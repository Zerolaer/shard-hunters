"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MoreHorizontal, Swords, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/useUiStore";
import { MOBILE_MORE_TABS, MOBILE_PRIMARY_TABS, tabById } from "./navTabs";

export function MobileDock() {
  const tab = useUiStore((s) => s.tab);
  const mobileScreen = useUiStore((s) => s.mobileScreen);
  const setMobileScreen = useUiStore((s) => s.setMobileScreen);
  const openMobileTab = useUiStore((s) => s.openMobileTab);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileScreen === "panel" && MOBILE_MORE_TABS.includes(tab);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="es-modal-scrim fixed inset-0 z-[70]"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Другие разделы"
            className="es-modal mobile-more-sheet fixed inset-x-2 z-[80] overflow-hidden p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="font-display text-sm font-semibold text-white">Разделы</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="es-btn h-9 w-9 p-0"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOBILE_MORE_TABS.map((id) => {
                const t = tabById(id);
                const Icon = t.icon;
                const active = moreActive && tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      openMobileTab(id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-medium",
                      active
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-white/8 bg-black/25 text-[#c5d4e0]",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-[var(--accent)]")} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Мобильная навигация"
        className="mobile-dock z-50 shrink-0 border-t border-white/10 bg-[rgba(9,9,11,0.92)] backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5">
          <DockBtn
            label="Бой"
            active={mobileScreen === "combat"}
            onClick={() => {
              setMoreOpen(false);
              setMobileScreen("combat");
            }}
          >
            <Swords className="h-5 w-5" />
          </DockBtn>
          {MOBILE_PRIMARY_TABS.map((id) => {
            const t = tabById(id);
            const Icon = t.icon;
            const active = mobileScreen === "panel" && tab === id;
            return (
              <DockBtn
                key={id}
                label={t.label}
                active={active}
                onClick={() => {
                  setMoreOpen(false);
                  openMobileTab(id);
                }}
              >
                <Icon className="h-5 w-5" />
              </DockBtn>
            );
          })}
          <DockBtn
            label={moreActive ? tabById(tab).label : "Ещё"}
            active={moreActive || moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </DockBtn>
        </div>
      </nav>
    </>
  );
}

function DockBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium leading-none",
        active ? "text-white" : "text-[#8a8582]",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className={cn(active && "text-[var(--accent)]")}>{children}</span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
