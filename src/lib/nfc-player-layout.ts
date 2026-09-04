/** NFC mobile player — 2160×3840 design canvas (9:16). */
export const NFC_DESIGN_WIDTH = 2160;
export const NFC_DESIGN_HEIGHT = 3840;

export const NFC_EQ = {
  /** Horizontal center on design canvas. */
  centerX: 1080,
  top: 630,
  width: 1450,
  height: 380,
} as const;

export const NFC_BAR = {
  width: 2000,
  height: 217,
  /** Collapsed / pause — bar slides in from the right. */
  xCollapsed: 1880,
  /** Expanded / play — bar slides out to the left. */
  xExpanded: 1620,
  textPaddingRight: 100,
  gap: 48,
  /** Bottom edge of the stacked track bars. */
  stackBottom: 3600,
} as const;

export function nfcBarTop(index: number, trackCount: number): number {
  const stackHeight =
    trackCount * NFC_BAR.height + Math.max(0, trackCount - 1) * NFC_BAR.gap;
  const stackTop = NFC_BAR.stackBottom - stackHeight;
  return stackTop + index * (NFC_BAR.height + NFC_BAR.gap);
}

export function nfcEqBox() {
  return {
    left: NFC_EQ.centerX - NFC_EQ.width / 2,
    top: NFC_EQ.top,
    width: NFC_EQ.width,
    height: NFC_EQ.height,
  };
}
