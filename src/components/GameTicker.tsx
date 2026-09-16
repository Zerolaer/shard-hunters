"use client";

import { useEffect, useRef } from "react";
import { flushCloudSave } from "@/lib/auth/accounts";
import { useGameStore } from "@/store/useGameStore";

/** Show the offline summary banner (and quiet combat catch-up) past this gap. */
const OFFLINE_REPORT_SECONDS = 8;

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

/** Dedicated workers keep 250ms–1s timers in background tabs; the page interval does not. */
function startHeartbeatWorker(onPulse: () => void) {
  if (typeof Worker === "undefined") return () => {};
  try {
    const src = "setInterval(function(){postMessage(0)},250);";
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

    const interval = window.setInterval(pulse, 50);
    const stopWorker = startHeartbeatWorker(pulse);

    const onVisible = () => {
      pulse();
      flushCloudSave();
    };
    const onHidden = () => flushCloudSave();
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
      window.clearInterval(interval);
      stopWorker();
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("freeze", onHidden);
      document.removeEventListener("resume", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [ticking]);

  return null;
}
