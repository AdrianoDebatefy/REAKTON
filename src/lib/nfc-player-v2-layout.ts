/** XD artboard size (matches chassis.png). */
export const NFC_V2_WIDTH = 373;
export const NFC_V2_HEIGHT = 812;

export const NFC_V2_SLIDER = {
  start: { x: 28, y: 656 },
  end: { x: 285, y: 460 },
  knobWidth: 64,
  knobHeight: 64,
} as const;

export const NFC_V2_LAYERS = {
  realCd: { left: 34, top: 312, width: 196, height: 196 },
  cdRing: { left: 52, top: 330, width: 160, height: 160 },
  sliderArm: { left: 6, top: 328, width: 268, height: 262 },
  skipBack: { left: 276, top: 362, width: 46, height: 51 },
  stop: { left: 276, top: 418, width: 42, height: 42 },
  skipForward: { left: 276, top: 468, width: 46, height: 51 },
  skipOnBack: { left: 268, top: 354, width: 62, height: 67 },
  skipOnFwd: { left: 268, top: 460, width: 62, height: 67 },
  stopOn: { left: 268, top: 408, width: 58, height: 62 },
  textSongtitle: { left: 14, top: 672, width: 345, height: 48 },
  textTime: { left: 248, top: 738, width: 110, height: 36 },
  textDesktopcode: { left: 198, top: 198, width: 165, height: 72 },
  equalizer: { left: 208, top: 278, width: 150, height: 118 },
} as const;

export function nfcV2SliderPosition(progressRatio: number) {
  const t = Math.min(1, Math.max(0, progressRatio));
  return {
    x: NFC_V2_SLIDER.start.x + (NFC_V2_SLIDER.end.x - NFC_V2_SLIDER.start.x) * t,
    y: NFC_V2_SLIDER.start.y + (NFC_V2_SLIDER.end.y - NFC_V2_SLIDER.start.y) * t,
  };
}
