export interface PadPosition {
  x: number;
  y: number;
}

/** Vertikale Positionen: 30 % näher an den oberen Rand (×0.7). */
export function mobileCoverY(y: number): number {
  return y * 0.7;
}

/** Symmetrisches 3-Spalten-Pad-Grid für Mobile (unteres ~65 % der Szene). */
export function buildMobilePadLayout(slotCount: number): PadPosition[] {
  const cols = 3;
  const colX = [20, 50, 80];
  const startY = mobileCoverY(38);
  const rowStep = 14;

  return Array.from({ length: slotCount }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: colX[col], y: startY + row * rowStep };
  });
}

export const MOBILE_COVER_INACTIVE_PX = 60;
export const MOBILE_COVER_ACTIVE_SCALE = 0.8;
export const MOBILE_COVER_ACTIVE_CENTER = { x: 50, y: mobileCoverY(54) };
export const MOBILE_COVER_FADE_S = 2;
export const MOBILE_COVER_FADE_DURATION_S = 0.45;
export const MOBILE_COVER_EXIT_MS = MOBILE_COVER_FADE_S * 1000;

/** Zufällige Delays innerhalb des 2s-Fensters, damit Covers gestaffelt einblenden. */
export function buildRandomCoverFadeDelays(
  slotCount: number,
  windowS = MOBILE_COVER_FADE_S,
  fadeDurationS = MOBILE_COVER_FADE_DURATION_S
): number[] {
  const maxDelay = Math.max(0, windowS - fadeDurationS);
  return Array.from({ length: slotCount }, () => Math.random() * maxDelay);
}
