"use client";

import type { WorldAtmosphere } from "@/types/content";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { PressSlotCover } from "@/components/press/PressSlotCover";
import { StarRating } from "@/components/press/StarRating";
import {
  formatTimeExtended,
  GlassEqOverlay,
  GlassTransportButton,
  ProgressBar,
} from "@/components/press/press-player-controls";

export interface PressPlayerTrack {
  id: string;
  title: string;
  artist?: string;
  coverImage?: string;
  userStars: number | null;
  votes: { totalStars: number; voteCount: number; average: number };
}

/** 80% of prior slot size (was 60% canvas → now 48%, native layout, sharp EQ). */
const SLOT_WIDTH_CLASS = "w-[48%] max-w-[48%]";
const COVER_SIZE_CLASS = "h-[3.6rem] w-[3.6rem] md:h-[3.84rem] md:w-[3.84rem]";
const EQ_HEIGHT_CLASS = "h-[3.6rem] md:h-[3.84rem]";

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
      className="flex w-4 shrink-0 self-stretch items-stretch border-l px-1 py-1.5"
      style={{ borderColor: `${accent}99` }}
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/20" />
        <div
          className="pointer-events-none absolute left-1/2 h-0.5 w-4 -translate-x-1/2"
          style={{
            bottom: `calc(${volume * 100}% - 1px)`,
            backgroundColor: accent,
            boxShadow: `0 0 4px ${accent}88`,
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
    <div className="hidden w-full max-w-7xl md:block">
      {playbackError ? (
        <p className="border border-red-400/25 bg-red-500/8 px-4 py-2 text-lg text-red-200">
          {playbackError}
        </p>
      ) : null}

      <ul className="flex flex-col items-center space-y-[10px]">
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
              className={`${SLOT_WIDTH_CLASS} mx-auto overflow-hidden border bg-black/40 transition-colors`}
              style={{ borderColor: `${accent}66` }}
            >
              <div className="flex items-stretch">
                <div className="flex shrink-0 flex-col items-center gap-1 px-2 py-2">
                  <PressSlotCover
                    trackId={track.id}
                    coverImage={track.coverImage}
                    accent={accent}
                    title={track.title}
                    className={`${COVER_SIZE_CLASS} overflow-hidden`}
                  />
                  <span className="text-[1.2rem] font-light leading-none tabular-nums text-white/60">
                    {slotLabel}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col py-2 pr-1.5">
                  <div className={`relative w-full overflow-hidden rounded-md ${EQ_HEIGHT_CLASS}`}>
                    <PressEqWaves
                      atmosphere={atmosphere}
                      analyser={isActive ? analyser : null}
                      visible={isActive}
                      active={isPlaying}
                      className="block h-full w-full"
                    />
                    <GlassEqOverlay />
                  </div>

                  <div className="mt-1">
                    <ProgressBar
                      value={progressRatio}
                      accent={accent}
                      disabled={!isActive}
                      onChange={onSeek}
                    />
                  </div>

                  <div className="mt-1 flex items-center gap-2 pr-0.5">
                    <p className="min-w-0 flex-1 truncate text-left text-[0.675rem] font-light leading-tight text-white/90 md:text-[0.75rem]">
                      {track.title}
                    </p>
                    <div className="flex shrink-0 basis-[4.25rem] items-center justify-center">
                      <StarRating
                        value={track.votes}
                        userStars={track.userStars}
                        onVote={(stars) => onVote(track.id, stars)}
                        size="sm"
                        atmosphere={atmosphere}
                        compact
                      />
                    </div>
                    <span
                      className="shrink-0 w-[23ch] text-right font-mono tabular-nums text-[0.525rem] leading-none text-white/75 md:text-[0.6rem]"
                    >
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

                <SlotVolume
                  volume={slotVolume}
                  accent={accent}
                  label={labels.volume}
                  onChange={(value) => onVolumeChange(track.id, value)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
