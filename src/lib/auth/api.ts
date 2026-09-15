import type { AccountRecord } from "./accounts";
import { AUTH_FETCH_MS, FetchTimeoutError, fetchWithTimeout } from "./http";

export type AuthResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; message: string };

async function parseAuthResponse(res: Response): Promise<AuthResult> {
  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; message?: string; account?: AccountRecord }
    | null;
  if (!res.ok || !json?.ok || !json.account) {
    return { ok: false, message: json?.message ?? "Запрос не выполнен" };
  }
  return { ok: true, account: json.account };
}

function networkMessage(err: unknown, fallback: string) {
  if (err instanceof FetchTimeoutError) {
    return "Сервер не отвечает. Проверьте интернет или попробуйте позже.";
  }
  return fallback;
}

export async function apiRegister(email: string, name: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetchWithTimeout(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name, password }),
      },
      AUTH_FETCH_MS,
    );
    return parseAuthResponse(res);
  } catch (err) {
    return { ok: false, message: networkMessage(err, "Нет связи с сервером") };
  }
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetchWithTimeout(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      },
      AUTH_FETCH_MS,
    );
    return parseAuthResponse(res);
  } catch (err) {
    return { ok: false, message: networkMessage(err, "Нет связи с сервером") };
  }
}

export async function apiLogout() {
  try {
    await fetchWithTimeout("/api/auth/logout", { method: "POST", credentials: "include" }, AUTH_FETCH_MS);
  } catch {
    // local session clear still happens in the store
  }
}

export async function apiMe(): Promise<AccountRecord | null> {
  try {
    const res = await fetchWithTimeout("/api/auth/me", { credentials: "include" }, AUTH_FETCH_MS);
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; account?: AccountRecord | null };
    return json.account ?? null;
  } catch {
    return null;
  }
}
