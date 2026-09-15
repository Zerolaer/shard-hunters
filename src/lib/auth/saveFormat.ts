/** Shared save-shape checks for client + server (no browser APIs). */

export interface SaveProgress {
  level: number;
  xp: number;
  lastTick: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function unwrapSaveState(raw: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    const obj = asRecord(parsed);
    if (!obj) return null;
    const nested = asRecord(obj.state);
    if (nested && (nested.character != null || nested.meta != null)) return nested;
    if (obj.character != null) return obj;
    return nested ?? obj;
  } catch {
    return null;
  }
}

export function isUsableSavePayload(raw: unknown): boolean {
  if (raw == null) return false;
  try {
    const state = unwrapSaveState(raw);
    const character = asRecord(state?.character);
    return typeof character?.level === "number";
  } catch {
    return false;
  }
}

export function serializeSaveForStorage(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

export function extractSaveProgress(raw: unknown): SaveProgress | null {
  const state = unwrapSaveState(raw);
  if (!state) return null;
  const character = asRecord(state.character);
  const meta = asRecord(state.meta);
  const level = character?.level;
  if (typeof level !== "number" || !Number.isFinite(level)) return null;
  const xp = character?.xp;
  const lastTick = meta?.lastTick;
  return {
    level,
    xp: typeof xp === "number" && Number.isFinite(xp) ? xp : 0,
    lastTick: typeof lastTick === "number" && Number.isFinite(lastTick) ? lastTick : 0,
  };
}

/** Positive if `a` is newer progress than `b`. Level, then XP, then lastTick. */
export function compareSaveProgress(a: SaveProgress, b: SaveProgress): number {
  if (a.level !== b.level) return a.level - b.level;
  if (a.xp !== b.xp) return a.xp - b.xp;
  return a.lastTick - b.lastTick;
}

export function pickNewerSaveRaw(...candidates: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestProgress: SaveProgress | null = null;
  for (const raw of candidates) {
    if (typeof raw !== "string" || !isUsableSavePayload(raw)) continue;
    const progress = extractSaveProgress(raw);
    if (!progress) continue;
    if (!best || !bestProgress || compareSaveProgress(progress, bestProgress) > 0) {
      best = raw;
      bestProgress = progress;
    }
  }
  return best;
}

export function isSaveProgressAhead(candidate: unknown, baseline: unknown): boolean {
  const a = extractSaveProgress(candidate);
  const b = extractSaveProgress(baseline);
  if (!a) return false;
  if (!b) return true;
  return compareSaveProgress(a, b) > 0;
}
