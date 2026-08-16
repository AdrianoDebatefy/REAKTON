import type { CSSProperties } from "react";

/** Promote element to its own compositor layer (reduces flicker on real mobile GPUs). */
export const GPU_COMPOSIT_LAYER: CSSProperties = {
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/** Slight overscale so clipped BG edges don't flash during panel resize. */
export const MOBILE_BG_OVERSCAN_SCALE = 1.12;

export function mobileBgOverscanTransform(): string {
  return `scale(${MOBILE_BG_OVERSCAN_SCALE}) translateZ(0)`;
}
