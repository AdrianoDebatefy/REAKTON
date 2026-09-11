"use client";

import { useEffect } from "react";

/** Call from play / tap — some browsers only allow lock after user gesture. */
export function lockPortraitForUserGesture(): void {
  tryLockPortrait();
}

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

function tryLockPortrait(): void {
  if (typeof window === "undefined") return;
  const orientation = window.screen.orientation as LockableScreenOrientation;
  if (!orientation?.lock) return;
  void orientation.lock("portrait-primary").catch(() => {
    void orientation.lock?.("portrait").catch(() => undefined);
  });
}

/**
 * Best-effort portrait lock (Android Chrome / installed PWA). No-op where unsupported.
 */
export function usePortraitOrientationLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;

    tryLockPortrait();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tryLockPortrait();
      }
    };

    const onOrientationChange = () => {
      tryLockPortrait();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.screen.orientation?.addEventListener("change", onOrientationChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.screen.orientation?.removeEventListener("change", onOrientationChange);
      try {
        (window.screen.orientation as LockableScreenOrientation).unlock?.();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);
}
