"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorldAtmosphere } from "@/types/content";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { StarRating } from "@/components/press/StarRating";
import type { PressPlayerTrack } from "@/components/press/PressPreviewPlayer";
import {
  formatTimeExtended,
  GlassEqOverlay,
  GlassTransportButton,
  HorizontalVolume,
  ProgressBar,
} from "@/components/press/press-player-controls";

export function PressPreviewPlayerMobile({
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
  onSelectTrack,
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
  onSelectTrack: (trackId: string) => void;
  labels: { play: string; stop: string; volume: string };
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const activeProgressRatio = duration > 0 ? progress / duration : 0;

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(tracks.length - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setSlideIndex(clamped);
    const track = tracks[clamped];
    if (track) onSelectTrack(track.id);
  }, [onSelectTrack, tracks]);

  useEffect(() => {
    const idx = tracks.findIndex((t) => t.id === activeTrackId);
    if (idx < 0) return;
    setSlideIndex(idx);
    const el = scrollRef.current;
    if (!el) return;
    const targetLeft = idx * el.clientWidth;
    if (Math.abs(el.scrollLeft - targetLeft) > 4) {
      el.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  }, [activeTrackId, tracks]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index === slideIndex) return;
    setSlideIndex(index);
    const track = tracks[index];
    if (track) onSelectTrack(track.id);
  }, [onSelectTrack, slideIndex, tracks]);

  return (
    <div className="w-full md:hidden">
      {playbackError ? (
        <p className="mb-3 border border-red-400/25 bg-red-500/8 px-3 py-2 text-sm text-red-200">
          {playbackError}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Track-Karussell"
      >
        {tracks.map((track, index) => {
          const isActive = track.id === activeTrackId;
          const isPlaying = isActive && playing;
          const slotLabel = String(index + 1).padStart(2, "0");
          const progressRatio = isActive ? activeProgressRatio : 0;
          const timeCurrent = isActive ? formatTimeExtended(progress) : "00:00:00:00";
          const timeTotal = isActive ? formatTimeExtended(duration) : "00:00:00:00";
          const slotVolume = getVolume(track.id);

          return (
            <article
              key={track.id}
              className="w-full shrink-0 snap-center px-1"
              style={{ borderColor: `${accent}66` }}
            >
              <div className="overflow-hidden border bg-black/40" style={{ borderColor: `${accent}66` }}>
                <div className="grid grid-cols-2 gap-[0.525rem] p-[0.525rem]">
                  <div className="min-w-0">
                    <div
                      className="aspect-square w-full overflow-hidden"
                      style={{ backgroundColor: track.coverImage ? undefined : accent }}
                    >
                      {track.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.coverImage} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mt-[0.35rem] text-center text-[1.05rem] font-light tabular-nums text-white/60">
                      {slotLabel}
                    </p>
                  </div>

                  <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                    <PressEqWaves
                      atmosphere={atmosphere}
                      analyser={isActive ? analyser : null}
                      visible={isActive}
                      active={isPlaying}
                      className="block h-full w-full"
                    />
                    <GlassEqOverlay rounded="lg" />
                  </div>
                </div>

                <div className="space-y-[0.525rem] px-[0.525rem] pb-[0.7rem]">
                  <p className="truncate text-left text-[0.7rem] font-light text-white/90">{track.title}</p>

                  <ProgressBar
                    value={progressRatio}
                    accent={accent}
                    disabled={!isActive}
                    onChange={onSeek}
                    touchCompact
                  />

                  <div className="flex items-center justify-between gap-[0.525rem]">
                    <StarRating
                      value={track.votes}
                      userStars={track.userStars}
                      onVote={(stars) => onVote(track.id, stars)}
                      size="touch-sm"
                      atmosphere={atmosphere}
                      compact
                    />
                    <span className="shrink-0 font-mono text-[0.525rem] tabular-nums text-white/75">
                      {timeCurrent} / {timeTotal}
                    </span>
                  </div>

                  <HorizontalVolume
                    volume={slotVolume}
                    accent={accent}
                    label={labels.volume}
                    onChange={(value) => onVolumeChange(track.id, value)}
                    compact
                  />

                  <div className="flex justify-end pt-0.5">
                    <GlassTransportButton
                      largeCompact
                      isPlaying={isPlaying}
                      label={isPlaying ? labels.stop : labels.play}
                      onClick={() => {
                        if (isPlaying) onStop();
                        else onPlay(track.id);
                      }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {tracks.length > 1 ? (
        <div className="mt-[0.7rem] flex items-center justify-center gap-[1.05rem]">
          <button
            type="button"
            onClick={() => scrollToIndex(slideIndex - 1)}
            disabled={slideIndex <= 0}
            className="flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-full border border-white/25 text-[0.875rem] text-white/80 disabled:opacity-30 touch-manipulation"
            aria-label="Vorheriger Track"
          >
            ‹
          </button>
          <span className="min-w-[2.8rem] text-center text-[0.7rem] tabular-nums text-white/55">
            {slideIndex + 1} / {tracks.length}
          </span>
          <button
            type="button"
            onClick={() => scrollToIndex(slideIndex + 1)}
            disabled={slideIndex >= tracks.length - 1}
            className="flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-full border border-white/25 text-[0.875rem] text-white/80 disabled:opacity-30 touch-manipulation"
            aria-label="Nächster Track"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
