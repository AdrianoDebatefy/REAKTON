/** iPhone 14 Pro Max — Adobe XD artboard. */
export const NFC_V2_WIDTH = 430;
export const NFC_V2_HEIGHT = 932;

/** Gestell sits at Y=-24; allow this much bleed above the artboard. */
export const NFC_V2_GESTELL_BLEED_TOP = 24;

export const NFC_V2_TEXT_ROTATION_DEG = -38;

/**
 * Track scrub line — 0% / 100% = **center** of the 48×48 knob on the groove (XD).
 * Toggle debug overlay to align with gestell: NFC_V2_SLIDER_DEBUG_LINE
 */
export const NFC_V2_SLIDER = {
  start: { x: 28, y: 706 },
  end: { x: 290, y: 503 },
  knobWidth: 48,
  knobHeight: 48,
} as const;

export const NFC_V2_SLIDER_DEBUG_LINE = false;

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
  /** Touch target — covers stop + redplay (always, play or pause). */
  stopHit: { left: 348, top: 508, width: 76, height: 76 },
  skipBack: { left: 353, top: 586, width: 64, height: 70 },
  skipOnBack: { left: 364, top: 602, width: 42, height: 48 },
  textSongtitle: { left: 48, top: 509, width: 269, height: 260 },
  textTime: { left: 82, top: 584, width: 235, height: 190 },
  textDesktopcode: { left: 39, top: 218, width: 370, height: 92 },
  fullScreen: { left: 272, top: 282, width: 154, height: 70 },
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
  sliderTrack: 47,
  sliderKnob: 48,
  textSongtitle: 14,
  textTime: 15,
  textDesktopcode: 16,
  controls: 30,
  fullScreen: 49,
  stopControl: 50,
} as const;

/** XD endpoints shifted +1× knob size along the groove (knob was short at both ends). */
export function nfcV2SliderTravelCenters() {
  const { start, end, knobWidth } = NFC_V2_SLIDER;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0) {
    return { startCenter: start, endCenter: end };
  }
  const ux = dx / len;
  const uy = dy / len;
  const pad = Math.max(0, knobWidth - 10);
  return {
    startCenter: { x: start.x + ux * pad, y: start.y + uy * pad },
    endCenter: { x: end.x + ux * pad, y: end.y + uy * pad },
  };
}

function nfcV2SliderCenter(progressRatio: number) {
  const t = Math.min(1, Math.max(0, progressRatio));
  const { startCenter, endCenter } = nfcV2SliderTravelCenters();
  return {
    x: startCenter.x + (endCenter.x - startCenter.x) * t,
    y: startCenter.y + (endCenter.y - startCenter.y) * t,
  };
}

export function nfcV2SliderRatioFromPoint(x: number, y: number): number {
  const { startCenter, endCenter } = nfcV2SliderTravelCenters();
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, ((x - startCenter.x) * dx + (y - startCenter.y) * dy) / lenSq)
  );
}

/** Knob center on the scrub line. */
export function nfcV2SliderPosition(progressRatio: number) {
  return nfcV2SliderCenter(progressRatio);
}

/** Diagonal scrub line between 0% and 100% knob centers. */
export function nfcV2SliderTrackMetrics() {
  const { startCenter, endCenter } = nfcV2SliderTravelCenters();
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;
  return {
    length: Math.hypot(dx, dy),
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    startCenter,
    endCenter,
  };
}

export function nfcV2SliderKnobStyle(progressRatio: number) {
  const center = nfcV2SliderCenter(progressRatio);
  const halfW = NFC_V2_SLIDER.knobWidth / 2;
  const halfH = NFC_V2_SLIDER.knobHeight / 2;
  return {
    left: center.x - halfW,
    top: center.y - halfH,
    width: NFC_V2_SLIDER.knobWidth,
    height: NFC_V2_SLIDER.knobHeight,
  };
}

/** Red overlay segment for tuning start/end against gestell.svg */
export function nfcV2SliderDebugLineStyle() {
  const { length, angleDeg, startCenter } = nfcV2SliderTrackMetrics();
  return {
    left: startCenter.x,
    top: startCenter.y,
    width: length,
    height: 0,
    transformOrigin: "0 0",
    transform: `rotate(${angleDeg}deg)`,
    borderTop: "2px solid #FF0000",
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
  /** Inner scale anchor (timer: bottom edge of textarea). */
  innerOrigin?: "center" | "bottom";
  /** Text alignment inside the textarea box. */
  align?: "center" | "bottom";
};

/** Longest track title for layout preview (null = use real track title). */
export const NFC_V2_TITLE_PREVIEW: string | null = null;

/** Set true only to show XD marker frames (#FF0000) while tuning. */
export const NFC_V2_TEXT_DEBUG_FRAMES = false;

export const NFC_V2_TEXT_SONGTITLE: NfcV2TextLayerTweak = {
  scale: 1.25,
  nudgeX: 0,
  nudgeY: 0,
};

export const NFC_V2_TEXT_TIME: NfcV2TextLayerTweak = {
  scale: 2,
  nudgeX: 0,
  nudgeY: 0,
  innerOrigin: "bottom",
  align: "bottom",
};

export const NFC_V2_TEXT_DESKTOPCODE = {
  scale: 1.35,
  fontSize: 22,
  labelFontSize: 14,
  /** English only — NFC player has no locale switch. */
  label: "For use on your computer",
} as const;

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
  const originY = tweak.innerOrigin === "bottom" ? "100%" : "50%";
  return {
    transform: `scale(${tweak.scale})`,
    transformOrigin: `50% ${originY}`,
    width: "100%",
    height: "100%",
  };
}

export function nfcV2DisplayTitle(trackTitle: string | undefined): string {
  const raw = NFC_V2_TITLE_PREVIEW ?? trackTitle ?? "";
  return raw.toUpperCase();
}

export function nfcV2RectStyle(rect: NfcV2Rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}
