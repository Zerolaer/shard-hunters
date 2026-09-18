"use client";

import { CharacterPanel } from "@/components/character/CharacterPanel";
import { BuildPanel } from "@/components/character/BuildPanel";
import { InventoryPanel } from "@/components/character/InventoryPanel";
import { PinnedItemPanel } from "@/components/character/PinnedItemPanel";
import { EnhanceModal } from "@/components/character/EnhanceModal";
import { WorkshopPanel } from "@/components/character/WorkshopPanel";
import { FarmMap } from "@/components/territories/FarmMap";
import { MinesPanel } from "@/components/territories/MinesPanel";
import { DungeonsPanel } from "@/components/territories/DungeonsPanel";
import { TowerPanel } from "@/components/territories/TowerPanel";
import { BossesPanel } from "@/components/territories/BossesPanel";
import { GuildPanel } from "@/components/territories/GuildPanel";
import { useUiStore } from "@/store/useUiStore";
import { tabById } from "./navTabs";

export function RightTabs() {
  const tab = useUiStore((s) => s.tab);

  return (
    <section className="es-frame relative z-10 flex h-full min-h-0 flex-col overflow-visible max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0">
      <MobilePanelTitle tab={tab} />
      <div
        role="tabpanel"
        id={`rp-panel-${tab}`}
        aria-labelledby={`game-nav-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col overflow-visible p-4 max-lg:p-3"
      >
        {tab === "inventory" ? (
          <InventoryPanel />
        ) : tab === "build" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BuildPanel />
          </div>
        ) : tab === "tower" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TowerPanel />
          </div>
        ) : tab === "bosses" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <BossesPanel />
          </div>
        ) : tab === "world" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-0.5">
            <FarmMap />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible p-0.5">
            {tab === "character" && <CharacterPanel />}
            {tab === "workshop" && <WorkshopPanel />}
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

function MobilePanelTitle({ tab }: { tab: Parameters<typeof tabById>[0] }) {
  const t = tabById(tab);
  const Icon = t.icon;
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.07] px-3 py-2 lg:hidden">
      <Icon className="h-4 w-4 text-[var(--accent)]" />
      <span className="font-display text-sm font-semibold text-white">{t.label}</span>
    </div>
  );
}
