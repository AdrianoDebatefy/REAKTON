"use client";

import { useEffect, useRef } from "react";
import { PRESS_EQ_LAYERS, type PressEqLayerTheme } from "@/lib/press-eq-theme";
import type { WorldAtmosphere } from "@/types/content";

const POINT_COUNT = 40;
const IDLE_LEVEL = 0.05;
const DEFAULT_SAMPLE_RATE = 44100;

const DYNAMICS = {
  SESSION_PEAK_DECAY: 0.9994,
  SESSION_PEAK_RISE: 0.3,
  ENVELOPE_ATTACK: 0.4,
  ENVELOPE_RELEASE: 0.08,
  LOUDNESS_EXPONENT: 0.62,
  INPUT_BOOST: 1.25,
  POINT_ATTACK: 0.5,
  POINT_RELEASE: 0.76,
} as const;

function rgbString([r, g, b]: readonly [number, number, number], alpha: number): string {
  return `rgba(${r},${g},${b},${alpha})`;
}

function hzToBin(hz: number, fftSize: number, sampleRate: number): number {
  return (hz * fftSize) / sampleRate;
}

function logHzForPoint(
  pointIndex: number,
  minHz: number,
  maxHz: number,
  pointCount: number
): number {
  const t = pointIndex / (pointCount - 1);
  const logMin = Math.log(minHz);
  const logMax = Math.log(maxHz);
  return Math.exp(logMin + t * (logMax - logMin));
}

function sampleBandEnergy(
  buffer: Uint8Array,
  hz: number,
  fftSize: number,
  sampleRate: number
): number {
  const center = hzToBin(hz, fftSize, sampleRate);
  const window = Math.max(1, Math.round(hzToBin(40, fftSize, sampleRate)));
  const from = Math.max(0, Math.floor(center - window));
  const to = Math.min(buffer.length, Math.ceil(center + window + 1));
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += buffer[i] ?? 0;
  return sum / (to - from);
}

function measureBandRms(
  buffer: Uint8Array,
  minHz: number,
  maxHz: number,
  fftSize: number,
  sampleRate: number
): number {
  const start = Math.max(0, Math.floor(hzToBin(minHz, fftSize, sampleRate)));
  const end = Math.min(buffer.length, Math.ceil(hzToBin(maxHz, fftSize, sampleRate)));
  if (end <= start) return 0;

  let sumSq = 0;
  for (let i = start; i < end; i += 1) {
    const value = buffer[i] ?? 0;
    sumSq += value * value;
  }
  return Math.sqrt(sumSq / (end - start)) / 255;
}

function updateDynamicsState(
  state: { envelope: number; sessionPeak: number },
  rms: number,
  active: boolean
) {
  if (!active) {
    state.envelope += (IDLE_LEVEL - state.envelope) * 0.12;
    return IDLE_LEVEL;
  }

  if (rms > state.sessionPeak) {
    state.sessionPeak += (rms - state.sessionPeak) * DYNAMICS.SESSION_PEAK_RISE;
  } else {
    state.sessionPeak =
      state.sessionPeak * DYNAMICS.SESSION_PEAK_DECAY + rms * (1 - DYNAMICS.SESSION_PEAK_DECAY);
  }

  state.sessionPeak = Math.max(state.sessionPeak, 0.03);

  const followRate =
    rms > state.envelope ? DYNAMICS.ENVELOPE_ATTACK : DYNAMICS.ENVELOPE_RELEASE;
  state.envelope += (rms - state.envelope) * followRate;

  const relative = state.envelope / state.sessionPeak;
  return Math.max(
    0.04,
    Math.min(1, Math.pow(relative * DYNAMICS.INPUT_BOOST, DYNAMICS.LOUDNESS_EXPONENT))
  );
}

function sampleLayerTargets(
  buffer: Uint8Array,
  layer: PressEqLayerTheme,
  displayLevel: number,
  fftSize: number,
  sampleRate: number
): number[] {
  const targets = new Array<number>(POINT_COUNT);

  for (let i = 0; i < POINT_COUNT; i += 1) {
    const hz = logHzForPoint(i, layer.minHz, layer.maxHz, POINT_COUNT);
    const energy = sampleBandEnergy(buffer, hz, fftSize, sampleRate) / 255;
    targets[i] = Math.min(1, energy * displayLevel * 1.85);
  }

  return targets;
}

