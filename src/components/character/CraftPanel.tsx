"use client";

import { ItemActionPanel } from "./ItemActionPanel";

export function CraftPanel() {
  return (
    <div
      className="es-plate flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-item-action-panel
    >
      <ItemActionPanel />
    </div>
  );
}
