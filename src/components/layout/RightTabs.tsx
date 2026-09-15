"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CharacterPanel } from "@/components/character/CharacterPanel";
import { BuildPanel } from "@/components/character/BuildPanel";
import { InventoryPanel } from "@/components/character/InventoryPanel";
import { PinnedItemPanel } from "@/components/character/PinnedItemPanel";
import { EnhanceModal } from "@/components/character/EnhanceModal";
import { WorkshopPanel } from "@/components/character/WorkshopPanel";
import { FarmMap } from "@/components/territories/FarmMap";
import { MinesPanel } from "@/components/territories/MinesPanel";
import { DungeonsPanel } from "@/components/territories/DungeonsPanel";
import { GuildPanel } from "@/components/territories/GuildPanel";
import { RankingPanel } from "@/components/territories/RankingPanel";
import { useUiStore } from "@/store/useUiStore";
import { RIGHT_TABS, tabById } from "./navTabs";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
}

export function RightTabs() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const listRef = useRef<HTMLDivElement>(null);

  const move = useCallback(
    (dir: 1 | -1) => {
      const i = RIGHT_TABS.findIndex((t) => t.id === tab);
      const next = RIGHT_TABS[(i + dir + RIGHT_TABS.length) % RIGHT_TABS.length]!;
      setTab(next.id);
    },
    [setTab, tab],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key >= "1" && e.key <= "9") {
        const next = RIGHT_TABS[Number(e.key) - 1];
        if (next) {
          e.preventDefault();
          setTab(next.id);
        }
        return;
      }
      const inList = listRef.current?.contains(document.activeElement);
      if (!inList) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setTab(RIGHT_TABS[0]!.id);
      } else if (e.key === "End") {
        e.preventDefault();
        setTab(RIGHT_TABS[RIGHT_TABS.length - 1]!.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, setTab]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (active && listRef.current?.contains(document.activeElement)) active.focus();
  }, [tab]);

  return (
    <section className="es-frame relative z-10 flex h-full min-h-0 flex-col overflow-visible max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0">
      <div className="max-lg:hidden">
        <div ref={listRef} role="tablist" aria-label="Правая панель" className="rp-tabs shrink-0">
          {RIGHT_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`rp-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`rp-panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              title={`${t.label} · ${t.hotkey}`}
              onClick={() => setTab(t.id)}
              className={cn("rp-tab", active && "is-active")}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
        </div>
      </div>
      <MobilePanelTitle tab={tab} />
      <div
        role="tabpanel"
        id={`rp-panel-${tab}`}
        aria-labelledby={`rp-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col overflow-visible p-4 max-lg:p-3"
      >
        {tab === "inventory" ? (
          <InventoryPanel />
        ) : tab === "build" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BuildPanel />
          </div>
        ) : tab === "ranking" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RankingPanel />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible p-0.5">
            {tab === "character" && <CharacterPanel />}
            {tab === "workshop" && <WorkshopPanel />}
            {tab === "world" && <FarmMap />}
            {tab === "mines" && <MinesPanel />}
            {tab === "dungeons" && <DungeonsPanel />}
            {tab === "guild" && <GuildPanel />}
          </div>
        )}
      </div>
      <PinnedItemPanel />
      <EnhanceModal />
    </section>
  );
}

function MobilePanelTitle({ tab }: { tab: (typeof RIGHT_TABS)[number]["id"] }) {
  const t = tabById(tab);
  const Icon = t.icon;
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.07] px-3 py-2 lg:hidden">
      <Icon className="h-4 w-4 text-[var(--accent)]" />
      <span className="font-display text-sm font-semibold text-white">{t.label}</span>
    </div>
  );
}
