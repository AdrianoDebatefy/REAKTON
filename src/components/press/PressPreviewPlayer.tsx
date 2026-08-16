"use client";

import { useEffect, useRef } from "react";
import { StarRating } from "@/components/press/StarRating";

export interface PressPlayerTrack {
  id: string;
  title: string;
  artist?: string;
  coverImage?: string;
  userStars: number | null;
  votes: { totalStars: number; voteCount: number; average: number };
}

function EqBars({
  analyser,
  active,
  accent,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
  accent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = 64;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

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

      const bars = 48;
      const gap = 2;
      const barWidth = (width - gap * (bars - 1)) / bars;
      const step = Math.floor(buffer.length / bars);

      for (let i = 0; i < bars; i += 1) {
        const value = buffer[i * step] ?? 0;
        const normalized = active ? value / 255 : 0.06;
        const barHeight = Math.max(3, normalized * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, accent);
        gradient.addColorStop(1, "rgba(0,0,0,0.15)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, accent]);

  return (
    <canvas
      ref={canvasRef}
      className="h-16 w-full rounded border border-white/10 bg-black/60"
      height={64}
      aria-hidden
    />
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PressPreviewPlayer({
  accent,
  glowClass,
  tracks,
  activeTrack,
  playing,
  progress,
  duration,
  volume,
  analyser,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onSelectTrack,
  onVote,
  labels,
}: {
  accent: string;
  glowClass: string;
  tracks: PressPlayerTrack[];
  activeTrack: PressPlayerTrack | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  analyser: AnalyserNode | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (ratio: number) => void;
  onVolumeChange: (ratio: number) => void;
  onSelectTrack: (id: string) => void;
  onVote: (stars: number) => void;
  labels: { play: string; pause: string; volume: string };
}) {
  const progressRatio = duration > 0 ? progress / duration : 0;

  return (
    <div className={`w-full max-w-3xl rounded-lg border border-white/15 bg-black/50 p-4 md:p-5 ${glowClass}`}>
      {activeTrack ? (
        <div className="flex gap-4">
          <div
            className="h-20 w-20 shrink-0 overflow-hidden rounded border border-white/15"
            style={{ backgroundColor: activeTrack.coverImage ? undefined : accent }}
          >
            {activeTrack.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeTrack.coverImage}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-light text-white md:text-base">{activeTrack.title}</p>
            {activeTrack.artist ? (
              <p className="truncate text-sm text-white/45">{activeTrack.artist}</p>
            ) : null}
            <div className="mt-3">
              <StarRating
                value={activeTrack.votes}
                userStars={activeTrack.userStars}
                onVote={onVote}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <EqBars analyser={analyser} active={playing} accent={accent} />
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={tracks.length < 2}
          className="rounded border border-white/15 px-3 py-2 text-sm text-white/70 disabled:opacity-30"
          aria-label="Previous"
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onStop}
          className="rounded border border-white/15 px-3 py-2 text-sm text-white/70"
          aria-label="Stop"
        >
          ⏹
        </button>
        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-lg text-white transition hover:bg-white/10"
          style={{ boxShadow: `0 0 24px ${accent}44` }}
          aria-label={playing ? labels.pause : labels.play}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={tracks.length < 2}
          className="rounded border border-white/15 px-3 py-2 text-sm text-white/70 disabled:opacity-30"
          aria-label="Next"
        >
          ⏭
        </button>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progressRatio}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: accent }}
          aria-label="Position"
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/40 md:text-[7px]">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-3 text-xs text-white/45">
        <span className="shrink-0 uppercase tracking-widest">{labels.volume}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: accent }}
        />
      </label>

      {tracks.length > 1 ? (
        <ul className="mt-5 max-h-40 space-y-1 overflow-y-auto border-t border-white/10 pt-3">
          {tracks.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => onSelectTrack(track.id)}
                className={`w-full truncate rounded px-2 py-1.5 text-left text-xs transition ${
                  track.id === activeTrack?.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {track.title}
                {track.artist ? ` — ${track.artist}` : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
