import { cn } from "@/lib/cn";
import { AVATAR_BY_ID, resolveAvatarId } from "@/lib/game/avatars";

export function AvatarFace({
  id,
  size = "md",
  className,
}: {
  id?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const avatar = AVATAR_BY_ID[resolveAvatarId(id)];
  const Icon = avatar.icon;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border border-violet-300/25 bg-zinc-900",
        "shadow-[0_8px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-14 w-14",
        className,
      )}
      style={{ color: avatar.accent }}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
    </span>
  );
}
