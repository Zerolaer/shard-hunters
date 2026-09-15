"use client";

import { useCallback, useEffect, useRef } from "react";
import { Backpack, GitBranch, Map, Shield, User, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RightTab } from "@/lib/game/types";
import { CharacterPanel } from "@/components/character/CharacterPanel";
import { BuildPanel } from "@/components/character/BuildPanel";
import { InventoryPanel } from "@/components/character/InventoryPanel";
import { PinnedItemPanel } from "@/components/character/PinnedItemPanel";
import { WorkshopPanel } from "@/components/character/WorkshopPanel";
import { WorldPanel } from "@/components/territories/WorldPanel";
import { GuildPanel } from "@/components/territories/GuildPanel";
import { useUiStore } from "@/store/useUiStore";

const TABS: { id: RightTab; label: string; icon: typeof User; hotkey: string }[] = [
  { id: "character", label: "Персонаж", icon: User, hotkey: "1" },
  { id: "build", label: "Билд", icon: GitBranch, hotkey: "2" },
  { id: "inventory", label: "Инвентарь", icon: Backpack, hotkey: "3" },
  { id: "workshop", label: "Мастерская", icon: Wrench, hotkey: "4" },
  { id: "world", label: "Карта", icon: Map, hotkey: "5" },
  { id: "guild", label: "Гильдия", icon: Shield, hotkey: "6" },
];

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
      const i = TABS.findIndex((t) => t.id === tab);
      const next = TABS[(i + dir + TABS.length) % TABS.length]!;
      setTab(next.id);
    },
    [setTab, tab],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key >= "1" && e.key <= "6") {
        const next = TABS[Number(e.key) - 1];
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
        setTab(TABS[0]!.id);
      } else if (e.key === "End") {
        e.preventDefault();
        setTab(TABS[TABS.length - 1]!.id);
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
    <section className="es-frame relative z-10 flex h-full min-h-0 flex-col overflow-visible">
      <div ref={listRef} role="tablist" aria-label="Правая панель" className="es-tabs shrink-0 overflow-visible">
        {TABS.map((t) => {
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
              className={cn("es-tab", active && "is-active")}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`rp-panel-${tab}`}
        aria-labelledby={`rp-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col overflow-visible p-4"
      >
        {tab === "inventory" ? (
          <InventoryPanel />
        ) : tab === "build" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BuildPanel />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible p-0.5">
            {tab === "character" && <CharacterPanel />}
            {tab === "workshop" && <WorkshopPanel />}
            {tab === "world" && <WorldPanel />}
            {tab === "guild" && <GuildPanel />}
          </div>
        )}
      </div>
      <PinnedItemPanel />
    </section>
  );
}
