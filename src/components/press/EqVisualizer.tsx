"use client";

import { useEffect, useRef } from "react";

export function EqVisualizer({
  analyser,
  active,
  colors,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
  colors: [string, string];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(buffer);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const bars = 32;
      const gap = 3;
      const barWidth = (width - gap * (bars - 1)) / bars;
      const step = Math.floor(buffer.length / bars);

      for (let i = 0; i < bars; i += 1) {
        const value = buffer[i * step] ?? 0;
        const normalized = active ? value / 255 : value / 255 * 0.15;
        const barHeight = Math.max(4, normalized * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, colors[1]);
        gradient.addColorStop(1, colors[0]);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, colors]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={120}
      className="h-24 w-full rounded border border-white/10 bg-black/50"
      aria-hidden
    />
  );
}
