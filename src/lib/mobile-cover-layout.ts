export interface PadPosition {
  x: number;
  y: number;
}

/** Symmetrisches 3-Spalten-Pad-Grid für Mobile (unteres ~65 % der Szene). */
export function buildMobilePadLayout(slotCount: number): PadPosition[] {
  const cols = 3;
  const colX = [20, 50, 80];
  const startY = 38;
  const rowStep = 14;

  return Array.from({ length: slotCount }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: colX[col], y: startY + row * rowStep };
  });
}

export const MOBILE_COVER_INACTIVE_PX = 60;
export const MOBILE_COVER_ACTIVE_SCALE = 1.5;
export const MOBILE_COVER_ACTIVE_CENTER = { x: 50, y: 54 };
export const MOBILE_COVER_FADE_S = 2;
export const MOBILE_COVER_FADE_DURATION_S = 0.45;

/** Zufällige Delays innerhalb des 2s-Fensters, damit Covers gestaffelt einblenden. */
export function buildRandomCoverFadeDelays(
  slotCount: number,
  windowS = MOBILE_COVER_FADE_S,
  fadeDurationS = MOBILE_COVER_FADE_DURATION_S
): number[] {
  const maxDelay = Math.max(0, windowS - fadeDurationS);
  return Array.from({ length: slotCount }, () => Math.random() * maxDelay);
}
