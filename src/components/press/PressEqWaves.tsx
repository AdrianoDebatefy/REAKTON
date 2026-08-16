"use client";

import { useEffect, useRef } from "react";

const POINT_COUNT = 44;
const IDLE_LEVEL = 0.07;

/** Tune dynamics here — lower exponent = more contrast between quiet/loud sections */
const DYNAMICS = {
  SESSION_PEAK_DECAY: 0.9985,
  SESSION_PEAK_RISE: 0.28,
  ENVELOPE_ATTACK: 0.38,
  ENVELOPE_RELEASE: 0.09,
  LOUDNESS_EXPONENT: 0.68,
  INPUT_BOOST: 1.4,
  POINT_ATTACK: 0.52,
  POINT_RELEASE: 0.78,
} as const;

const LAYERS = [
  { start: 0, end: 0.18, opacity: 0.28, amp: 1, phase: 0, glow: 6 },
  { start: 0.08, end: 0.55, opacity: 0.48, amp: 0.82, phase: 1.4, glow: 10 },
  { start: 0.25, end: 1, opacity: 0.72, amp: 0.65, phase: 2.6, glow: 14 },
] as const;

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function averageBinRange(buffer: Uint8Array, start: number, end: number): number {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(buffer.length, Math.ceil(end));
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += buffer[i] ?? 0;
  return sum / (to - from);
}

function measureBuffer(buffer: Uint8Array): { rms: number; peak: number } {
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const value = buffer[i] ?? 0;
    sumSq += value * value;
    if (value > peak) peak = value;
  }
  const rms = Math.sqrt(sumSq / buffer.length) / 255;
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

  state.sessionPeak = Math.max(state.sessionPeak, 0.04);

  const followRate =
    rms > state.envelope ? DYNAMICS.ENVELOPE_ATTACK : DYNAMICS.ENVELOPE_RELEASE;
  state.envelope += (rms - state.envelope) * followRate;

  const relative = state.envelope / state.sessionPeak;
  const expanded = Math.pow(Math.min(1, relative * DYNAMICS.INPUT_BOOST), DYNAMICS.LOUDNESS_EXPONENT);

  return Math.max(0.03, Math.min(1, expanded));
}

function sampleLayerTargets(
  buffer: Uint8Array | null,
  displayLevel: number,
  peak: number,
  layer: (typeof LAYERS)[number],
  visible: boolean,
  active: boolean,
  time: number
): number[] {
  const targets = new Array<number>(POINT_COUNT);
  const peakFloor = Math.max(peak, 0.035);

  for (let i = 0; i < POINT_COUNT; i += 1) {
    let target = visible ? IDLE_LEVEL : 0.04;

    if (active && buffer) {
      const t = i / (POINT_COUNT - 1);
      const binStart = (layer.start + t * (layer.end - layer.start)) * buffer.length;
      const binEnd = binStart + buffer.length / POINT_COUNT;
      const avg = averageBinRange(buffer, binStart, binEnd);
      const absolute = avg / 255;
      const relative = absolute / peakFloor;
      const shape = absolute * 0.45 + relative * 0.55;
      target = Math.min(1, shape * displayLevel * layer.amp * 1.15);
    } else if (visible) {
      target =
        IDLE_LEVEL +
        0.03 * Math.sin(time * 1.1 + i * 0.22 + layer.phase) +
        0.018 * Math.sin(time * 0.7 + i * 0.11);
    }

    targets[i] = target;
  }

  return targets;
}

function drawWaveLayer(
  ctx: CanvasRenderingContext2D,
  points: number[],
  width: number,
  height: number,
  baseline: number,
  accent: string,
  opacity: number,
  glow: number
) {
  const maxLift = height - 6;

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
    const cpX = (prevX + x) / 2;
    ctx.quadraticCurveTo(cpX, prevY, x, y);
  }

  ctx.lineTo(width, baseline);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, hexToRgba(accent, Math.min(1, opacity + 0.2)));
  gradient.addColorStop(0.45, hexToRgba(accent, opacity * 0.55));
  gradient.addColorStop(1, hexToRgba(accent, 0));

  ctx.save();
  ctx.shadowBlur = glow;
  ctx.shadowColor = hexToRgba(accent, opacity * 0.9);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 1;
  ctx.fill();
  ctx.restore();
}

export function PressEqWaves({
  analyser,
  visible,
  active,
  accent,
}: {
  analyser: AnalyserNode | null;
  visible: boolean;
  active: boolean;
  accent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const layersRef = useRef<number[][]>(
    LAYERS.map(() => Array.from({ length: POINT_COUNT }, () => IDLE_LEVEL))
  );
  const dynamicsRef = useRef({ envelope: IDLE_LEVEL, sessionPeak: 0.12 });

  useEffect(() => {
    if (!active) {
      dynamicsRef.current = { envelope: IDLE_LEVEL, sessionPeak: 0.12 };
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
    const layers = layersRef.current;
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
      let peak = 0;

      if (active && analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
        const measured = measureBuffer(buffer);
        peak = measured.peak;
        displayLevel = updateDynamicsState(dynamics, measured.rms, true);
      } else if (visible) {
        displayLevel = updateDynamicsState(dynamics, IDLE_LEVEL, false);
      }

      LAYERS.forEach((layer, layerIndex) => {
        const targets = sampleLayerTargets(
          buffer,
          displayLevel,
          peak,
          layer,
          visible,
          active,
          time
        );
        const smoothed = layers[layerIndex]!;

        for (let i = 0; i < POINT_COUNT; i += 1) {
          const target = targets[i]!;
          const smoothRate =
            target > smoothed[i]! ? DYNAMICS.POINT_ATTACK : DYNAMICS.POINT_RELEASE;
          smoothed[i] = smoothed[i]! * smoothRate + target * (1 - smoothRate);
        }

        const layerOpacity =
          active ? layer.opacity * (0.45 + displayLevel * 0.55) : visible ? layer.opacity * 0.4 : 0.12;
        drawWaveLayer(
          ctx,
          smoothed,
          width,
          height,
          baseline,
          accent,
          layerOpacity,
          active ? layer.glow * (0.5 + displayLevel * 0.5) : 4
        );
      });
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, visible, accent]);

  return <canvas ref={canvasRef} className="h-11 w-full" height={44} aria-hidden />;
}
