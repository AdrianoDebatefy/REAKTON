"use client";

import type { WorldAtmosphere } from "@/types/content";
import { PressEqBars } from "@/components/press/PressEqBars";
import { StarRating } from "@/components/press/StarRating";

export interface PressPlayerTrack {
  id: string;
  title: string;
  artist?: string;
  coverImage?: string;
  userStars: number | null;
  votes: { totalStars: number; voteCount: number; average: number };
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
          className="pointer-events-none absolute left-1/2 h-0.5 w-6 -translate-x-1/2"
          style={{
            bottom: `calc(${volume * 100}% - 1px)`,
            backgroundColor: accent,
            boxShadow: `0 0 6px ${accent}88`,
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
  accent,
  disabled,
  onChange,
}: {
  value: number;
  accent: string;
  disabled?: boolean;
  onChange: (ratio: number) => void;
}) {
  const thumbLeft = `calc(${value * 100}% - 6px)`;

  return (
    <div className="relative h-5 w-full">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/35" />
      <div
        className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-black/20"
        style={{ left: thumbLeft, boxShadow: `0 0 0 1px ${accent}55` }}
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        aria-label="Position"
      />
    </div>
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
  onPlay,
  onStop,
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
  onPlay: (trackId: string) => void;
  onStop: () => void;
  onSeek: (ratio: number) => void;
  onVolumeChange: (ratio: number) => void;
  onVote: (trackId: string, stars: number) => void;
  labels: { play: string; stop: string; volume: string };
}) {
  const activeProgressRatio = duration > 0 ? progress / duration : 0;

  return (
    <div className="w-full max-w-7xl space-y-1">
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
              <div className="flex w-[7.5rem] shrink-0 flex-col items-center gap-2 px-3 py-3 md:w-32">
                <div
                  className="aspect-square w-full overflow-hidden"
                  style={{ backgroundColor: track.coverImage ? undefined : accent }}
                >
                  {track.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="text-[2.5rem] font-light leading-none tabular-nums text-white/60 md:text-4xl">
                  {slotLabel}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-2 pr-2">
                <div className="relative flex min-h-8 items-start">
                  <p className="min-w-0 flex-1 truncate pr-36 text-2xl font-light leading-tight text-white/90 md:pr-40 md:text-xl">
                    {track.title}
                  </p>
                  <div className="absolute right-[20%] top-0 shrink-0">
                    <StarRating
                      value={track.votes}
                      userStars={track.userStars}
                      onVote={(stars) => onVote(track.id, stars)}
                      size="lg"
                      atmosphere={atmosphere}
                      compact
                    />
                  </div>
                </div>

                <PressEqBars
                  analyser={isActive ? analyser : null}
                  visible={isActive}
                  active={isPlaying}
                  accent={accent}
                />

                <ProgressBar
                  value={progressRatio}
                  accent={accent}
                  disabled={!isActive}
                  onChange={onSeek}
                />

                <div className="flex items-center justify-end gap-3 pr-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPlaying) {
                        onStop();
                      } else {
                        onPlay(track.id);
                      }
                    }}
                    className="flex h-[17px] w-[17px] shrink-0 items-center justify-center text-[10px] leading-none text-white transition hover:brightness-110"
                    style={{ backgroundColor: accent }}
                    aria-label={isPlaying ? labels.stop : labels.play}
                  >
                    {isPlaying ? "⏹" : "▶"}
                  </button>
                  <span className="shrink-0 text-2xl tabular-nums text-white/80 md:text-xl">
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