function drawWaveLayer(
  ctx: CanvasRenderingContext2D,
  points: number[],
  width: number,
  height: number,
  baseline: number,
  layer: PressEqLayerTheme,
  displayLevel: number,
  active: boolean
) {
  const maxLift = height - 6;
  const layerOpacity = active ? layer.opacity * (0.35 + displayLevel * 0.65) : layer.opacity * 0.3;

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
  gradient.addColorStop(0, rgbString(layer.colorTop, Math.min(1, layerOpacity + 0.15)));
  gradient.addColorStop(0.55, rgbString(layer.colorBottom, layerOpacity * 0.75));
  gradient.addColorStop(1, rgbString(layer.colorBottom, 0));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = active ? layer.glow * (0.4 + displayLevel * 0.6) : 3;
  ctx.shadowColor = rgbString(layer.colorTop, 0.55);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

export function PressEqWaves({
  atmosphere,
  analyser,
  visible,
  active,
  className = "h-11 w-full",
  renderBoost = 1,
}: {
  atmosphere: WorldAtmosphere;
  analyser: AnalyserNode | null;
  visible: boolean;
  active: boolean;
  className?: string;
  /** Extra canvas resolution when parent uses CSS scale (e.g. 1/0.6 inside scale(0.6)). */
  renderBoost?: number;
}) {
  const layers = PRESS_EQ_LAYERS[atmosphere];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const layersRef = useRef<number[][]>(
    layers.map(() => Array.from({ length: POINT_COUNT }, () => IDLE_LEVEL))
  );
  const dynamicsRef = useRef(
    layers.map(() => ({ envelope: IDLE_LEVEL, sessionPeak: 0.08 }))
  );
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const logicalSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    layersRef.current = layers.map(() => Array.from({ length: POINT_COUNT }, () => IDLE_LEVEL));
    dynamicsRef.current = layers.map(() => ({ envelope: IDLE_LEVEL, sessionPeak: 0.08 }));
  }, [atmosphere, layers]);

  useEffect(() => {
    if (!active) {
      layersRef.current = layers.map(() => Array.from({ length: POINT_COUNT }, () => IDLE_LEVEL));
      dynamicsRef.current = layers.map(() => ({ envelope: IDLE_LEVEL, sessionPeak: 0.08 }));
    }
  }, [active, layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    canvasCtxRef.current = ctx;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const boost = Math.max(1, renderBoost);
      const logicalWidth = Math.max(1, canvas.clientWidth);
      const logicalHeight = Math.max(1, canvas.clientHeight);
      const bufferScale = dpr * boost;

      canvas.width = Math.floor(logicalWidth * bufferScale);
      canvas.height = Math.floor(logicalHeight * bufferScale);
      ctx.setTransform(bufferScale, 0, 0, bufferScale, 0, 0);

      logicalSizeRef.current = { width: logicalWidth, height: logicalHeight };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [renderBoost]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const buffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smoothedLayers = layersRef.current;
    const dynamics = dynamicsRef.current;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const { width, height } = logicalSizeRef.current;
      if (!width || !height) return;

      const baseline = height - 2;
      const time = performance.now() / 1000;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baseline);
      ctx.lineTo(width, baseline);
      ctx.stroke();

      const fftSize = analyser?.fftSize ?? 1024;
      const sampleRate =
        analyser?.context instanceof AudioContext
          ? analyser.context.sampleRate
          : DEFAULT_SAMPLE_RATE;

      if (active && analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
      }

      layers.forEach((layer, layerIndex) => {
        const layerDynamics = dynamics[layerIndex]!;
        const smoothed = smoothedLayers[layerIndex]!;

        let displayLevel = IDLE_LEVEL;

        if (active && buffer) {
          const bandRms = measureBandRms(buffer, layer.minHz, layer.maxHz, fftSize, sampleRate);
          displayLevel = updateDynamicsState(layerDynamics, bandRms, true);
        } else if (visible) {
          displayLevel =
            IDLE_LEVEL +
            0.02 * Math.sin(time * 1.05 + layerIndex * 0.9) +
            0.012 * Math.sin(time * 0.7 + layerIndex * 1.3);
        }

        const targets =
          active && buffer
            ? sampleLayerTargets(buffer, layer, displayLevel, fftSize, sampleRate)
            : Array.from({ length: POINT_COUNT }, (_, i) =>
                visible
                  ? IDLE_LEVEL + 0.02 * Math.sin(time * 1.1 + i * 0.18 + layerIndex)
                  : 0.03
              );

        for (let i = 0; i < POINT_COUNT; i += 1) {
          const target = targets[i]!;
          const smoothRate =
            target > smoothed[i]! ? DYNAMICS.POINT_ATTACK : DYNAMICS.POINT_RELEASE;
          smoothed[i] = smoothed[i]! * smoothRate + target * (1 - smoothRate);
        }

        drawWaveLayer(ctx, smoothed, width, height, baseline, layer, displayLevel, active);
      });
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, visible, layers, renderBoost]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
