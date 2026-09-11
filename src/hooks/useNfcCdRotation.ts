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
  rpm: number,
  rampSec = 2.8
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
      const rampUp = rampSec > 0 ? 3 / rampSec : 5;
      const blend = spinActive ? rampUp : 6;
      velocityRef.current += (targetVel - velocityRef.current) * Math.min(1, blend * dt);
      angleRef.current += velocityRef.current * dt;
      const el = targetRef.current;
      if (el) {
        el.style.transform = `rotate(${angleRef.current}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinActive, rampSec, rpm, targetRef]);
}

