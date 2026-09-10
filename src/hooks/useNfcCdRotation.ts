"use client";

import { useEffect, useRef, useState } from "react";

/** 200 RPM → 1200° per second. */
export function nfcCdDegreesPerSecond(rpm: number): number {
  return rpm * 6;
}

/**
 * CD rotation driven by rAF (reliable on mobile; CSS spin was flaky with scaled stage).
 * When `spinActive` is false, angular velocity eases to zero.
 */
export function useNfcCdRotation(spinActive: boolean, rpm: number): number {
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const [angleDeg, setAngleDeg] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const targetVel = spinActive ? nfcCdDegreesPerSecond(rpm) : 0;
      velocityRef.current += (targetVel - velocityRef.current) * Math.min(1, 5 * dt);
      angleRef.current += velocityRef.current * dt;
      setAngleDeg(angleRef.current);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinActive, rpm]);

  return angleDeg;
}
