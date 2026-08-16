import type { WorldAtmosphere } from "@/types/content";

/** Design canvas — wem_PlayerClean.png */
export const WEM_PLAYER_WIDTH = 1232;
export const WEM_PLAYER_HEIGHT = 141;

export const WEM_DISPLAY = { x: 128, y: 22, width: 458, height: 72 };
export const WEM_COVER = { x: 28, y: 18, width: 88, height: 88 };

export const WEM_ICONS = {
  skipRew: { x: 606, y: 50 },
  stop: { x: 673, y: 48 },
  play: { x: 741.5, y: 50 },
  pause: { x: 813, y: 50 },
  skipFwd: { x: 876.5, y: 50 },
  onLeft: { x: 23.5, y: 71.25 },
  onRight: { x: 1205.75, y: 69 },
  stars: [
    { x: 956.75, y: 50 },
    { x: 992.63, y: 50 },
    { x: 1030.13, y: 50 },
    { x: 1066.88, y: 50 },
    { x: 1103.25, y: 50 },
  ],
} as const;

export const WEM_KNOB_TRACK = {
  min: { x: 590, y: 105 },
  max: { x: 894, y: 105 },
};

export const WEM_KNOB_VOLUME = {
  min: { x: 938, y: 105 },
  max: { x: 1128, y: 105 },
  lightOffset: { x: -151, y: 13 },
};

export function lerpCoord(
  min: { x: number; y: number },
  max: { x: number; y: number },
  t: number
) {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    x: min.x + (max.x - min.x) * clamped,
    y: min.y + (max.y - min.y) * clamped,
  };
}

const SHARED_FILES = new Set([
  "wem_Player_Icon_play.png",
  "wem_Player_Icon_pause.png",
  "wem_Player_Icon_skip_rew.png",
  "wem_Player_Icon_skip_ffd.png",
  "wem_Player_Icon_Stop.png",
  "wem_Player_Icon_star.png",
  "wem_Player_on_left.png",
  "wem_Player_on_right.png",
  "wem_knob.png",
  "wem_Player_sliderlight.png",
]);

/** Chassis per world; icons shared until world-specific sets are added. */
export function pressPlayerAsset(world: WorldAtmosphere, filename: string): string {
  if (filename === "wem_PlayerClean.png") {
    return `/press-player/${world}/wem_PlayerClean.png`;
  }
  if (SHARED_FILES.has(filename)) {
    return `/press-player/shared/${filename}`;
  }
  return `/press-player/shared/${filename}`;
}

export const PRESS_PLAYER_FALLBACK_COVER = "#2a5590";
