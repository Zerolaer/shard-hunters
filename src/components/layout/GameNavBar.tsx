"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/useUiStore";
import { RIGHT_TABS } from "./navTabs";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
}

/** Full-width horizontal primary nav under GameHeader (desktop). */
export function GameNavBar() {
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
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const byHotkey = RIGHT_TABS.find((t) => t.hotkey.toUpperCase() === key);
      if (byHotkey) {
        e.preventDefault();
        setTab(byHotkey.id);
        return;
      }
      // Russian layout: И → B (bosses)
      if (e.key === "и" || e.key === "И") {
        const bosses = RIGHT_TABS.find((t) => t.id === "bosses");
        if (bosses) {
          e.preventDefault();
          setTab(bosses.id);
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
    <nav
      aria-label="Игровое меню"
      className="game-nav relative z-30 hidden shrink-0 border-b border-white/[0.07] bg-[rgba(9,9,11,0.88)] backdrop-blur-xl lg:block"
    >
      <div className="mx-auto max-w-[1600px] px-5">
        <div ref={listRef} role="tablist" aria-label="Разделы" className="game-nav-tabs">
          {RIGHT_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`game-nav-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`rp-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                title={`${t.label} · ${t.hotkey}`}
                onClick={() => setTab(t.id)}
                className={cn("game-nav-tab", active && "is-active")}
              >
                <Icon className="h-[14px] w-[14px] shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
