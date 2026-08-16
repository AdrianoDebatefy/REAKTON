import type { CSSProperties } from "react";
import type { WorldAtmosphere } from "@/types/content";

/** Promote element to its own compositor layer (reduces opacity/transform flicker). */
export const GPU_COMPOSIT_LAYER: CSSProperties = {
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/** Slight overscale so clipped BG edges don't flash during panel resize. */
export const MOBILE_BG_OVERSCAN_SCALE = 1.12;

/** Default landing/world BG focal point — cosmos 30 % higher (50 % × 0.7 = 35 %). */
export function mobileWorldBgObjectPosition(atmosphere: WorldAtmosphere): string {
  if (atmosphere === "cosmos") return "center 35%";
  return "center center";
}
