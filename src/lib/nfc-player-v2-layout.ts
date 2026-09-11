/** iPhone 14 Pro Max — Adobe XD artboard. */
export const NFC_V2_WIDTH = 430;
export const NFC_V2_HEIGHT = 932;

/** Gestell sits at Y=-24; allow this much bleed above the artboard. */
export const NFC_V2_GESTELL_BLEED_TOP = 24;

export const NFC_V2_TEXT_ROTATION_DEG = -38;

export const NFC_V2_SLIDER = {
  start: { x: 28, y: 660 },
  end: { x: 430, y: 932 },
  knobWidth: 48,
  knobHeight: 48,
} as const;

export type NfcV2Rect = { left: number; top: number; width: number; height: number };

/** Layer rectangles — X/Y = top-left (XD). */
export const NFC_V2_RECTS = {
  background: { left: 0, top: 0, width: 430, height: 932 },
  equalizerflaeche: { left: 28, top: 28, width: 390, height: 566 },
  gestell: { left: 0, top: -24, width: 430, height: 956 },
  cdLaufwerk: { left: 43, top: 368, width: 365, height: 365 },
  realCd: { left: 92, top: 424, width: 257, height: 256 },
  albumplayerDecker: { left: 8, top: 402, width: 414, height: 402 },
  skipForward: { left: 352, top: 418, width: 66, height: 72 },
  skipOnFwd: { left: 362, top: 424, width: 46, height: 51 },
  stop: { left: 353, top: 514, width: 64, height: 64 },
  /** Pause state overlay — play symbol (stop redplay). */
  stopRedplay: { left: 364, top: 517, width: 42, height: 42 },
  stopOn: { left: 364, top: 517, width: 42, height: 42 },
  skipBack: { left: 353, top: 586, width: 64, height: 70 },
  skipOnBack: { left: 364, top: 602, width: 42, height: 48 },
  textSongtitle: { left: 48, top: 509, width: 269, height: 260 },
  textTime: { left: 82, top: 584, width: 235, height: 190 },
  textDesktopcode: { left: 39, top: 150, width: 370, height: 63 },
} as const satisfies Record<string, NfcV2Rect>;

/** Back → front (matches XD layer list). */
export const NFC_V2_Z = {
  background: 1,
  equalizerflaeche: 2,
  gestell: 3,
  cdLaufwerk: 4,
  realCd: 5,
  albumplayerDecker: 6,
  skipForward: 7,
  skipOnFwd: 8,
  stop: 9,
  stopOn: 10,
  skipBack: 11,
  skipOnBack: 12,
  sliderKnob: 13,
  textSongtitle: 14,
  textTime: 15,
  textDesktopcode: 16,
  controls: 20,
} as const;

export function nfcV2SliderRatioFromPoint(x: number, y: number): number {
  const dx = NFC_V2_SLIDER.end.x - NFC_V2_SLIDER.start.x;
  const dy = NFC_V2_SLIDER.end.y - NFC_V2_SLIDER.start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) return 0;
  return Math.min(1, Math.max(0, ((x - NFC_V2_SLIDER.start.x) * dx + (y - NFC_V2_SLIDER.start.y) * dy) / lenSq));
}

export function nfcV2SliderPosition(progressRatio: number) {
  const t = Math.min(1, Math.max(0, progressRatio));
  return {
    x: NFC_V2_SLIDER.start.x + (NFC_V2_SLIDER.end.x - NFC_V2_SLIDER.start.x) * t,
    y: NFC_V2_SLIDER.start.y + (NFC_V2_SLIDER.end.y - NFC_V2_SLIDER.start.y) * t,
  };
}

/**
 * Text on top of XD boxes: position = rect + nudge (artboard px).
 * Scale applies inside the box so XD left/top stay the anchor.
 */
export type NfcV2TextLayerTweak = {
  scale: number;
  nudgeX: number;
  nudgeY: number;
};

/** Set true only to show XD marker frames (#FF0000) while tuning. */
export const NFC_V2_TEXT_DEBUG_FRAMES = false;

export const NFC_V2_TEXT_SONGTITLE: NfcV2TextLayerTweak = {
  scale: 1,
  nudgeX: 0,
  nudgeY: 0,
};

export const NFC_V2_TEXT_TIME: NfcV2TextLayerTweak = {
  scale: 1,
  nudgeX: 0,
  nudgeY: 0,
};

export function nfcV2TextLayerOuterStyle(rect: NfcV2Rect, tweak: NfcV2TextLayerTweak) {
  return {
    left: rect.left + tweak.nudgeX,
    top: rect.top + tweak.nudgeY,
    width: rect.width,
    height: rect.height,
    transform: `rotate(${NFC_V2_TEXT_ROTATION_DEG}deg)`,
    transformOrigin: "50% 50%",
    ...(NFC_V2_TEXT_DEBUG_FRAMES
      ? { outline: "2px solid #FF0000", outlineOffset: -1 }
      : {}),
  };
}

export function nfcV2TextLayerInnerStyle(tweak: NfcV2TextLayerTweak) {
  return {
    transform: `scale(${tweak.scale})`,
    transformOrigin: "50% 50%",
    width: "100%",
    height: "100%",
  };
}

export function nfcV2RectStyle(rect: NfcV2Rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}
