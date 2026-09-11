"use client";

import { Rajdhani } from "next/font/google";
import { useEffect, useRef } from "react";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600"],
});

const BAR_ROWS = 88;
const LABEL_COUNT = 10;
const MIN_HZ = 50;
const MAX_HZ = 14_000;
const DEFAULT_SAMPLE_RATE = 44_100;
const IDLE = 0.06;
const LABEL_TEXT_PAD = 6;
/** Max bar + label reach vs. half-width (15 % inward so Hz labels stay inside). */
const METER_REACH = 0.85;
/** Center ribbon half-width (was 14px → +50 %). */
const RIBBON_HALF_BASE = 21;

const DYNAMICS = {
  SESSION_PEAK_DECAY: 0.996,
  SESSION_PEAK_RISE: 0.35,
  INPUT_BOOST: 1.15,
  LOUDNESS_EXPONENT: 0.55,
  POINT_ATTACK: 0.38,
  POINT_RELEASE: 0.72,
} as const;

function labelFontFamily(): string {
  return rajdhani.style.fontFamily;
}

function hzToBin(hz: number, fftSize: number, sampleRate: number): number {
  return (hz * fftSize) / sampleRate;
}

function logHzAt(t: number): number {
  const logMin = Math.log(MIN_HZ);
  const logMax = Math.log(MAX_HZ);
  return Math.exp(logMin + t * (logMax - logMin));
}

function sampleBandEnergy(
  buffer: Uint8Array,
  hz: number,
  fftSize: number,
  sampleRate: number
): number {
  const center = hzToBin(hz, fftSize, sampleRate);
  const window = Math.max(1, Math.round(hzToBin(36, fftSize, sampleRate)));
  const from = Math.max(0, Math.floor(center - window));
  const to = Math.min(buffer.length, Math.ceil(center + window + 1));
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += buffer[i] ?? 0;
  return sum / (to - from) / 255;
}

