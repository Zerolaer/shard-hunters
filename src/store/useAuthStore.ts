import { create } from "zustand";
import {
  flushCloudSave,
  getSessionAccountId,
  pullCloudSaveIntoCache,
  readSessionHint,
  setSessionAccountId,
  type AccountRecord,
} from "@/lib/auth/accounts";
import { apiLogin, apiLogout, apiMe, apiRegister } from "@/lib/auth/api";
import { HYDRATE_BUDGET_MS } from "@/lib/auth/http";
import { createInitialState } from "@/lib/game/createInitialState";
import { useGameStore } from "./useGameStore";

interface AuthStore {
  ready: boolean;
  bootError: string | null;
  accountId: string | null;
  account: AccountRecord | null;
  hydrate: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

/** Pull cloud save into localStorage, then refresh the in-memory game store if still on this account. */
async function syncCloudSave(accountId: string, previousAccountId: string | null) {
  try {
    await pullCloudSaveIntoCache(accountId, previousAccountId);
    if (getSessionAccountId() === accountId) {
      await useGameStore.persist.rehydrate();
    }
  } catch (err) {
    console.error("[auth] cloud save sync failed", err);
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ready: false,
  bootError: null,
  accountId: null,
  account: null,
  hydrate: async () => {
    let safety: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined") {
      safety = setTimeout(() => {
        if (!get().ready) {
          setSessionAccountId(null);
          set({
            ready: true,
            bootError: "Сервер отвечает слишком долго. Войдите снова или нажмите «Повторить».",
            accountId: null,
            account: null,
          });
        }
      }, HYDRATE_BUDGET_MS);
    }

    try {
      const account = await apiMe();
      if (account) {
        const previousId = readSessionHint();
        setSessionAccountId(account.id);
        await syncCloudSave(account.id, previousId);
        set({ ready: true, bootError: null, accountId: account.id, account });
        return;
      }
      setSessionAccountId(null);
      set({ ready: true, bootError: null, accountId: null, account: null });
    } catch {
      setSessionAccountId(null);
      set({
        ready: true,
        bootError: "Не удалось восстановить сессию. Войдите снова или повторите попытку.",
        accountId: null,
        account: null,
      });
    } finally {
      if (safety) clearTimeout(safety);
      if (!get().ready) {
        setSessionAccountId(null);
        set({ ready: true, bootError: "Сбой загрузки. Войдите снова.", accountId: null, account: null });
      }
    }
  },
  register: async (email, name, password) => {
    const result = await apiRegister(email, name, password);
    if (!result.ok) return { ok: false, message: result.message };
    const previousId = readSessionHint();
    setSessionAccountId(result.account.id);
    set({ accountId: result.account.id, account: result.account, bootError: null, ready: true });
    void syncCloudSave(result.account.id, previousId);
    return { ok: true };
  },
  login: async (email, password) => {
    const result = await apiLogin(email, password);
    if (!result.ok) return { ok: false, message: result.message };
    const previousId = readSessionHint();
    setSessionAccountId(result.account.id);
    set({ accountId: result.account.id, account: result.account, bootError: null, ready: true });
    void syncCloudSave(result.account.id, previousId);
    return { ok: true };
  },
  logout: async () => {
    flushCloudSave();
    const snap = useGameStore.getState();
    useGameStore.setState({ meta: { ...snap.meta, lastTick: Date.now() } });
    await apiLogout();
    setSessionAccountId(null);
    useGameStore.setState(createInitialState());
    set({ accountId: null, account: null, bootError: null });
  },
}));

export function useActiveAccount() {
  return useAuthStore((s) => s.account);
}

export function currentAccountName() {
  return useAuthStore.getState().account?.name ?? "охотник";
}
