"use client";

import { useMemo } from "react";
import { canAllocateSinNode, SIN_NODES, SIN_NODE_BY_ID, type SinNodeDef } from "@/lib/game/sin/tree";
import { iconForNode, sinNodeKind } from "@/lib/game/sin/icons";
import type { SinPathId } from "@/lib/game/types";
import { SinGem } from "./SinGem";

function pct(col: number, row: number) {
  return {
    x: 16 + col * 34,
    y: 16 + row * 17,
  };
}

export function SinTreeCanvas({
  view,
  accent,
  path,
  ranks,
  points,
  selectedId,
  onSelect,
  onAllocate,
}: {
  view: SinPathId;
  accent: string;
  path: SinPathId | null;
  ranks: Record<string, number>;
  points: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAllocate?: (id: string) => void;
}) {
  const nodes = useMemo(() => SIN_NODES.filter((n) => n.path === view), [view]);

  const edges = useMemo(() => {
    const out: { from: SinNodeDef; to: SinNodeDef; dashed: boolean }[] = [];
    for (const node of nodes) {
      const parents = [
        ...node.requires.map((id) => ({ id, dashed: false })),
        ...(node.requiresAny ?? []).map((id) => ({ id, dashed: true })),
      ];
      for (const p of parents) {
        const from = SIN_NODE_BY_ID[p.id];
        if (from && from.path === view) out.push({ from, to: node, dashed: p.dashed });
      }
    }
    return out;
  }, [nodes, view]);

  return (
    <div className="sin-canvas relative h-full min-h-[240px] w-full overflow-hidden" style={{ ["--gem" as string]: accent }}>
      <div className="sin-legend" aria-hidden>
        <span>навык</span>
        <span className="is-pass">пасс</span>
        <span className="is-art">сокет</span>
        <span className="is-key">капстоун</span>
      </div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {edges.map((e) => {
          const a = pct(e.from.col, e.from.row);
          const b = pct(e.to.col, e.to.row);
          const lit = (ranks[e.from.id] ?? 0) > 0 && (ranks[e.to.id] ?? 0) > 0;
          return (
            <line
              key={`${e.from.id}-${e.to.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lit ? accent : "rgba(255,255,255,0.14)"}
              strokeWidth={lit ? 0.7 : 0.45}
              strokeDasharray={e.dashed ? "1.6 1.2" : undefined}
              strokeLinecap="round"
              opacity={lit ? 0.95 : 0.45}
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const { x, y } = pct(node.col, node.row);
        const rank = ranks[node.id] ?? 0;
        const owned = rank > 0;
        const can = canAllocateSinNode(ranks, node.id, points, path);
        const kind = sinNodeKind(node);
        const Icon = iconForNode(node);
        const offKey = !!node.keystone && node.path !== path;
        return (
          <div
            key={node.id}
            className={`sin-node absolute -translate-x-1/2 -translate-y-1/2${selectedId === node.id ? " is-open" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <SinGem
              icon={Icon}
              kind={kind}
              accent={offKey ? "#6b7280" : accent}
              size={kind === "keystone" ? "lg" : kind === "passive" ? "sm" : "md"}
              rank={rank}
              maxRank={node.maxRank}
              selected={selectedId === node.id}
              available={can}
              owned={owned}
              locked={!can && !owned}
              title={node.name}
              onClick={() => onSelect(node.id)}
              onDoubleClick={() => can && onAllocate?.(node.id)}
            />
            <span className="sin-node-name">{node.name}</span>
          </div>
        );
      })}
    </div>
  );
}