function formatHz(hz: number): string {
  if (hz >= 1000) {
    const k = hz / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(Math.round(hz));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function barLengths(
  e: number,
  t: number,
  maxLeft: number,
  maxRight: number
): { leftLen: number; rightLen: number } {
  const taper = 0.55 + 0.45 * Math.sin(t * Math.PI);
  return {
    leftLen: e * maxLeft * taper * (0.92 + 0.08 * (1 - t)),
    rightLen: e * maxRight * taper * (0.88 + 0.12 * t),
  };
}

function strokeBarFade(
  ctx: CanvasRenderingContext2D,
  xStart: number,
  xEnd: number,
  y: number,
  r: number,
  g: number,
  b: number,
  peakAlpha: number
) {
  const grad = ctx.createLinearGradient(xStart, y, xEnd, y);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peakAlpha})`);
  grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${peakAlpha * 0.75})`);
  grad.addColorStop(0.82, `rgba(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)}, ${peakAlpha * 0.25})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0.02)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xStart, y);
  ctx.lineTo(xEnd, y);
  ctx.stroke();
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  height: number,
  energies: number[],
  time: number,
  active: boolean,
  musicLevel: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let y = 0; y < height; y += 2) {
    const row = Math.min(BAR_ROWS - 1, Math.floor((y / height) * BAR_ROWS));
    const e = energies[row] ?? IDLE;
    const pulse = active
      ? Math.min(1.2, e * 1.45 + musicLevel * 0.35)
      : IDLE + 0.02 * Math.sin(time * 1.2 + y * 0.05);
    const ribbonHalf =
      RIBBON_HALF_BASE * (0.72 + pulse * 0.42 + musicLevel * 0.28);
    const wobbleScale = 1 + musicLevel * 0.9 + pulse * 0.35;
    const wobble =
      (Math.sin(y * 0.045 + time * 2.1) * 4.5 +
        Math.sin(y * 0.028 - time * 1.4) * 3.75) *
      wobbleScale;
    const alpha = 0.1 + pulse * 0.92 + musicLevel * 0.22;

    const g = ctx.createLinearGradient(centerX - ribbonHalf, y, centerX + ribbonHalf, y);
    g.addColorStop(0, `rgba(80, 200, 255, ${alpha * 0.35})`);
    g.addColorStop(0.35, `rgba(255, 200, 120, ${alpha * 0.85})`);
    g.addColorStop(0.5, `rgba(255, 255, 240, ${Math.min(1, alpha * 1.1)})`);
    g.addColorStop(0.65, `rgba(255, 140, 60, ${alpha * 0.8})`);
    g.addColorStop(1, `rgba(255, 70, 90, ${alpha * 0.4})`);

    ctx.fillStyle = g;
    ctx.fillRect(centerX - ribbonHalf + wobble, y, ribbonHalf * 2, 2);
  }

  ctx.restore();
}

function drawMeterLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  dotX: number,
  y: number,
  side: "left" | "right",
  dotRgb: [number, number, number]
) {
  ctx.fillStyle = `rgba(${dotRgb[0]}, ${dotRgb[1]}, ${dotRgb[2]}, 0.95)`;
  ctx.beginPath();
  ctx.arc(dotX, y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
  if (side === "right") {
    ctx.textAlign = "left";
    ctx.fillText(label, dotX + LABEL_TEXT_PAD, y);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(label, dotX - LABEL_TEXT_PAD, y);
  }
  ctx.shadowBlur = 0;
}

export function NfcEqVisualizer({
  analyser,
  visible,
  active,
  className = "h-full w-full",
}: {
  analyser: AnalyserNode | null;
  visible: boolean;
  active: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const smoothRef = useRef<number[]>(Array.from({ length: BAR_ROWS }, () => IDLE));
  const rawRef = useRef<number[]>(Array.from({ length: BAR_ROWS }, () => IDLE));
  const dynamicsRef = useRef({ sessionPeak: 0.1 });
  const logicalSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    void document.fonts.load(`600 15px ${labelFontFamily()}`);
  }, []);

  useEffect(() => {
    if (!active) {
      smoothRef.current = Array.from({ length: BAR_ROWS }, () => IDLE);
      rawRef.current = Array.from({ length: BAR_ROWS }, () => IDLE);
      dynamicsRef.current.sessionPeak = 0.1;
    }
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      logicalSizeRef.current = { width: w, height: h };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const buffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smooth = smoothRef.current;
    const raw = rawRef.current;
    const dynamics = dynamicsRef.current;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const { width, height } = logicalSizeRef.current;
      if (!width || !height) return;

      const centerX = width / 2;
      const time = performance.now() / 1000;
      const maxLeft = Math.max(20, (centerX - 6) * METER_REACH);
      const maxRight = Math.max(20, (width - centerX - 6) * METER_REACH);

      ctx.clearRect(0, 0, width, height);

      const fftSize = analyser?.fftSize ?? 1024;
      const sampleRate =
        analyser?.context instanceof AudioContext
          ? analyser.context.sampleRate
          : DEFAULT_SAMPLE_RATE;

      if (active && analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
      }

      let rawSumSq = 0;
      for (let row = 0; row < BAR_ROWS; row += 1) {
        const t = row / (BAR_ROWS - 1);
        const hz = logHzAt(t);
        let sample = IDLE;

        if (active && buffer) {
          sample = sampleBandEnergy(buffer, hz, fftSize, sampleRate);
        } else if (visible) {
          sample =
            IDLE +
            0.025 * Math.sin(time * 1.1 + row * 0.2) +
            0.015 * Math.sin(time * 0.65 + row * 0.08);
        }

        raw[row] = sample;
        rawSumSq += sample * sample;
      }

      if (active && buffer) {
        const bandRms = Math.sqrt(rawSumSq / BAR_ROWS);
        if (bandRms > dynamics.sessionPeak) {
          dynamics.sessionPeak +=
            (bandRms - dynamics.sessionPeak) * DYNAMICS.SESSION_PEAK_RISE;
        } else {
          dynamics.sessionPeak =
            dynamics.sessionPeak * DYNAMICS.SESSION_PEAK_DECAY +
            bandRms * (1 - DYNAMICS.SESSION_PEAK_DECAY);
        }
        dynamics.sessionPeak = Math.max(dynamics.sessionPeak, 0.06);
      }

      const peak = dynamics.sessionPeak;
      let rowMean = 0;
      for (let row = 0; row < BAR_ROWS; row += 1) {
        rowMean += raw[row]!;
      }
      rowMean /= BAR_ROWS;

      for (let row = 0; row < BAR_ROWS; row += 1) {
        let target = IDLE;

        if (active && buffer) {
          const relative = raw[row]! / peak;
          const shaped = Math.pow(
            Math.min(1.25, relative * DYNAMICS.INPUT_BOOST),
            DYNAMICS.LOUDNESS_EXPONENT
          );
          const contrast = (raw[row]! - rowMean * 0.85) * 2.2;
          target = Math.min(0.98, Math.max(0.05, shaped * 0.82 + contrast * 0.35));
        } else if (visible) {
          target = raw[row]!;
        }

        const rate =
          target > smooth[row]! ? DYNAMICS.POINT_ATTACK : DYNAMICS.POINT_RELEASE;
        smooth[row] = smooth[row]! * rate + target * (1 - rate);
      }

      let ribbonMusic = 0;
      if (active && buffer) {
        let peakRow = 0;
        for (let row = 0; row < BAR_ROWS; row += 1) {
          peakRow = Math.max(peakRow, smooth[row]!);
        }
        ribbonMusic = Math.min(1, peakRow * 1.05 + (peak > 0 ? peak * 0.35 : 0));
      }

      drawRibbon(ctx, centerX, height, smooth, time, active, ribbonMusic);

      for (let row = 0; row < BAR_ROWS; row += 1) {
        const t = row / (BAR_ROWS - 1);
        const y = t * height;
        const e = smooth[row]!;
        const { leftLen, rightLen } = barLengths(e, t, maxLeft, maxRight);

        const lr = Math.round(lerp(40, 120, t));
        const lg = Math.round(lerp(160, 220, t));
        const leftAlpha = 0.25 + e * 0.75;
        strokeBarFade(ctx, centerX, centerX - leftLen, y, lr, lg, 255, leftAlpha);

        const rr = 255;
        const rg = Math.round(lerp(90, 200, t));
        const rb = Math.round(lerp(50, 80, 1 - t));
        const rightAlpha = 0.25 + e * 0.8;
        strokeBarFade(ctx, centerX, centerX + rightLen, y, rr, rg, rb, rightAlpha);
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();

      ctx.font = `600 15px ${labelFontFamily()}, sans-serif`;
      ctx.textBaseline = "middle";

      for (let i = 0; i < LABEL_COUNT; i += 1) {
        const t = (i + 0.5) / LABEL_COUNT;
        const row = Math.min(BAR_ROWS - 1, Math.floor(t * BAR_ROWS));
        const y = t * height;
        const hz = logHzAt(row / (BAR_ROWS - 1));
        const e = smooth[row]!;
        const pegel = Math.min(99, Math.max(1, Math.round(e * 99)));
        const label = `${formatHz(hz)} ${pegel}`;
        const { leftLen, rightLen } = barLengths(e, t, maxLeft, maxRight);

        const rightDotX = centerX + rightLen;
        drawMeterLabel(
          ctx,
          label,
          rightDotX,
          y,
          "right",
          [255, 140 + Math.round(60 * t), 80]
        );

        const leftDotX = centerX - leftLen;
        drawMeterLabel(
          ctx,
          label,
          leftDotX,
          y,
          "left",
          [80, 180 + Math.round(40 * t), 255]
        );
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [active, analyser, visible]);

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${rajdhani.className}`}
      style={{ imageRendering: "auto" }}
      aria-hidden
    />
  );
}
