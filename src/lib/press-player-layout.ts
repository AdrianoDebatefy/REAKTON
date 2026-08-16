import type { WorldAtmosphere } from "@/types/content";

/** Design canvas — wem_PlayerClean.png */
export const WEM_PLAYER_WIDTH = 1232;
export const WEM_PLAYER_HEIGHT = 141;

export const WEM_TRACK_TEXT = { x: 356, y: 44, width: 370, height: 40 };
export const WEM_EQ = { x: 356, y: 99, width: 370, height: 40 };
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

/** Maps site world atmosphere → press-player asset folder on disk. */
export const PRESS_PLAYER_FOLDER: Partial<Record<WorldAtmosphere, string>> = {
  cosmos: "wem",
  // nano: "mmn",  — add when assets are delivered
  // club: "ccc",
};

/** URL slug (folder name) → atmosphere for API / tracks */
export const PLAYER_SLUG_TO_ATMOSPHERE: Record<string, WorldAtmosphere> = {
  wem: "cosmos",
};

export function playerSlugFromAtmosphere(atmosphere: WorldAtmosphere): string | undefined {
  return PRESS_PLAYER_FOLDER[atmosphere];
}

export function atmosphereFromPlayerSlug(slug: string): WorldAtmosphere | null {
  return PLAYER_SLUG_TO_ATMOSPHERE[slug] ?? null;
}

export function isPressPlayerAssetsReady(world: WorldAtmosphere): boolean {
  return Boolean(PRESS_PLAYER_FOLDER[world]);
}

export function isPlayerSlugReady(slug: string): boolean {
  const atmosphere = atmosphereFromPlayerSlug(slug);
  return atmosphere ? isPressPlayerAssetsReady(atmosphere) : false;
}

/** All assets for a world live in one folder, e.g. public/press-player/wem/ */
export function pressPlayerAssetFromFolder(folder: string, filename: string): string {
  return `/press-player/${folder}/${filename}`;
}

/** @deprecated use pressPlayerAssetFromFolder with playerSlugFromAtmosphere */
export function pressPlayerAsset(world: WorldAtmosphere, filename: string): string {
  const folder = PRESS_PLAYER_FOLDER[world] ?? "wem";
  return pressPlayerAssetFromFolder(folder, filename);
}

export const PRESS_PLAYER_FALLBACK_COVER = "#2a5590";
