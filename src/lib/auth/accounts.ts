import { SAVE_FETCH_MS, fetchWithTimeout } from "./http";
import {
  isSaveProgressAhead,
  isUsableSavePayload,
  pickNewerSaveRaw,
  serializeSaveForStorage,
} from "./saveFormat";

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
/** Throttle disk writes — ticks run ~20/s and each save is ~100KB; sync localStorage freezes the UI. */
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPersistName: string | null = null;
let pendingPersistSnapshot: { state: unknown; version?: number } | null = null;
let pendingPersistRaw: string | null = null;
const PERSIST_FLUSH_MS = 6000;

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

export function clearSaveBackup(accountId: string, persistName: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(backupSaveKey(persistName, accountId));
}

function readLocalSaveCandidates(accountId: string, persistName: string) {
  if (typeof window === "undefined") return { primary: null as string | null, backup: null as string | null };
  return {
    primary: localStorage.getItem(scopedSaveKey(persistName, accountId)),
    backup: localStorage.getItem(backupSaveKey(persistName, accountId)),
  };
}

/** Keep the newest snapshot in the primary slot; push it to the cloud if it beat the server copy. */
function adoptNewerSave(accountId: string, winner: string | null, cloudRaw: string | null) {
  if (!winner) return null;
  const primary = typeof window === "undefined" ? null : localStorage.getItem(scopedSaveKey(PROFILE_PERSIST_NAME, accountId));
  if (winner !== primary) {
    writeLocalSaveCache(accountId, PROFILE_PERSIST_NAME, winner);
  }
  if (isSaveProgressAhead(winner, cloudRaw)) {
    scheduleCloudSave(winner);
  }
  return winner;
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

async function pushCloudSave(value: string, keepalive = false) {
  try {
    const data = JSON.parse(value) as unknown;
    const body = JSON.stringify({ data });
    // Chromium caps keepalive request bodies (~64KiB). Our saves are often ~100KB.
    const useKeepalive = keepalive && body.length < 60_000;
    const init: RequestInit = {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body,
      keepalive: useKeepalive,
    };
    // pagehide/unload must not use AbortController — the timer would cancel keepalive.
    if (useKeepalive) {
      await fetch("/api/save", init);
      return;
    }
    await fetchWithTimeout("/api/save", init, SAVE_FETCH_MS);
  } catch (err) {
    console.error("[cloud save]", err);
  }
}

function writePersistValue(name: string, value: string) {
  const id = getSessionAccountId();
  if (!id || typeof window === "undefined") return;
  if (!isUsableSave(value)) return;
  writeLocalSaveCache(id, name, value);
  scheduleCloudSave(value);
}

function flushPendingPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const name = pendingPersistName;
  const snapshot = pendingPersistSnapshot;
  let raw = pendingPersistRaw;
  pendingPersistName = null;
  pendingPersistSnapshot = null;
  pendingPersistRaw = null;
  if (!name) return;
  if (!raw && snapshot) {
    try {
      raw = JSON.stringify(snapshot);
    } catch (err) {
      console.error("[persist] stringify failed", err);
      return;
    }
  }
  if (raw) writePersistValue(name, raw);
}

function armPersistFlush() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushPendingPersist();
  }, PERSIST_FLUSH_MS);
}

export function flushCloudSave() {
  flushPendingPersist();
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = null;
  }
  if (pendingCloudValue) {
    const value = pendingCloudValue;
    pendingCloudValue = null;
    void pushCloudSave(value, true);
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
  }, 8000);
}

/**
 * Zustand PersistStorage that throttles JSON.stringify + localStorage.
 * Using createJSONStorage would still stringify on every tick (~20/s × ~100KB).
 */
export function createThrottledPersistStorage(persistName: string) {
  return {
    getItem(name: string) {
      const id = getSessionAccountId();
      if (!id || typeof window === "undefined") return null;
      const raw = readLocalSaveCache(id, name || persistName);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as { state: unknown; version?: number };
      } catch {
        return null;
      }
    },
    setItem(name: string, newValue: { state: unknown; version?: number }) {
      if (typeof window === "undefined") return;
      pendingPersistName = name || persistName;
      pendingPersistSnapshot = newValue;
      pendingPersistRaw = null;
      armPersistFlush();
    },
    removeItem() {
      // logout must not wipe the profile
    },
  };
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
      pendingPersistName = name || persistName;
      pendingPersistRaw = value;
      pendingPersistSnapshot = null;
      armPersistFlush();
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
  const { primary, backup } = readLocalSaveCandidates(accountId, PROFILE_PERSIST_NAME);
  try {
    const res = await fetchWithTimeout("/api/save", { credentials: "include" }, SAVE_FETCH_MS);
    if (!res.ok) return adoptNewerSave(accountId, pickNewerSaveRaw(primary, backup), null);
    const json = (await res.json()) as { ok?: boolean; data?: unknown };
    if (!json.ok || json.data == null) {
      return adoptNewerSave(accountId, pickNewerSaveRaw(primary, backup), null);
    }
    const cloudRaw = serializeSaveForStorage(json.data);
    if (!isUsableSave(cloudRaw)) {
      return adoptNewerSave(accountId, pickNewerSaveRaw(primary, backup), null);
    }
    const winner = pickNewerSaveRaw(primary, backup, cloudRaw);
    return adoptNewerSave(accountId, winner, cloudRaw);
  } catch {
    return adoptNewerSave(accountId, pickNewerSaveRaw(primary, backup), null);
  }
}
