/** Shared save-shape checks for client + server (no browser APIs). */

export function isUsableSavePayload(raw: unknown): boolean {
  if (raw == null) return false;
  try {
    const parsed =
      typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>);
    const state = parsed.state as { character?: { level?: number } } | undefined;
    const character = state?.character ?? (parsed.character as { level?: number } | undefined);
    return typeof character?.level === "number";
  } catch {
    return false;
  }
}

export function serializeSaveForStorage(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}
