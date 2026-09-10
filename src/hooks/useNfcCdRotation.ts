"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/** 200 RPM → 1200° per second. */
export function nfcCdDegreesPerSecond(rpm: number): number {
  return rpm * 6;
}

/**
 * CD rotation via rAF + direct DOM transform (no per-frame React re-renders).
 * When `spinActive` is false, angular velocity eases to zero.
 */
export function useNfcCdRotation(
  targetRef: RefObject<HTMLElement | null>,
  spinActive: boolean,
  rpm: number
): void {
  const angleRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const targetVel = spinActive ? nfcCdDegreesPerSecond(rpm) : 0;
      velocityRef.current += (targetVel - velocityRef.current) * Math.min(1, 5 * dt);
      angleRef.current += velocityRef.current * dt;
      const el = targetRef.current;
      if (el) {
        el.style.transform = `rotate(${angleRef.current}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinActive, rpm, targetRef]);
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      audio.removeEventListener("canplay", done);
      audio.removeEventListener("loadeddata", done);
      resolve();
    };
    audio.addEventListener("canplay", done, { once: true });
    audio.addEventListener("loadeddata", done, { once: true });
  });
}

export async function nfcPrepareAudioPlayback(audio: HTMLAudioElement, absoluteUrl: string): Promise<void> {
  if (audio.src !== absoluteUrl) {
    audio.src = absoluteUrl;
    audio.load();
    await waitForCanPlay(audio);
  }
}
