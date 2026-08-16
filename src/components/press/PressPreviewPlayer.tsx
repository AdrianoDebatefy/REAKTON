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
      canvas.height = 24;
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

      const bars = 20;
      const gap = 1;
      const barWidth = (width - gap * (bars - 1)) / bars;
      const step = Math.floor(buffer.length / bars);

      for (let i = 0; i < bars; i += 1) {
        const value = buffer[i * step] ?? 0;
        const normalized = active ? value / 255 : 0.04;
        const barHeight = Math.max(1, normalized * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        ctx.fillStyle = accent;
        ctx.globalAlpha = active ? 0.75 : 0.15;
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
      className="h-6 w-full min-w-[4.5rem] rounded-[2px] bg-black/15"
      height={24}
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
  const progressRatio = duration > 0 ? progress / duration : 0;

  return (
    <div className="w-full max-w-3xl space-y-1.5">
      <div
        className="flex items-center gap-4 border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 backdrop-blur-[3px]"
        style={{ boxShadow: `inset 0 1px 0 ${accent}18` }}
      >
        <span className="shrink-0 text-lg uppercase tracking-[0.28em] text-white/45 md:text-base">
          {labels.volume}
        </span>
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
      </div>

      {playbackError ? (
        <p className="border border-red-400/25 bg-red-500/8 px-4 py-2 text-lg text-red-200 md:text-base">
          {playbackError}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {tracks.map((track, index) => {
          const isActive = track.id === activeTrackId;
          const isPlaying = isActive && playing;
          const slotLabel = String(index + 1).padStart(2, "0");

          return (
            <li
              key={track.id}
              className={`border transition-colors backdrop-blur-[3px] ${
                isActive
                  ? "border-white/[0.14] bg-white/[0.055]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035]"
              }`}
              style={
                isActive
                  ? {
                      boxShadow: `inset 0 1px 0 ${accent}22, 0 0 0 1px ${accent}18`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3 px-3 py-2.5 md:gap-3.5 md:px-3.5">
                <span
                  className="w-7 shrink-0 text-center text-lg tabular-nums text-white/25 md:text-base"
                  aria-hidden
                >
                  {slotLabel}
                </span>

                <div
                  className="h-11 w-11 shrink-0 overflow-hidden border border-white/[0.08] md:h-10 md:w-10"
                  style={{ backgroundColor: track.coverImage ? undefined : `${accent}55` }}
                >
                  {track.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xl font-light leading-tight text-white md:text-xl">
                    {track.title}
                  </p>
                  {track.artist ? (
                    <p className="truncate text-xl text-white/40 md:text-lg">{track.artist}</p>
                  ) : null}
                  {isActive ? (
                    <div className="mt-1.5 hidden sm:block">
                      <MiniEq analyser={analyser} active={isPlaying} accent={accent} />
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePlay(track.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/[0.14] bg-white/[0.03] text-2xl text-white transition hover:bg-white/[0.07] md:h-10 md:w-10 md:text-xl"
                  aria-label={isPlaying ? labels.pause : labels.play}
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>

                <div className="hidden shrink-0 lg:block">
                  <StarRating
                    value={track.votes}
                    userStars={track.userStars}
                    onVote={(stars) => onVote(track.id, stars)}
                    size="lg"
                  />
                </div>
              </div>

              {isActive ? (
                <div className="border-t border-white/[0.06] px-3 pb-2.5 pt-2 md:px-3.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.001}
                      value={progressRatio}
                      onChange={(e) => onSeek(Number(e.target.value))}
                      className="flex-1"
                      style={{ accentColor: accent }}
                      aria-label="Position"
                    />
                    <button
                      type="button"
                      onClick={onStop}
                      className="shrink-0 text-lg text-white/45 hover:text-white md:text-base"
                      aria-label="Stop"
                    >
                      ⏹
                    </button>
                    <span className="shrink-0 text-lg tabular-nums text-white/35 md:text-base">
                      {formatTime(progress)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="mt-2 lg:hidden">
                    <StarRating
                      value={track.votes}
                      userStars={track.userStars}
                      onVote={(stars) => onVote(track.id, stars)}
                      size="lg"
                    />
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
