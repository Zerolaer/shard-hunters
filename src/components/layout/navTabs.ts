import { Backpack, Castle, GitBranch, Map, Pickaxe, Shield, Trophy, User, Wrench } from "lucide-react";
import type { RightTab } from "@/lib/game/types";

export const RIGHT_TABS: { id: RightTab; label: string; icon: typeof User; hotkey: string }[] = [
  { id: "character", label: "Персонаж", icon: User, hotkey: "1" },
  { id: "build", label: "Билд", icon: GitBranch, hotkey: "2" },
  { id: "inventory", label: "Инвентарь", icon: Backpack, hotkey: "3" },
  { id: "workshop", label: "Мастерская", icon: Wrench, hotkey: "4" },
  { id: "world", label: "Карта", icon: Map, hotkey: "5" },
  { id: "mines", label: "Шахта", icon: Pickaxe, hotkey: "6" },
  { id: "dungeons", label: "Данжи", icon: Castle, hotkey: "7" },
  { id: "guild", label: "Гильдия", icon: Shield, hotkey: "8" },
  { id: "ranking", label: "Рейтинг", icon: Trophy, hotkey: "9" },
];

export const MOBILE_PRIMARY_TABS: RightTab[] = ["character", "inventory", "world"];
export const MOBILE_MORE_TABS: RightTab[] = ["build", "workshop", "mines", "dungeons", "guild", "ranking"];

export function tabById(id: RightTab) {
  return RIGHT_TABS.find((t) => t.id === id)!;
}
