"use client";

import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Search, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { AVATAR_BY_ID, resolveAvatarId } from "@/lib/game/avatars";
import { CLASS_DEFS, classLabel } from "@/lib/game/classes";
import { formatFullDigits } from "@/lib/game/formulas";
import {
  HUNTER_ACTIVITY_VERB,
  HUNTER_ARCHETYPE_LABEL,
  rankOf,
  rankingRows,
  sortRanking,
  WORLD_HUNTER_COUNT,
  type RankingRow,
} from "@/lib/game/hunters";
import { useDerivedStats, useGameStore } from "@/store/useGameStore";
import { RpChip, RpHead } from "@/components/layout/RightChrome";

type RankSlice = "level" | "power";

export function RankingPanel() {
  const hunters = useGameStore((s) => s.worldHunters);
  const character = useGameStore((s) => s.character);
  const guildName = useGameStore((s) => s.guild.name);
  const derived = useDerivedStats();
  const [slice, setSlice] = useState<RankSlice>("power");
  const [query, setQuery] = useState("");
  const playerRef = useRef<HTMLLIElement>(null);

  const rows = useMemo(
    () =>
      rankingRows(hunters ?? [], {
        name: character.name,
        guild: guildName,
        classId: character.classId,
        avatarId: character.avatarId ?? "shard",
        level: character.level,
        power: derived.powerScore,
      }),
    [
      hunters,
      character.name,
      character.classId,
      character.avatarId,
      character.level,
      guildName,
      derived.powerScore,
    ],
  );

  const ranked = useMemo(() => sortRanking(rows, slice), [rows, slice]);
  const levelRank = useMemo(() => rankOf(rows, "level"), [rows]);
  const powerRank = useMemo(() => rankOf(rows, "power"), [rows]);
  const total = ranked.length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.guild.toLowerCase().includes(q) ||
        classLabel(r.classId).toLowerCase().includes(q),
    );
  }, [ranked, query]);

  useEffect(() => {
    playerRef.current?.scrollIntoView({ block: "center" });
  }, [slice]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="es-plate p-2.5">
        <RpHead
          icon={Trophy}
          title="Рейтинг охотников"
          meta={`${WORLD_HUNTER_COUNT} соперников живут в мире: фармят, точат, ходят в данжи.`}
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <RpChip>
            Вы #{powerRank} по БМ
          </RpChip>
          <RpChip>
            #{levelRank} по уровню
          </RpChip>
          <RpChip>из {total}</RpChip>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg border border-white/8 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setSlice("power")}
            className={cn("es-btn h-9 text-xs", slice === "power" && "es-btn-amber")}
          >
            <Zap className="h-4 w-4" />
            По БМ
          </button>
          <button
            type="button"
            onClick={() => setSlice("level")}
            className={cn("es-btn h-9 text-xs", slice === "level" && "es-btn-amber")}
          >
            <Trophy className="h-4 w-4" />
            По уровню
          </button>
        </div>
        <label className="relative mt-2.5 block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8aa0b4]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя, гильдия, класс"
            className="es-input h-9 w-full pl-8 text-[12px]"
          />
        </label>
      </div>

      <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5">
        {visible.map((row) => {
          const place = ranked.findIndex((r) => r.id === row.id) + 1;
          return (
            <RankingRowView
              key={row.id}
              row={row}
              place={place}
              by={slice}
              rowRef={row.you ? playerRef : undefined}
            />
          );
        })}
        {visible.length === 0 ? (
          <li className="rp-inset px-3 py-4 text-center text-[12px] text-[#8aa0b4]">Никого не нашли</li>
        ) : null}
      </ol>
    </div>
  );
}

function RankingRowView({
  row,
  place,
  by,
  rowRef,
}: {
  row: RankingRow;
  place: number;
  by: RankSlice;
  rowRef?: Ref<HTMLLIElement>;
}) {
  const avatar = AVATAR_BY_ID[resolveAvatarId(row.avatarId)];
  const Icon = avatar?.icon;
  const accent = row.classId ? CLASS_DEFS[row.classId].accent : "#e4c36a";
  const medal = place === 1 ? "text-amber-300" : place === 2 ? "text-slate-200" : place === 3 ? "text-orange-300" : "text-[#8aa0b4]";

  return (
    <li
      ref={rowRef}
      className={cn(
        "rp-inset flex items-center gap-2.5 px-2.5 py-2 text-[12px]",
        row.you && "border-[var(--accent)]/35 bg-[var(--accent)]/8 text-amber",
      )}
    >
      <span className={cn("w-7 shrink-0 text-right font-mono text-[11px] tabular-nums", medal)}>
        #{place}
      </span>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/12 bg-black/35"
        style={{ color: accent }}
        title={classLabel(row.classId)}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("truncate font-medium", row.you ? "text-amber" : "text-[#d7e2ec]")}>
            {row.name}
            {row.you ? " (вы)" : ""}
          </span>
          <span className="shrink-0 text-[10px] text-[#6a7c8c]">{classLabel(row.classId)}</span>
        </div>
        <div className="mt-0.5 truncate text-[10px] text-[#6a7c8c]">
          {row.guild || "Без гильдии"}
          {" · "}
          {row.you ? "ваш прогресс" : row.archetype === "you" ? "" : HUNTER_ARCHETYPE_LABEL[row.archetype]}
          {row.you ? "" : ` · ${row.activity === "you" ? "" : HUNTER_ACTIVITY_VERB[row.activity]}`}
          {row.you ? "" : ` · ${row.activityLabel}`}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("font-mono text-[12px] tabular-nums", by === "power" ? "text-white" : "text-[#8aa0b4]")}>
          {formatFullDigits(row.power)}
        </div>
        <div className={cn("font-mono text-[10px] tabular-nums", by === "level" ? "text-white" : "text-[#6a7c8c]")}>
          ур. {row.level}
        </div>
      </div>
    </li>
  );
}
