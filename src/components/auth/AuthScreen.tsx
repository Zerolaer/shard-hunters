"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Shield, Swords, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/cn";

export function AuthScreen() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "register"
          ? await register(email, name, password)
          : await login(email, password);
      if (!result.ok) setError(result.message ?? "Не удалось войти");
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex h-dvh flex-col items-center justify-center overflow-hidden bg-app px-6 py-10">
      <div className="es-frame w-full max-w-md p-8">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white/8 text-white">
            <Swords className="h-5 w-5" />
          </div>
          <p className="font-display text-3xl font-semibold tracking-tight text-white">Shard Hunters</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Облачный аккаунт — прогресс сохраняется на сервере
          </p>
        </div>

        <div className="es-well mb-5 grid grid-cols-2 gap-1 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={cn("es-tab py-2.5 text-sm", mode === "login" && "is-active")}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={cn("es-tab py-2.5 text-sm", mode === "register" && "is-active")}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <label className="block">
            <span className="es-label">Email</span>
            <input
              type="email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              className="es-input mt-1.5 w-full px-4 py-3"
              placeholder={mode === "register" ? "минимум 6 символов" : "••••••••"}
              required
            />
          </label>
          {error && <p className="text-sm text-white/80">{error}</p>}
          <button type="submit" disabled={busy} className="es-btn es-btn-amber w-full px-4 py-3.5 text-base">
            {mode === "register" ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {busy ? "Секунду…" : mode === "register" ? "Создать охотника" : "Войти"}
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
