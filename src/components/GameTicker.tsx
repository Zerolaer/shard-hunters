"use client";

import { useEffect, useRef } from "react";
import { flushCloudSave } from "@/lib/auth/accounts";
import { useGameStore } from "@/store/useGameStore";

/** Show the offline summary banner (and quiet combat catch-up) past this gap. */
const OFFLINE_REPORT_SECONDS = 8;
/** Foreground tick rate — persist is throttled separately; keep combat responsive. */
const FOREGROUND_TICK_MS = 50;
/** Background worker interval when the tab is hidden (browsers throttle page timers). */
const BACKGROUND_TICK_MS = 250;

function pulse() {
  const elapsed = (Date.now() - useGameStore.getState().meta.lastTick) / 1000;
  if (elapsed < 0.03) return;
  try {
    if (elapsed >= OFFLINE_REPORT_SECONDS) {
      useGameStore.getState().applyOfflineProgress();
    } else {
      useGameStore.getState().tick(elapsed);
    }
  } catch (err) {
    console.error("[Shard Hunters] tick failed", err);
  }
}

/** Dedicated workers keep timers alive in background tabs; the page interval does not. */
function startHeartbeatWorker(onPulse: () => void, intervalMs: number) {
  if (typeof Worker === "undefined") return () => {};
  try {
    const src = `setInterval(function(){postMessage(0)},${intervalMs});`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const worker = new Worker(url);
    worker.onmessage = () => onPulse();
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    return () => {};
  }
}

export function GameTicker({
  onReady,
  ticking,
}: {
  onReady: () => void;
  ticking: boolean;
}) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let alive = true;
    let started = false;

    const finish = () => {
      if (!alive || started) return;
      started = true;
      try {
        onReadyRef.current();
      } catch (err) {
        console.error("[GameTicker] onReady failed", err);
      }
    };

    // Defer so parent effects cannot undo a sync rehydrate's onReady in the same flush.
    const softTimeout = window.setTimeout(finish, 50);
    const hardTimeout = window.setTimeout(finish, 2500);
    const unsub = useGameStore.persist.onFinishHydration(() => {
      window.setTimeout(finish, 0);
    });

    void Promise.resolve()
      .then(() => useGameStore.persist.rehydrate())
      .catch((err) => {
        console.error("[GameTicker] rehydrate failed", err);
      })
      .finally(() => {
        window.setTimeout(finish, 0);
      });

    return () => {
      alive = false;
      unsub();
      window.clearTimeout(softTimeout);
      window.clearTimeout(hardTimeout);
    };
  }, []);

  useEffect(() => {
    if (!ticking) return;
    useGameStore.getState().applyOfflineProgress();
    flushCloudSave();

    let interval: number | null = null;
    let stopWorker: (() => void) | null = null;

    const clearDrivers = () => {
      if (interval != null) {
        window.clearInterval(interval);
        interval = null;
      }
      if (stopWorker) {
        stopWorker();
        stopWorker = null;
      }
    };

    // Never run interval + worker together — that double-fired combat ticks and drowned the main thread.
    const syncDrivers = () => {
      clearDrivers();
      if (document.visibilityState === "hidden") {
        stopWorker = startHeartbeatWorker(pulse, BACKGROUND_TICK_MS);
      } else {
        interval = window.setInterval(pulse, FOREGROUND_TICK_MS);
      }
    };

    syncDrivers();

    const onVisible = () => {
      syncDrivers();
      pulse();
      flushCloudSave();
    };
    const onHidden = () => {
      syncDrivers();
      flushCloudSave();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") onVisible();
      else onHidden();
    };

    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("freeze", onHidden);
    document.addEventListener("resume", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      clearDrivers();
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("freeze", onHidden);
      document.removeEventListener("resume", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
      flushCloudSave();
    };
  }, [ticking]);

  return null;
}
