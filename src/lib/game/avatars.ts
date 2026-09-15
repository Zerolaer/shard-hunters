import {
  BookOpen,
  Crown,
  Eye,
  Flame,
  Gem,
  PawPrint,
  Swords,
  Target,
  type LucideIcon,
} from "lucide-react";

export const AVATAR_IDS = [
  "shard",
  "blade",
  "bow",
  "veil",
  "flame",
  "crown",
  "beast",
  "tome",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const DEFAULT_AVATAR_ID: AvatarId = "shard";

export const HUNTER_NAME_MIN = 2;
export const HUNTER_NAME_MAX = 18;

export interface AvatarDef {
  id: AvatarId;
  label: string;
  icon: LucideIcon;
  accent: string;
}

export const AVATARS: AvatarDef[] = [
  { id: "shard", label: "Осколок", icon: Gem, accent: "#c4b5fd" },
  { id: "blade", label: "Клинок", icon: Swords, accent: "#e4c36a" },
  { id: "bow", label: "Прицел", icon: Target, accent: "#d4d4d8" },
  { id: "veil", label: "Взор", icon: Eye, accent: "#a78bfa" },
  { id: "flame", label: "Пламя", icon: Flame, accent: "#f59e0b" },
  { id: "crown", label: "Корона", icon: Crown, accent: "#fbbf24" },
  { id: "beast", label: "Зверь", icon: PawPrint, accent: "#a8a29e" },
  { id: "tome", label: "Том", icon: BookOpen, accent: "#93c5fd" },
];

export const AVATAR_BY_ID = Object.fromEntries(AVATARS.map((a) => [a.id, a])) as Record<
  AvatarId,
  AvatarDef
>;

export function isAvatarId(id: unknown): id is AvatarId {
  return typeof id === "string" && (AVATAR_IDS as readonly string[]).includes(id);
}

export function resolveAvatarId(id: string | null | undefined): AvatarId {
  return isAvatarId(id) ? id : DEFAULT_AVATAR_ID;
}

export function normalizeHunterName(raw: string) {
  return raw.trim().slice(0, HUNTER_NAME_MAX);
}

export function validateHunterName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = normalizeHunterName(raw);
  if (name.length < HUNTER_NAME_MIN) return { ok: false, message: "Имя — минимум 2 символа" };
  return { ok: true, name };
}
