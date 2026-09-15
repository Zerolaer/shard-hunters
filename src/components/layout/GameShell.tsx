"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { ClassPicker } from "@/components/auth/ClassPicker";
import { CombatPanel } from "@/components/combat/CombatPanel";
import { GameHeader } from "@/components/layout/GameHeader";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { RightTabs } from "@/components/layout/RightTabs";
import { GameTicker } from "@/components/GameTicker";
import { flushCloudSave } from "@/lib/auth/accounts";
import { useAuthStore } from "@/store/useAuthStore";
import { useGameStore } from "@/store/useGameStore";

const BOOT_UI_TIMEOUT_MS = 16_000;
const SAVE_HYDRATE_UI_TIMEOUT_MS = 5_000;

export function GameShell() {
  const authReady = useAuthStore((s) => s.ready);
  const bootError = useAuthStore((s) => s.bootError);
  const accountId = useAuthStore((s) => s.accountId);
  const classId = useGameStore((s) => s.character.classId);
  const [hydrated, setHydrated] = useState(false);
  const [bootStuck, setBootStuck] = useState(false);
  const [saveStuck, setSaveStuck] = useState(false);
  const [hydratedForAccount, setHydratedForAccount] = useState<string | null>(null);

  // Reset boot gate during render when the account changes — never in an effect after
  // GameTicker. Zustand persist rehydrate is sync (localStorage), so onReady can fire
  // inside the child effect; a later parent effect that set hydrated=false left the
  // splash stuck forever (finish already marked started).
  if (accountId !== hydratedForAccount) {
    setHydratedForAccount(accountId);
    if (hydrated) setHydrated(false);
    if (saveStuck) setSaveStuck(false);
  }

  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (authReady) {
      setBootStuck(false);
      return;
    }
    const t = window.setTimeout(() => setBootStuck(true), BOOT_UI_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [authReady]);

  useEffect(() => {
    if (!accountId || hydrated) {
      setSaveStuck(false);
      return;
    }
    const t = window.setTimeout(() => {
      setHydrated(true);
      setSaveStuck(true);
    }, SAVE_HYDRATE_UI_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [accountId, hydrated]);

  useEffect(() => {
    const flush = () => flushCloudSave();
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  const onReady = useCallback(() => {
    try {
      const acc = useAuthStore.getState().account;
      const ch = useGameStore.getState().character;
      if (acc && ch.level === 1 && (ch.name === "Каэл" || !ch.name)) {
        useGameStore.getState().renameCharacter(acc.name);
      }
    } catch (err) {
      console.error("[GameShell] onReady", err);
    }
    setHydrated(true);
  }, []);

  const retryBoot = () => {
    setBootStuck(false);
    setSaveStuck(false);
    setHydrated(false);
    useAuthStore.setState({ ready: false, bootError: null });
    void useAuthStore.getState().hydrate();
  };

  const forceEnter = () => {
    setSaveStuck(false);
    setHydrated(true);
  };

  if (!authReady) {
    return (
      <div className="relative z-10 flex h-dvh flex-col overflow-hidden bg-app">
        <BootSplash
          stuck={bootStuck}
          message={bootStuck ? "Загрузка слишком долгая. Сервер или база могут не отвечать." : undefined}
          onRetry={bootStuck ? retryBoot : undefined}
        />
      </div>
    );
  }

  if (!accountId) {
    return <AuthScreen bootError={bootError} onRetryBoot={retryBoot} />;
  }

  return (
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden bg-app">
      <GameTicker key={accountId} onReady={onReady} ticking={hydrated && !!classId} />
      {!hydrated ? (
        <BootSplash
          stuck={saveStuck}
          message={
            saveStuck
              ? "Сохранение с сервера не ответило вовремя. Можно продолжить с локальным прогрессом."
              : undefined
          }
          onRetry={saveStuck ? forceEnter : undefined}
          retryLabel="Продолжить"
        />
      ) : !classId ? (
        <ClassPicker />
      ) : (
        <>
          <GameHeader />
          <OfflineBanner />
          <main className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 grid-rows-2 gap-5 overflow-visible p-5 lg:grid-cols-[minmax(320px,38%)_minmax(0,1fr)] lg:grid-rows-1">
            <div className="h-full min-h-0 min-w-0 overflow-visible">
              <CombatPanel />
            </div>
            <div className="h-full min-h-0 min-w-0 overflow-visible">
              <RightTabs />
            </div>
          </main>
        </>
      )}
    </div>
  );
}

function BootSplash({
  stuck,
  message,
  onRetry,
  retryLabel = "Повторить",
}: {
  stuck?: boolean;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-14 w-14 rounded-full bg-white/15 blur-[1px] shadow-[0_0_40px_rgba(255,255,255,0.12)]" />
      <p className="font-display text-sm font-semibold tracking-[0.2em] text-white">Пробуждение осколков</p>
      {message && <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">{message}</p>}
      {stuck && onRetry && (
        <button type="button" onClick={onRetry} className="es-btn es-btn-amber mt-2 px-5 py-2.5 text-sm">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
