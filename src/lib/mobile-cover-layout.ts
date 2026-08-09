export interface PadPosition {
  x: number;
  y: number;
}

/** Symmetrisches 3-Spalten-Pad-Grid für Mobile (unteres ~65 % der Szene). */
export function buildMobilePadLayout(slotCount: number): PadPosition[] {
  const cols = 3;
  const colX = [20, 50, 80];
  const startY = 38;
  const rowStep = 9.5;

  return Array.from({ length: slotCount }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: colX[col], y: startY + row * rowStep };
  });
}

export const MOBILE_COVER_INACTIVE_PX = 40;
export const MOBILE_COVER_ACTIVE_CENTER = { x: 50, y: 54 };
export const MOBILE_COVER_FADE_S = 2;
