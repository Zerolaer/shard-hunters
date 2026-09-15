import { SAVE_FETCH_MS, fetchWithTimeout } from "./http";
import { isUsableSavePayload, serializeSaveForStorage } from "./saveFormat";

export const PROFILE_PERSIST_NAME = "shard-hunters-save-v2";
export const SESSION_META_KEY = "shard-hunters-session-meta";

const LEGACY_SAVE_KEYS = ["shard-hunters-save-v2", "shard-hunters-save-v1", "shard-hunters-save"];

export interface AccountRecord {
  id: string;
  name: string;
  email: string;
  createdAt?: number;
}

export function scopedSaveKey(persistName: string, accountId: string) {
  return `${persistName}:${accountId}`;
}

export function backupSaveKey(persistName: string, accountId: string) {
  return `${persistName}:${accountId}:backup`;
}

export function isUsableSave(raw: string | null | undefined) {
  return isUsableSavePayload(raw);
}

let activeAccountId: string | null = null;
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCloudValue: string | null = null;

export function getSessionAccountId(): string | null {
  return activeAccountId;
}

export function setSessionAccountId(id: string | null) {
  activeAccountId = id;
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(SESSION_META_KEY, id);
  else localStorage.removeItem(SESSION_META_KEY);
}

export function rememberSessionHint(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(SESSION_META_KEY, id);
  else localStorage.removeItem(SESSION_META_KEY);
}

export function readSessionHint(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_META_KEY);
}

export function migrateUnscopedSave(accountId: string, persistName: string) {
  if (typeof window === "undefined") return;
  const dest = scopedSaveKey(persistName, accountId);
  if (isUsableSave(localStorage.getItem(dest))) return;
  for (const key of LEGACY_SAVE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!isUsableSave(raw) || key === dest) continue;
    localStorage.setItem(dest, raw!);
    localStorage.setItem(backupSaveKey(persistName, accountId), raw!);
    return;
  }
}

/** Carry progress when the browser still has a save under a previous local account id. */
export function migrateScopedSave(fromAccountId: string, toAccountId: string, persistName: string) {
  if (typeof window === "undefined") return;
  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
  const dest = scopedSaveKey(persistName, toAccountId);
  if (isUsableSave(localStorage.getItem(dest))) return;
  const raw = readLocalSaveCache(fromAccountId, persistName);
  if (!isUsableSave(raw)) return;
  localStorage.setItem(dest, raw!);
  localStorage.setItem(backupSaveKey(persistName, toAccountId), raw!);
}

export function writeLocalSaveCache(accountId: string, persistName: string, raw: string) {
  if (typeof window === "undefined") return;
  if (!isUsableSave(raw)) return;
  const key = scopedSaveKey(persistName, accountId);
  const prev = localStorage.getItem(key);
  if (prev && isUsableSave(prev) && prev !== raw) {
    localStorage.setItem(backupSaveKey(persistName, accountId), prev);
  }
  localStorage.setItem(key, raw);
}

export function readLocalSaveCache(accountId: string, persistName: string) {
  if (typeof window === "undefined") return null;
  const primary = localStorage.getItem(scopedSaveKey(persistName, accountId));
  if (isUsableSave(primary)) return primary;
  const backup = localStorage.getItem(backupSaveKey(persistName, accountId));
  if (isUsableSave(backup)) {
    localStorage.setItem(scopedSaveKey(persistName, accountId), backup!);
    return backup;
  }
  return null;
}

async function pushCloudSave(value: string) {
  try {
    const data = JSON.parse(value) as unknown;
    await fetchWithTimeout(
      "/api/save",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data }),
      },
      SAVE_FETCH_MS,
    );
  } catch (err) {
    console.error("[cloud save]", err);
  }
}

export function flushCloudSave() {
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = null;
  }
  if (pendingCloudValue) {
    const value = pendingCloudValue;
    pendingCloudValue = null;
    void pushCloudSave(value);
  }
}

function scheduleCloudSave(value: string) {
  pendingCloudValue = value;
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null;
    const next = pendingCloudValue;
    pendingCloudValue = null;
    if (next) void pushCloudSave(next);
  }, 1200);
}

export function createAccountStorage(persistName: string) {
  return {
    getItem(name: string) {
      const id = getSessionAccountId();
      if (!id || typeof window === "undefined") return null;
      return readLocalSaveCache(id, name);
    },
    setItem(name: string, value: string) {
      const id = getSessionAccountId();
      if (!id || typeof window === "undefined") return;
      if (!isUsableSave(value)) return;
      writeLocalSaveCache(id, name, value);
      scheduleCloudSave(value);
    },
    removeItem() {
      // logout must not wipe the profile
    },
  };
}

export function readActiveSaveRaw(persistName: string) {
  const id = getSessionAccountId();
  if (!id) return null;
  return readLocalSaveCache(id, persistName);
}

export function writeActiveSaveRaw(persistName: string, raw: string) {
  const id = getSessionAccountId();
  if (!id) throw new Error("no session");
  if (!isUsableSave(raw)) throw new Error("invalid save");
  writeLocalSaveCache(id, persistName, raw);
  scheduleCloudSave(raw);
}

export async function pullCloudSaveIntoCache(accountId: string, previousAccountId?: string | null) {
  if (previousAccountId) {
    migrateScopedSave(previousAccountId, accountId, PROFILE_PERSIST_NAME);
  }
  migrateUnscopedSave(accountId, PROFILE_PERSIST_NAME);
  try {
    const res = await fetchWithTimeout("/api/save", { credentials: "include" }, SAVE_FETCH_MS);
    if (!res.ok) return readLocalSaveCache(accountId, PROFILE_PERSIST_NAME);
    const json = (await res.json()) as { ok?: boolean; data?: unknown };
    if (!json.ok || json.data == null) return readLocalSaveCache(accountId, PROFILE_PERSIST_NAME);
    const raw = serializeSaveForStorage(json.data);
    if (!isUsableSave(raw)) return readLocalSaveCache(accountId, PROFILE_PERSIST_NAME);
    writeLocalSaveCache(accountId, PROFILE_PERSIST_NAME, raw);
    return raw;
  } catch {
    return readLocalSaveCache(accountId, PROFILE_PERSIST_NAME);
  }
}
