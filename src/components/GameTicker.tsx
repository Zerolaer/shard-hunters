"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";

/** Longest single tick the combat loop will resolve; beyond this it is offline time. */
const MAX_CATCHUP_SECONDS = 2;

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
      onReadyRef.current();
    };

    const timeout = window.setTimeout(finish, 800);
    const unsub = useGameStore.persist.onFinishHydration(finish);

    void Promise.resolve(useGameStore.persist.rehydrate()).finally(() => {
      window.clearTimeout(timeout);
      finish();
    });

    return () => {
      alive = false;
      unsub();
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!ticking) return;
    useGameStore.getState().applyOfflineProgress();
    let last = performance.now();
    const step = () => {
      const t = performance.now();
      // Background tabs throttle setInterval to roughly 1 Hz. Passing the real
      // elapsed time (rather than clamping to a frame) is what keeps a minimised
      // tab earning instead of silently losing ~90% of its progress; the tick
      // loop resolves multiple swings per call to stay correct at this dt.
      const dt = Math.min(MAX_CATCHUP_SECONDS, (t - last) / 1000);
      last = t;
      try {
        useGameStore.getState().tick(dt);
      } catch (err) {
        console.error("[Shard Hunters] tick failed", err);
      }
    };
    const interval = window.setInterval(step, 50);
    const onVis = () => {
      // A fully suspended tab can be gone for hours; that window is offline
      // progress, not combat, so hand it to the offline path rather than
      // replaying it or throwing it away.
      if (document.visibilityState === "visible") {
        useGameStore.getState().applyOfflineProgress();
      }
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ticking]);

  return null;
}
