"use client";

import { ItemActionPanel } from "./ItemActionPanel";

export function CraftPanel() {
  return (
    <div className="es-plate flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-2.5" data-item-action-panel>
      <ItemActionPanel />
    </div>
  );
}
