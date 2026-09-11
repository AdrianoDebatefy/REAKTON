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
/** Max bar + label reach vs. half-width (inset so Hz labels stay inside). */
const METER_REACH = 0.85 * 0.8;
/** Center wave-monitor ribbon base half-width. */
const RIBBON_HALF_BASE = 21;

const DYNAMICS = {
  SESSION_PEAK_DECAY: 0.996,
  SESSION_PEAK_RISE: 0.35,
  INPUT_BOOST: 1.15,
  LOUDNESS_EXPONENT: 0.55,
  POINT_ATTACK: 0.38,
  POINT_RELEASE: 0.72,
  RIBBON_ATTACK: 0.48,
  RIBBON_RELEASE: 0.76,
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

function waveSampleAtY(
  y: number,
  height: number,
  timeDomain: Uint8Array,
  scroll: number
): number {
  const n = timeDomain.length;
  if (n < 2) return 0;
  const span = n * 0.92;
  const pos = scroll + (y / height) * span;
  const idx = Math.floor(pos) % n;
  const next = (idx + 1) % n;
  const frac = pos - Math.floor(pos);
  const v = timeDomain[idx]! * (1 - frac) + timeDomain[next]! * frac;
  return (v - 128) / 128;
}

function drawRibbonWaveMonitor(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  height: number,
  energies: number[],
  ribbonHalf: number[],
  timeDomain: Uint8Array | null,
  time: number,
  active: boolean
) {
  const step = Math.max(2, Math.floor(height / 120));
  const scroll = active && timeDomain ? time * 42 : 0;

  for (let row = 0; row < BAR_ROWS; row += 1) {
    const e = energies[row] ?? IDLE;
    let wave = 0;
    if (active && timeDomain) {
      const yMid = ((row + 0.5) / BAR_ROWS) * height;
      wave = waveSampleAtY(yMid, height, timeDomain, scroll);
    } else {
      wave = 0.04 * Math.sin(time * 2.4 + row * 0.11);
    }

    const specDrive = active ? Math.min(1.35, e * 1.6) : IDLE;
    const waveDrive = Math.min(1.2, Math.abs(wave) * 1.85);
    const target =
      RIBBON_HALF_BASE * (0.48 + specDrive * 0.55 + waveDrive * 0.95) +
      Math.abs(wave) * RIBBON_HALF_BASE * 0.55;
    const rate =
      target > ribbonHalf[row]! ? DYNAMICS.RIBBON_ATTACK : DYNAMICS.RIBBON_RELEASE;
    ribbonHalf[row] = ribbonHalf[row]! * rate + target * (1 - rate);
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const leftEdge: { x: number; y: number }[] = [];
  const rightEdge: { x: number; y: number }[] = [];

  for (let y = 0; y <= height; y += step) {
    const row = Math.min(BAR_ROWS - 1, Math.floor((y / height) * BAR_ROWS));
    const half = ribbonHalf[row] ?? RIBBON_HALF_BASE * 0.5;
    let wave = 0;
    if (active && timeDomain) {
      wave = waveSampleAtY(y, height, timeDomain, scroll);
    }
    const skew = wave * half * 0.62;
    leftEdge.push({ x: centerX - half + skew, y });
    rightEdge.push({ x: centerX + half + skew, y });
  }

  if (leftEdge.length < 2) {
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(leftEdge[0]!.x, leftEdge[0]!.y);
  for (let i = 1; i < leftEdge.length; i += 1) {
    ctx.lineTo(leftEdge[i]!.x, leftEdge[i]!.y);
  }
  for (let i = rightEdge.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(rightEdge[i]!.x, rightEdge[i]!.y);
  }
  ctx.closePath();

  const g = ctx.createLinearGradient(centerX - RIBBON_HALF_BASE * 1.8, 0, centerX + RIBBON_HALF_BASE * 1.8, 0);
  g.addColorStop(0, "rgba(70, 190, 255, 0.22)");
  g.addColorStop(0.32, "rgba(255, 210, 130, 0.55)");
  g.addColorStop(0.5, "rgba(255, 255, 245, 0.82)");
  g.addColorStop(0.68, "rgba(255, 150, 70, 0.52)");
  g.addColorStop(1, "rgba(255, 80, 100, 0.28)");
  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < leftEdge.length; i += 1) {
    const p = leftEdge[i]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < rightEdge.length; i += 1) {
    const p = rightEdge[i]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

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
  const ribbonHalfRef = useRef<number[]>(Array.from({ length: BAR_ROWS }, () => RIBBON_HALF_BASE * 0.5));
  const logicalSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    void document.fonts.load(`600 15px ${labelFontFamily()}`);
  }, []);

  useEffect(() => {
    if (!active) {
      smoothRef.current = Array.from({ length: BAR_ROWS }, () => IDLE);
      rawRef.current = Array.from({ length: BAR_ROWS }, () => IDLE);
      dynamicsRef.current.sessionPeak = 0.1;
      ribbonHalfRef.current = Array.from({ length: BAR_ROWS }, () => RIBBON_HALF_BASE * 0.5);
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
    const waveBuffer = analyser ? new Uint8Array(analyser.fftSize) : null;
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
        if (waveBuffer) {
          analyser.getByteTimeDomainData(waveBuffer);
        }
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

      drawRibbonWaveMonitor(
        ctx,
        centerX,
        height,
        smooth,
        ribbonHalfRef.current,
        active && waveBuffer ? waveBuffer : null,
        time,
        active
      );

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
