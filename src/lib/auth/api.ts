import type { AccountRecord } from "./accounts";

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

export async function apiRegister(email: string, name: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, name, password }),
  });
  return parseAuthResponse(res);
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return parseAuthResponse(res);
}

export async function apiLogout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function apiMe(): Promise<AccountRecord | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const json = (await res.json()) as { ok?: boolean; account?: AccountRecord | null };
  return json.account ?? null;
}
