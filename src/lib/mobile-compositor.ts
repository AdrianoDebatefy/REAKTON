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

/** Cosmos default: shift motif 30 % upward. */
export const MOBILE_COSMOS_BG_SHIFT_RATIO = 0.3;

export function mobileWorldBgImageStyle(atmosphere: WorldAtmosphere): CSSProperties {
  const objectPosition = atmosphere === "cosmos" ? "center 20%" : "center center";
  const translateY =
    atmosphere === "cosmos"
      ? `calc(-50% - ${MOBILE_COSMOS_BG_SHIFT_RATIO * 100}%)`
      : "-50%";

  return {
    ...GPU_COMPOSIT_LAYER,
    objectPosition,
    minWidth: `${MOBILE_BG_OVERSCAN_SCALE * 100}%`,
    minHeight: `${MOBILE_BG_OVERSCAN_SCALE * 100}%`,
    transform: `translate(-50%, ${translateY}) scale(${MOBILE_BG_OVERSCAN_SCALE}) translateZ(0)`,
  };
}
