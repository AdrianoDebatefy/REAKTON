import type { WorldAtmosphere } from "@/types/content";

export interface PressEqLayerTheme {
  minHz: number;
  maxHz: number;
  colorTop: readonly [number, number, number];
  colorBottom: readonly [number, number, number];
  opacity: number;
  glow: number;
}

export const PRESS_EQ_LAYERS: Record<WorldAtmosphere, PressEqLayerTheme[]> = {
  cosmos: [
    {
      minHz: 20,
      maxHz: 200,
      colorTop: [107, 63, 160],
      colorBottom: [26, 42, 110],
      opacity: 0.58,
      glow: 8,
    },
    {
      minHz: 200,
      maxHz: 3000,
      colorTop: [78, 205, 196],
      colorBottom: [30, 107, 138],
      opacity: 0.52,
      glow: 10,
    },
    {
      minHz: 3000,
      maxHz: 20000,
      colorTop: [232, 244, 255],
      colorBottom: [94, 179, 255],
      opacity: 0.5,
      glow: 12,
    },
  ],
  nano: [
    {
      minHz: 20,
      maxHz: 200,
      colorTop: [72, 72, 78],
      colorBottom: [28, 28, 32],
      opacity: 0.58,
      glow: 6,
    },
    {
      minHz: 200,
      maxHz: 3000,
      colorTop: [168, 168, 174],
      colorBottom: [98, 98, 104],
      opacity: 0.54,
      glow: 8,
    },
    {
      minHz: 3000,
      maxHz: 20000,
      colorTop: [255, 255, 255],
      colorBottom: [210, 210, 214],
      opacity: 0.5,
      glow: 10,
    },
  ],
  club: [
    {
      minHz: 20,
      maxHz: 200,
      colorTop: [220, 45, 58],
      colorBottom: [120, 18, 28],
      opacity: 0.58,
      glow: 8,
    },
    {
      minHz: 200,
      maxHz: 3000,
      colorTop: [255, 148, 48],
      colorBottom: [196, 88, 22],
      opacity: 0.54,
      glow: 10,
    },
    {
      minHz: 3000,
      maxHz: 20000,
      colorTop: [255, 232, 108],
      colorBottom: [232, 188, 42],
      opacity: 0.52,
      glow: 12,
    },
  ],
};
