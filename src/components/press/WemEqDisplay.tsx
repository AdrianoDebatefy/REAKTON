"use client";

import { useEffect, useRef } from "react";
import { WEM_DISPLAY } from "@/lib/press-player-layout";

export function WemEqDisplay({
  analyser,
  active,
  accent,
  title,
  artist,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
  accent: string;
  title: string;
  artist?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

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

      const bars = 40;
      const gap = 2;
      const barWidth = (width - gap * (bars - 1)) / bars;
      const step = Math.floor(buffer.length / bars);

      for (let i = 0; i < bars; i += 1) {
        const value = buffer[i * step] ?? 0;
        const normalized = active ? value / 255 : 0.04;
        const barHeight = Math.max(2, normalized * (height * 0.55));
        const x = i * (barWidth + gap);
        const y = height - barHeight - 4;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, accent);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, accent]);

  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{
        left: WEM_DISPLAY.x,
        top: WEM_DISPLAY.y,
        width: WEM_DISPLAY.width,
        height: WEM_DISPLAY.height,
      }}
    >
      <div className="absolute inset-x-2 top-1 z-10 truncate text-[11px] leading-tight text-cyan-100/90 md:text-[8px]">
        <span className="font-medium">{title}</span>
        {artist ? <span className="text-cyan-100/55"> / {artist}</span> : null}
      </div>
      <canvas
        ref={canvasRef}
        width={WEM_DISPLAY.width}
        height={WEM_DISPLAY.height}
        className="absolute inset-0 h-full w-full opacity-90"
        aria-hidden
      />
    </div>
  );
}
