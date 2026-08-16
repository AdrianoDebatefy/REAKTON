"use client";

import { useEffect, useRef } from "react";

const POINT_COUNT = 48;
const IDLE_LEVEL = 0.06;

/** Frequency window: skip sub rumble, keep highs visible on the right (log-spaced). */
const FREQ = {
  MIN_BIN_RATIO: 0.03,
  MAX_BIN_RATIO: 0.96,
  WINDOW_BINS: 2,
  HIGH_END_BOOST: 1.55,
} as const;

const DYNAMICS = {
  SESSION_PEAK_DECAY: 0.9992,
  SESSION_PEAK_RISE: 0.32,
  ENVELOPE_ATTACK: 0.44,
  ENVELOPE_RELEASE: 0.07,
  LOUDNESS_EXPONENT: 0.52,
  INPUT_BOOST: 1.65,
  POINT_ATTACK: 0.48,
  POINT_RELEASE: 0.74,
  LEVEL_BAND_START: 0.04,
  LEVEL_BAND_END: 0.88,
} as const;

const COLOR_QUIET: [number, number, number] = [61, 125, 212];
const COLOR_MID: [number, number, number] = [255, 154, 60];
const COLOR_LOUD: [number, number, number] = [232, 50, 74];

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * clamped);
  const g = Math.round(a[1] + (b[1] - a[1]) * clamped);
  const bl = Math.round(a[2] + (b[2] - a[2]) * clamped);
  return `rgb(${r},${g},${bl})`;
}

function loudnessColor(level: number): string {
  const clamped = Math.max(0, Math.min(1, level));
  if (clamped < 0.5) return mixRgb(COLOR_QUIET, COLOR_MID, clamped / 0.5);
  return mixRgb(COLOR_MID, COLOR_LOUD, (clamped - 0.5) / 0.5);
}

function rgbaFromRgb(rgb: string, alpha: number): string {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return `rgba(255,255,255,${alpha})`;
  return `rgba(${match[0]},${match[1]},${match[2]},${alpha})`;
}

function logBinCenter(pointIndex: number, bufferLength: number): number {
  const minBin = Math.max(1, Math.floor(bufferLength * FREQ.MIN_BIN_RATIO));
  const maxBin = Math.max(minBin + 2, Math.floor(bufferLength * FREQ.MAX_BIN_RATIO));
  const t = pointIndex / (POINT_COUNT - 1);
  const logMin = Math.log(minBin + 1);
  const logMax = Math.log(maxBin + 1);
  return Math.exp(logMin + t * (logMax - logMin)) - 1;
}

function sampleBinEnergy(buffer: Uint8Array, centerBin: number): number {
  const radius = FREQ.WINDOW_BINS;
  const from = Math.max(0, Math.floor(centerBin - radius));
  const to = Math.min(buffer.length, Math.ceil(centerBin + radius + 1));
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += buffer[i] ?? 0;
  return sum / (to - from);
}

function measureLevelBand(buffer: Uint8Array): { rms: number; peak: number } {
  const start = Math.floor(buffer.length * DYNAMICS.LEVEL_BAND_START);
  const end = Math.floor(buffer.length * DYNAMICS.LEVEL_BAND_END);
  let sumSq = 0;
  let count = 0;
  let peak = 0;

  for (let i = start; i < end; i += 1) {
    const value = buffer[i] ?? 0;
    sumSq += value * value;
    count += 1;
    if (value > peak) peak = value;
  }

  const rms = count > 0 ? Math.sqrt(sumSq / count) / 255 : 0;
  return { rms, peak: peak / 255 };
}

function updateDynamicsState(
  state: { envelope: number; sessionPeak: number },
  rms: number,
  active: boolean
) {
  if (!active) {
    state.envelope += (IDLE_LEVEL - state.envelope) * 0.12;
    state.sessionPeak += (Math.max(state.sessionPeak * 0.995, IDLE_LEVEL) - state.sessionPeak) * 0.05;
    return IDLE_LEVEL;
  }

  if (rms > state.sessionPeak) {
    state.sessionPeak += (rms - state.sessionPeak) * DYNAMICS.SESSION_PEAK_RISE;
  } else {
    state.sessionPeak =
      state.sessionPeak * DYNAMICS.SESSION_PEAK_DECAY + rms * (1 - DYNAMICS.SESSION_PEAK_DECAY);
  }

  state.sessionPeak = Math.max(state.sessionPeak, 0.035);

  const followRate =
    rms > state.envelope ? DYNAMICS.ENVELOPE_ATTACK : DYNAMICS.ENVELOPE_RELEASE;
  state.envelope += (rms - state.envelope) * followRate;

  const relative = state.envelope / state.sessionPeak;
  const expanded = Math.pow(Math.min(1, relative * DYNAMICS.INPUT_BOOST), DYNAMICS.LOUDNESS_EXPONENT);

  return Math.max(0.02, Math.min(1, expanded));
}

