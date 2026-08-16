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
      canvas.height = 36;
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

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - 1);
      ctx.lineTo(width, height - 1);
      ctx.stroke();

      const bars = 48;
      const gap = 1;
      const barWidth = (width - gap * (bars - 1)) / bars;

      for (let i = 0; i < bars; i += 1) {
        let normalized = 0.04;
        if (active && analyser && buffer) {
          const step = Math.floor(buffer.length / bars);
          const value = buffer[i * step] ?? 0;
          normalized = value / 255;
        }

        const barHeight = Math.max(2, normalized * (height - 4));
        const x = i * (barWidth + gap);
        const y = height - 2 - barHeight;
        ctx.fillStyle = accent;
        ctx.globalAlpha = active ? 0.8 : 0.18;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active, accent]);

  return (
    <canvas
      ref={canvasRef}
      className="h-9 w-full"
      height={36}
      aria-hidden
    />
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function VerticalVolume({
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
      className="flex w-10 shrink-0 flex-col items-center justify-center self-stretch px-1.5 py-3"
      style={{ backgroundColor: accent }}
    >
      <div className="relative flex min-h-[8rem] flex-1 items-center justify-center">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-32 cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:w-1 [&::-moz-range-track]:rounded-sm [&::-moz-range-track]:bg-white/35 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:rounded-sm [&::-webkit-slider-runnable-track]:bg-white/35"
          style={{ transform: "rotate(-90deg)" }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  accent,
  disabled,
  onChange,
}: {
  value: number;
  accent: string;
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
      className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 disabled:cursor-default disabled:opacity-40 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      style={{ accentColor: accent }}
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
    <div className="flex w-full max-w-5xl items-stretch gap-0">
      <div className="min-w-0 flex-1 space-y-1">
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
            const timeCurrent = isActive ? formatTime(progress) : "00:00";
            const timeTotal = isActive ? formatTime(duration) : "00:00";

            return (
              <li
                key={track.id}
                className={`flex overflow-hidden border backdrop-blur-[2px] transition-colors ${
                  isActive
                    ? "border-white/[0.14] bg-white/[0.05]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035]"
                }`}
                style={
                  isActive
                    ? { boxShadow: `inset 0 1px 0 ${accent}22` }
                    : undefined
                }
              >
                <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 px-2 py-2.5 md:w-20">
                  <div
                    className="aspect-square w-full overflow-hidden"
                    style={{ backgroundColor: track.coverImage ? undefined : accent }}
                  >
                    {track.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="text-lg tabular-nums text-white/70 md:text-base">{slotLabel}</span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-2 pr-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-2xl font-light leading-tight text-white md:text-xl">
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

                  <div className="flex items-center gap-2.5">
                    <ProgressBar
                      value={progressRatio}
                      accent={accent}
                      disabled={!isActive}
                      onChange={onSeek}
                    />
                    <button
                      type="button"
                      onClick={() => onTogglePlay(track.id)}
                      onDoubleClick={() => {
                        if (isActive) onStop();
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-sm text-white transition hover:brightness-110"
                      style={{ backgroundColor: accent }}
                      aria-label={isPlaying ? labels.pause : labels.play}
                      title={isActive ? "Doppelklick: Stop" : undefined}
                    >
                      {isPlaying ? "❚❚" : "▶"}
                    </button>
                    <span className="shrink-0 text-base tabular-nums text-white/80 md:text-sm">
                      {timeCurrent} / {timeTotal}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <VerticalVolume
        volume={volume}
        accent={accent}
        label={labels.volume}
        onChange={onVolumeChange}
      />
    </div>
  );
}
