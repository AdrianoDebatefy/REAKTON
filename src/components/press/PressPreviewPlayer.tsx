"use client";

import type { WorldAtmosphere } from "@/types/content";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { StarRating } from "@/components/press/StarRating";

export interface PressPlayerTrack {
  id: string;
  title: string;
  artist?: string;
  coverImage?: string;
  userStars: number | null;
  votes: { totalStars: number; voteCount: number; average: number };
}

/** Uniform 60% scale — design canvas is full size inside, clipped to visual footprint. */
const SLOT_SCALE = 0.6;
const SLOT_INNER_WIDTH = `${100 / SLOT_SCALE}%`;
const SLOT_VISUAL_HEIGHT_CLASS = "h-[7.5rem] md:h-[8.5rem]";

/** Square cover footprint; EQ uses same height, full column width. */
const COVER_SIZE_CLASS = "h-[7.5rem] w-[7.5rem] md:h-32 md:w-32";
const EQ_HEIGHT_CLASS = "h-[7.5rem] md:h-32";

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

function GlassTransportButton({
  isPlaying,
  label,
  onClick,
}: {
  isPlaying: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-10 min-w-[8rem] max-w-[12rem] flex-[1.15] overflow-hidden rounded-lg border border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.22)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-white/45 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(255,255,255,0.12),0_6px_18px_rgba(0,0,0,0.42)] md:h-9 md:min-w-[7rem]"
      aria-label={label}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_35%,rgba(255,255,255,0.34)_48%,rgba(255,255,255,0.08)_58%,transparent_72%)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-[1px] rounded-[7px] border border-white/10"
        aria-hidden
      />
      <span className="relative z-10 flex h-full items-center justify-center gap-2 px-4 text-sm uppercase tracking-[0.24em] text-white/90">
        <span className="text-xs leading-none">{isPlaying ? "⏹" : "▶"}</span>
        <span>{label}</span>
      </span>
    </button>
  );
}

function GlassEqOverlay() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 rounded-lg border border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.2)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-[3px]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-[1px] rounded-[7px] border border-white/10"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(125deg,transparent_35%,rgba(255,255,255,0.22)_48%,rgba(255,255,255,0.06)_58%,transparent_72%)]"
        aria-hidden
      />
    </>
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
  getVolume,
  analyser,
  playbackError,
  onPlay,
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
  getVolume: (trackId: string) => number;
  analyser: AnalyserNode | null;
  playbackError: string | null;
  onPlay: (trackId: string) => void;
  onStop: () => void;
  onSeek: (ratio: number) => void;
  onVolumeChange: (trackId: string, ratio: number) => void;
  onVote: (trackId: string, stars: number) => void;
  labels: { play: string; stop: string; volume: string };
}) {
  const activeProgressRatio = duration > 0 ? progress / duration : 0;

  return (
    <div className="w-full max-w-7xl">
      {playbackError ? (
        <p className="border border-red-400/25 bg-red-500/8 px-4 py-2 text-lg text-red-200">
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
          const slotVolume = getVolume(track.id);

          return (
            <li
              key={track.id}
              className={`${SLOT_VISUAL_HEIGHT_CLASS} w-[60%] max-w-[60%] overflow-hidden border bg-black/40 backdrop-blur-[2px] transition-colors`}
              style={{ borderColor: `${accent}66` }}
            >
              <div
                className="origin-top-left"
                style={{
                  transform: `scale(${SLOT_SCALE})`,
                  width: SLOT_INNER_WIDTH,
                }}
              >
                <div className="flex items-stretch">
                <div className="flex shrink-0 flex-col items-center gap-2 px-3 py-3">
                  <div
                    className={`${COVER_SIZE_CLASS} overflow-hidden`}
                    style={{ backgroundColor: track.coverImage ? undefined : accent }}
                  >
                    {track.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="text-[2.5rem] font-light leading-none tabular-nums text-white/60">
                    {slotLabel}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col py-3 pr-2">
                  <div className={`relative w-full overflow-hidden rounded-lg ${EQ_HEIGHT_CLASS}`}>
                    <PressEqWaves
                      atmosphere={atmosphere}
                      analyser={isActive ? analyser : null}
                      visible={isActive}
                      active={isPlaying}
                      className="block h-full w-full"
                    />
                    <GlassEqOverlay />
                  </div>

                  <div className="mt-1.5">
                    <ProgressBar
                      value={progressRatio}
                      accent={accent}
                      disabled={!isActive}
                      onChange={onSeek}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-4 pr-1">
                    <p className="min-w-0 flex-1 truncate text-left text-2xl font-light leading-tight text-white/90">
                      {track.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-3">
                      <StarRating
                        value={track.votes}
                        userStars={track.userStars}
                        onVote={(stars) => onVote(track.id, stars)}
                        size="lg"
                        atmosphere={atmosphere}
                        compact
                      />
                      <span className="text-xl tabular-nums text-white/75">
                        {timeCurrent} / {timeTotal}
                      </span>
                      <GlassTransportButton
                        isPlaying={isPlaying}
                        label={isPlaying ? labels.stop : labels.play}
                        onClick={() => {
                          if (isPlaying) {
                            onStop();
                          } else {
                            onPlay(track.id);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <SlotVolume
                  volume={slotVolume}
                  accent={accent}
                  label={labels.volume}
                  onChange={(value) => onVolumeChange(track.id, value)}
                />
              </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
