"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Shield, Swords, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/cn";

export function AuthScreen({
  bootError,
  onRetryBoot,
}: {
  bootError?: string | null;
  onRetryBoot?: () => void;
} = {}) {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const intent = mode;
    try {
      if (intent === "register") {
        const result = await register(email, name, password);
        if (!result.ok) {
          const msg = result.message ?? "Не удалось создать аккаунт";
          if (/email уже занят/i.test(msg)) {
            setError(`${msg}. Переключитесь на «Вход» — это логин, не регистрация.`);
            setMode("login");
          } else {
            setError(msg);
          }
        }
      } else {
        const result = await login(email, password);
        if (!result.ok) {
          setError(result.message ?? "Неверный email или пароль");
        }
      }
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex h-dvh flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-app px-6 py-10 max-lg:justify-start max-lg:px-4 max-lg:py-8">
      <div className="es-frame w-full max-w-md p-8 max-lg:p-5">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white/8 text-white">
            <Swords className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-semibold tracking-tight text-white max-lg:text-2xl">Shard Hunters</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {mode === "login"
              ? "Вход в существующий аккаунт — прогресс подтянется с сервера"
              : "Создание нового охотника. Если аккаунт уже есть — вкладка «Вход»."}
          </p>
        </div>

        {bootError && (
          <div className="es-well mb-5 space-y-3 p-3.5">
            <p className="text-sm leading-relaxed text-white/85">{bootError}</p>
            {onRetryBoot && (
              <button type="button" onClick={onRetryBoot} className="es-btn px-3 py-2 text-xs">
                Повторить загрузку сессии
              </button>
            )}
          </div>
        )}

        <div className="es-well mb-5 grid grid-cols-2 gap-1 p-1.5" role="tablist" aria-label="Режим авторизации">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => switchMode("login")}
            className={cn("es-tab py-2.5 text-sm", mode === "login" && "is-active")}
          >
            Вход
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => switchMode("register")}
            className={cn("es-tab py-2.5 text-sm", mode === "register" && "is-active")}
          >
            Регистрация
          </button>
        </div>

        <form
          key={mode}
          onSubmit={(e) => void submit(e)}
          className="space-y-4"
          data-auth-mode={mode}
          autoComplete={mode === "login" ? "on" : "off"}
        >
          <p className="font-display text-lg font-semibold text-white">
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </p>
          <label className="block">
            <span className="es-label">Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="es-input mt-1.5 w-full px-4 py-3"
              placeholder="hunter@example.com"
              required
            />
          </label>
          {mode === "register" && (
            <label className="block">
              <span className="es-label">Имя охотника</span>
              <input
                name="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                className="es-input mt-1.5 w-full px-4 py-3"
                placeholder="Каэл"
                required
              />
            </label>
          )}
          <label className="block">
            <span className="es-label">Пароль</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              className="es-input mt-1.5 w-full px-4 py-3"
              placeholder={mode === "register" ? "минимум 6 символов" : "••••••••"}
              required
              minLength={mode === "register" ? 6 : 1}
            />
          </label>
          {error && (
            <p className="text-sm text-amber-100/90" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="es-btn es-btn-amber w-full px-4 py-3.5 text-base"
            data-auth-action={mode}
          >
            {mode === "register" ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {busy ? "Секунду…" : mode === "register" ? "Создать охотника" : "Войти в аккаунт"}
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Пароль хранится в виде bcrypt-хеша. Сессия — httpOnly cookie. Сохранение в Neon PostgreSQL.
        </p>
      </div>
    </div>
  );
}
