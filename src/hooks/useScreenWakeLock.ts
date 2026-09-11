"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the screen on while `enabled` (Screen Wake Lock API).
 * Re-acquires after tab becomes visible again (browser releases lock on hide).
 */
export function useScreenWakeLock(enabled: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return undefined;
    }

    let cancelled = false;

    const release = async () => {
      try {
        await sentinelRef.current?.release();
      } catch {
        /* already released */
      }
      sentinelRef.current = null;
    };

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
        });
      } catch {
        /* permission denied or unsupported */
      }
    };

    void acquire();

    const onVisibility = () => {
      if (!cancelled && enabled && document.visibilityState === "visible") {
        void acquire();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [enabled]);
}
