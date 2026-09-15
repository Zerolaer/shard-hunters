import { cn } from "@/lib/cn";

export function LevelBadge({
  level,
  shape = "square",
  size = "md",
  className,
}: {
  level: number;
  shape?: "square" | "circle";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "sm"
      ? "h-9 w-9 text-[13px]"
      : size === "lg"
        ? "h-16 w-16 text-[22px]"
        : "h-14 w-14 text-[18px]";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-white/18 bg-white/[0.07] font-display font-semibold tabular-nums tracking-tighter text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        shape === "circle" ? "rounded-full" : "rounded-md",
        dims,
        className,
      )}
      aria-label={`Уровень ${level}`}
      title={`Уровень ${level}`}
    >
      {level}
    </div>
  );
}
