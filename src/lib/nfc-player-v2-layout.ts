/** iPhone 14 Pro Max — Adobe XD artboard. */
export const NFC_V2_WIDTH = 430;
export const NFC_V2_HEIGHT = 932;

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
  stopOn: { left: 364, top: 517, width: 42, height: 42 },
  skipBack: { left: 353, top: 586, width: 64, height: 70 },
  skipOnBack: { left: 364, top: 602, width: 42, height: 48 },
  textSongtitle: { left: 35, top: 530, width: 328, height: 50 },
  textTime: { left: 130, top: 620, width: 186, height: 50 },
  textDesktopcode: { left: 39, top: 150, width: 370, height: 63 },
} as const satisfies Record<string, NfcV2Rect>;

export function nfcV2SliderPosition(progressRatio: number) {
  const t = Math.min(1, Math.max(0, progressRatio));
  return {
    x: NFC_V2_SLIDER.start.x + (NFC_V2_SLIDER.end.x - NFC_V2_SLIDER.start.x) * t,
    y: NFC_V2_SLIDER.start.y + (NFC_V2_SLIDER.end.y - NFC_V2_SLIDER.start.y) * t,
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
