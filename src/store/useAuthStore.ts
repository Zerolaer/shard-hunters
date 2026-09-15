import { create } from "zustand";
import {
  flushCloudSave,
  pullCloudSaveIntoCache,
  setSessionAccountId,
  type AccountRecord,
} from "@/lib/auth/accounts";
import { apiLogin, apiLogout, apiMe, apiRegister } from "@/lib/auth/api";
import { createInitialState } from "@/lib/game/createInitialState";
import { useGameStore } from "./useGameStore";

interface AuthStore {
  ready: boolean;
  accountId: string | null;
  account: AccountRecord | null;
  hydrate: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

async function activateAccount(account: AccountRecord) {
  setSessionAccountId(account.id);
  await pullCloudSaveIntoCache(account.id);
}

export const useAuthStore = create<AuthStore>((set) => ({
  ready: false,
  accountId: null,
  account: null,
  hydrate: async () => {
    try {
      const account = await apiMe();
      if (account) {
        await activateAccount(account);
        set({ ready: true, accountId: account.id, account });
        return;
      }
      setSessionAccountId(null);
      set({ ready: true, accountId: null, account: null });
    } catch {
      setSessionAccountId(null);
      set({ ready: true, accountId: null, account: null });
    }
  },
  register: async (email, name, password) => {
    const result = await apiRegister(email, name, password);
    if (!result.ok) return { ok: false, message: result.message };
    await activateAccount(result.account);
    set({ accountId: result.account.id, account: result.account });
    return { ok: true };
  },
  login: async (email, password) => {
    const result = await apiLogin(email, password);
    if (!result.ok) return { ok: false, message: result.message };
    await activateAccount(result.account);
    set({ accountId: result.account.id, account: result.account });
    return { ok: true };
  },
  logout: async () => {
    flushCloudSave();
    const snap = useGameStore.getState();
    useGameStore.setState({ meta: { ...snap.meta, lastTick: Date.now() } });
    await apiLogout();
    setSessionAccountId(null);
    useGameStore.setState(createInitialState());
    set({ accountId: null, account: null });
  },
}));

export function useActiveAccount() {
  return useAuthStore((s) => s.account);
}

export function currentAccountName() {
  return useAuthStore.getState().account?.name ?? "охотник";
}
