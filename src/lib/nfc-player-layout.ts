/** NFC mobile player — 2160×3840 design canvas (9:16). */
export const NFC_DESIGN_WIDTH = 2160;
export const NFC_DESIGN_HEIGHT = 3840;

/** Tracks must not cross above this line; bars slide right instead. */
export const NFC_BAR_BOUNDARY_Y = 1200;

export const NFC_EQ = {
  centerX: 1080,
  top: 630,
  width: 1450,
  height: 380,
} as const;

export const NFC_PC_CODE = {
  top: 270,
  scale: 3,
  fontSize: 34,
} as const;

export const NFC_TIME = {
  top: 1050,
  fontSize: 72,
} as const;

export const NFC_SEEK = {
  top: 1120,
  width: 1320,
  /** Native knob.webp size — do not scale down. */
  knobWidth: 140,
  knobHeight: 140,
} as const;

/** Navigation arrows — positions from 2160×3840 mockup. */
export const NFC_ARROWS = {
  left: 154,
  upCenterY: 1380,
  downCenterY: 1880,
  width: 280,
  height: 254,
} as const;

export const NFC_BAR = {
  width: 2000,
  height: 217,
  /** Collapsed / pause — bar center X. */
  xCollapsed: 1880,
  /** Expanded / play — bar center X. */
  xExpanded: 1620,
  /** Off-screen when a bar crosses above the boundary. */
  xOffScreen: 3333,
  textPaddingRight: 100,
  textFontSize: 100,
  gap: 52,
  listTop: 1320,
  desiredFocusCenterY: 1700,
} as const;

export function nfcEqBox() {
  return {
    left: NFC_EQ.centerX - NFC_EQ.width / 2,
    top: NFC_EQ.top,
    width: NFC_EQ.width,
    height: NFC_EQ.height,
  };
}

export function nfcBarStride(): number {
  return NFC_BAR.height + NFC_BAR.gap;
}

export function nfcBarDisplayTop(index: number, scrollOffset: number): number {
  return NFC_BAR.listTop + index * nfcBarStride() - scrollOffset;
}

export function nfcScrollOffset(focusIndex: number, trackCount: number): number {
  if (trackCount <= 0 || focusIndex < 0) return 0;

  const stride = nfcBarStride();
  const desiredTop = NFC_BAR.desiredFocusCenterY - NFC_BAR.height / 2;
  const raw = NFC_BAR.listTop + focusIndex * stride - desiredTop;
  const maxScroll = Math.max(
    0,
    NFC_BAR.listTop + (trackCount - 1) * stride + NFC_BAR.height - (NFC_DESIGN_HEIGHT - 240)
  );

  return Math.max(0, Math.min(raw, maxScroll));
}

/** Bar center X — fully off-screen when the bar would cross above the boundary. */
export function nfcBarCenterX(displayTop: number, isExpanded: boolean): number {
  if (displayTop < NFC_BAR_BOUNDARY_Y) {
    return NFC_BAR.xOffScreen;
  }

  return isExpanded ? NFC_BAR.xExpanded : NFC_BAR.xCollapsed;
}

export function nfcBarLeft(centerX: number): number {
  return centerX - NFC_BAR.width / 2;
}
