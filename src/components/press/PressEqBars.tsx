"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 48;
const IDLE_LEVEL = 0.06;
const SMOOTHING = 0.72;

function averageBinRange(buffer: Uint8Array, start: number, end: number): number {
  let sum = 0;
  const from = Math.max(0, start);
  const to = Math.min(buffer.length, end);
  if (to <= from) return 0;
  for (let i = from; i < to; i += 1) sum += buffer[i] ?? 0;
  return sum / (to - from);
}

export function PressEqBars({
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
  const heightsRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => IDLE_LEVEL));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = 40;
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
    const heights = heightsRef.current;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - 1);
      ctx.lineTo(width, height - 1);
      ctx.stroke();

      const gap = 2;
      const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);
      const binsPerBar = buffer ? buffer.length / BAR_COUNT : 1;

      let peak = 0;
      if (active && analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
        for (let i = 0; i < buffer.length; i += 1) {
          if (buffer[i]! > peak) peak = buffer[i]!;
        }
      }

      const gain = peak > 12 ? 255 / peak : 1;

      for (let i = 0; i < BAR_COUNT; i += 1) {
        let target = visible ? IDLE_LEVEL : 0.04;

        if (active && analyser && buffer) {
          const start = Math.floor(i * binsPerBar);
          const end = Math.floor((i + 1) * binsPerBar);
          const avg = averageBinRange(buffer, start, end);
          target = Math.min(1, (avg * gain) / 255);
        }

        heights[i] = heights[i]! * SMOOTHING + target * (1 - SMOOTHING);

        const barHeight = Math.max(2, heights[i]! * (height - 4));
        const x = i * (barWidth + gap);
        const y = height - 2 - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, accent);
        gradient.addColorStop(1, `${accent}22`);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = active ? 0.95 : visible ? 0.4 : 0.2;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      ctx.globalAlpha = 1;
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, visible, accent]);

  return <canvas ref={canvasRef} className="h-10 w-full" height={40} aria-hidden />;
}