function sampleWaveTargets(
  buffer: Uint8Array | null,
  displayLevel: number,
  visible: boolean,
  active: boolean,
  time: number
): number[] {
  const targets = new Array<number>(POINT_COUNT);

  for (let i = 0; i < POINT_COUNT; i += 1) {
    let target = visible ? IDLE_LEVEL : 0.03;

    if (active && buffer) {
      const centerBin = logBinCenter(i, buffer.length);
      const energy = sampleBinEnergy(buffer, centerBin) / 255;
      const t = i / (POINT_COUNT - 1);
      const hfBoost = 1 + t * (FREQ.HIGH_END_BOOST - 1);
      target = Math.min(1, energy * displayLevel * hfBoost * 1.75);
    } else if (visible) {
      target =
        IDLE_LEVEL +
        0.028 * Math.sin(time * 1.05 + i * 0.2) +
        0.016 * Math.sin(time * 0.65 + i * 0.1);
    }

    targets[i] = target;
  }

  return targets;
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  points: number[],
  width: number,
  height: number,
  baseline: number,
  color: string,
  displayLevel: number,
  active: boolean
) {
  const maxLift = height - 6;
  const opacity = active ? 0.42 + displayLevel * 0.5 : 0.28;
  const glow = active ? 6 + displayLevel * 16 : 4;

  ctx.beginPath();
  ctx.moveTo(0, baseline);

  for (let i = 0; i < points.length; i += 1) {
    const x = (i / (points.length - 1)) * width;
    const y = baseline - points[i]! * maxLift;

    if (i === 0) {
      ctx.lineTo(x, y);
      continue;
    }

    const prevX = ((i - 1) / (points.length - 1)) * width;
    const prevY = baseline - points[i - 1]! * maxLift;
    ctx.quadraticCurveTo((prevX + x) / 2, prevY, x, y);
  }

  ctx.lineTo(width, baseline);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, rgbaFromRgb(color, Math.min(1, opacity + 0.25)));
  gradient.addColorStop(0.5, rgbaFromRgb(color, opacity * 0.65));
  gradient.addColorStop(1, rgbaFromRgb(color, 0));

  ctx.save();
  ctx.shadowBlur = glow;
  ctx.shadowColor = rgbaFromRgb(color, 0.85);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

export function PressEqWaves({
  analyser,
  visible,
  active,
}: {
  analyser: AnalyserNode | null;
  visible: boolean;
  active: boolean;
  accent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const pointsRef = useRef<number[]>(Array.from({ length: POINT_COUNT }, () => IDLE_LEVEL));
  const dynamicsRef = useRef({ envelope: IDLE_LEVEL, sessionPeak: 0.1 });

  useEffect(() => {
    if (!active) {
      dynamicsRef.current = { envelope: IDLE_LEVEL, sessionPeak: 0.1 };
      pointsRef.current = Array.from({ length: POINT_COUNT }, () => IDLE_LEVEL);
    }
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = 44;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const buffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smoothed = pointsRef.current;
    const dynamics = dynamicsRef.current;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const { width, height } = canvas;
      const baseline = height - 2;
      const time = performance.now() / 1000;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseline);
      ctx.lineTo(width, baseline);
      ctx.stroke();

      let displayLevel = IDLE_LEVEL;

      if (active && analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
        const measured = measureLevelBand(buffer);
        displayLevel = updateDynamicsState(dynamics, measured.rms, true);
      } else if (visible) {
        displayLevel = updateDynamicsState(dynamics, IDLE_LEVEL, false);
      }

      const waveColor = loudnessColor(displayLevel);
      const targets = sampleWaveTargets(buffer, displayLevel, visible, active, time);

      for (let i = 0; i < POINT_COUNT; i += 1) {
        const target = targets[i]!;
        const smoothRate =
          target > smoothed[i]! ? DYNAMICS.POINT_ATTACK : DYNAMICS.POINT_RELEASE;
        smoothed[i] = smoothed[i]! * smoothRate + target * (1 - smoothRate);
      }

      drawWave(ctx, smoothed, width, height, baseline, waveColor, displayLevel, active);
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, visible]);

  return <canvas ref={canvasRef} className="h-11 w-full" height={44} aria-hidden />;
}
