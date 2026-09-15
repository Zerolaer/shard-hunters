"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useUiStore } from "@/store/useUiStore";
import { ItemActionPanel } from "./ItemActionPanel";

/**
 * Fixed dismissible item inspector for the Character tab (equipment doll).
 * Inventory keeps the sticky CraftPanel instead.
 */
export function PinnedItemPanel() {
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const tab = useUiStore((s) => s.tab);
  const dismissItemPanel = useUiStore((s) => s.dismissItemPanel);
  const panelRef = useRef<HTMLDivElement>(null);
  // Inventory already has CraftPanel; only pin over Character so enhance works on the doll.
  const open = !!selectedItemId && tab === "character";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      // Keep selection when interacting with equipment slots / inventory cells —
      // those re-select or clear via their own handlers.
      if (target instanceof Element) {
        if (target.closest(".es-slot, .es-inv-cell, [data-item-action-panel]")) return;
        if (target.closest('[role="tab"], .es-tab, .rp-tab')) return;
      }
      dismissItemPanel();
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, dismissItemPanel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      data-item-action-panel
      className="es-plate fixed bottom-4 right-4 z-[220] flex max-h-[min(92vh,44rem)] w-[min(100vw-1.5rem,22.5rem)] flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.72)]"
      role="dialog"
      aria-label="Панель предмета"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <ItemActionPanel dismissible onDismiss={dismissItemPanel} />
      </div>
    </div>,
    document.body,
  );
}
