import {
  Backpack,
  Castle,
  Crown,
  Map,
  Pickaxe,
  Shield,
  Sparkles,
  TowerControl,
  User,
  Wrench,
} from "lucide-react";
import type { RightTab } from "@/lib/game/types";

export const RIGHT_TABS: { id: RightTab; label: string; icon: typeof User; hotkey: string }[] = [
  { id: "character", label: "Персонаж", icon: User, hotkey: "1" },
  { id: "build", label: "Скиллы", icon: Sparkles, hotkey: "2" },
  { id: "inventory", label: "Инвентарь", icon: Backpack, hotkey: "3" },
  { id: "workshop", label: "Мастерская", icon: Wrench, hotkey: "4" },
  { id: "world", label: "Карта Мира", icon: Map, hotkey: "5" },
  { id: "mines", label: "Шахты", icon: Pickaxe, hotkey: "6" },
  { id: "dungeons", label: "Подземелья", icon: Castle, hotkey: "7" },
  { id: "tower", label: "Башня Испытаний", icon: TowerControl, hotkey: "8" },
  { id: "bosses", label: "Боссы", icon: Crown, hotkey: "B" },
  { id: "guild", label: "Гильдия", icon: Shield, hotkey: "9" },
];

export const MOBILE_PRIMARY_TABS: RightTab[] = ["character", "inventory", "world"];
export const MOBILE_MORE_TABS: RightTab[] = [
  "build",
  "workshop",
  "mines",
  "dungeons",
  "tower",
  "bosses",
  "guild",
];

export function tabById(id: RightTab) {
  return RIGHT_TABS.find((t) => t.id === id)!;
}
