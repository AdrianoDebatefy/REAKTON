"use client";

import { useEffect, useRef } from "react";
import type { WorldAtmosphere } from "@/types/content";
import { StarRating } from "@/components/press/StarRating";

export interface PressPlayerTrack {
  id: string;
  title: string;
  artist?: string;
  coverImage?: string;
  userStars: number | null;
  votes: { totalStars: number; voteCount: number; average: number };
}

function MiniEq({
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
      canvas.height = 28;
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

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const bars = 56;
      const gap = 1;
      const barWidth = (width - gap * (bars - 1)) / bars;

      for (let i = 0; i < bars; i += 1) {
        let normalized = 0.06;
        if (active && analyser && buffer) {
          const step = Math.floor(buffer.length / bars);
          const value = buffer[i * step] ?? 0;
          normalized = value / 255;
        }

        const barHeight = Math.max(1, normalized * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.globalAlpha = active ? 0.7 : 0.25;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, accent]);

  return <canvas ref={canvasRef} className="h-7 w-full" height={28} aria-hidden />;
}

function formatTimeExtended(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:00`;
}

function SlotVolume({
  volume,
  accent,
  label,
  onChange,
}: {
  volume: number;
  accent: string;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className="flex w-9 shrink-0 self-stretch items-stretch border-l px-1.5 py-2"
      style={{ borderColor: `${accent}99` }}
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/20" />
        <div
          className="pointer-events-none absolute left-1/2 h-px w-4 -translate-x-1/2"
          style={{
            bottom: `calc(${volume * 100}% - 1px)`,
            backgroundColor: accent,
          }}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (ratio: number) => void;
}) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-px w-full cursor-pointer appearance-none bg-white/25 disabled:cursor-default disabled:opacity-40 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent"
      aria-label="Position"
    />
  );
}

export function PressPreviewPlayer({
  accent,
  atmosphere,
  tracks,
  activeTrackId,
  playing,
  progress,
  duration,
  volume,
  analyser,
  playbackError,
  onTogglePlay,
  onStop,
  onSeek,
  onVolumeChange,
  onVote,
  labels,
}: {
  accent: string;
  atmosphere: WorldAtmosphere;
  tracks: PressPlayerTrack[];
  activeTrackId: string | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  analyser: AnalyserNode | null;
  playbackError: string | null;
  onTogglePlay: (trackId: string) => void;
  onStop: () => void;
  onSeek: (ratio: number) => void;
  onVolumeChange: (ratio: number) => void;
  onVote: (trackId: string, stars: number) => void;
  labels: { play: string; pause: string; volume: string };
}) {
  const activeProgressRatio = duration > 0 ? progress / duration : 0;

  return (
    <div className="w-full max-w-5xl space-y-1">
      {playbackError ? (
        <p className="border border-red-400/25 bg-red-500/8 px-4 py-2 text-lg text-red-200 md:text-base">
          {playbackError}
        </p>
      ) : null}

      <ul className="space-y-1">
        {tracks.map((track, index) => {
          const isActive = track.id === activeTrackId;
          const isPlaying = isActive && playing;
          const slotLabel = String(index + 1).padStart(2, "0");
          const progressRatio = isActive ? activeProgressRatio : 0;
          const timeCurrent = isActive ? formatTimeExtended(progress) : "00:00:00:00";
          const timeTotal = isActive ? formatTimeExtended(duration) : "00:00:00:00";

          return (
            <li
              key={track.id}
              className="flex items-stretch overflow-hidden border bg-black/40 backdrop-blur-[2px] transition-colors"
              style={{ borderColor: `${accent}66` }}
            >
              <div className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1 px-2 py-2 md:w-[4.75rem]">
                <div
                  className="aspect-square w-full overflow-hidden"
                  style={{ backgroundColor: track.coverImage ? undefined : accent }}
                >
                  {track.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="text-base tabular-nums text-white/55 md:text-sm">{slotLabel}</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-2 pr-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-2xl font-light leading-tight text-white/90 md:text-xl">
                    {track.title}
                  </p>
                  <StarRating
                    value={track.votes}
                    userStars={track.userStars}
                    onVote={(stars) => onVote(track.id, stars)}
                    size="lg"
                    atmosphere={atmosphere}
                    compact
                  />
                </div>

                <MiniEq
                  analyser={isActive ? analyser : null}
                  active={isPlaying}
                  accent={accent}
                />

                <ProgressBar
                  value={progressRatio}
                  disabled={!isActive}
                  onChange={onSeek}
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onTogglePlay(track.id)}
                    onDoubleClick={() => {
                      if (isActive) onStop();
                    }}
                    className="h-3.5 w-3.5 shrink-0 transition hover:brightness-110"
                    style={{ backgroundColor: accent }}
                    aria-label={isPlaying ? labels.pause : labels.play}
                    title={isActive ? "Doppelklick: Stop" : undefined}
                  />
                  <span className="shrink-0 text-sm tabular-nums text-white/75 md:text-xs">
                    {timeCurrent} / {timeTotal}
                  </span>
                </div>
              </div>

              <SlotVolume
                volume={volume}
                accent={accent}
                label={labels.volume}
                onChange={onVolumeChange}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
