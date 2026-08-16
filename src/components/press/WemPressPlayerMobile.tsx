"use client";

import type { WemPlayerTrack } from "@/components/press/WemPressPlayer";
import { StarRating } from "@/components/press/StarRating";

export function WemPressPlayerMobile({
  tracks,
  activeTrack,
  playing,
  progress,
  duration,
  volume,
  accent,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onSelectTrack,
  onVote,
}: {
  tracks: WemPlayerTrack[];
  activeTrack: WemPlayerTrack | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  accent: string;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (ratio: number) => void;
  onVolumeChange: (ratio: number) => void;
  onSelectTrack: (id: string) => void;
  onVote: (stars: number) => void;
}) {
  const progressRatio = duration > 0 ? progress / duration : 0;

  return (
    <div className="space-y-4 rounded border border-white/15 bg-black/50 p-4">
      {activeTrack ? (
        <div className="flex gap-3">
          {activeTrack.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeTrack.coverImage}
              alt=""
              className="h-16 w-16 shrink-0 rounded object-cover"
              style={{ boxShadow: `0 0 20px ${accent}44` }}
            />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded bg-[#2a5590]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-light">{activeTrack.title}</p>
            {activeTrack.artist ? (
              <p className="truncate text-xs text-white/45">{activeTrack.artist}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={onPrev} className="text-white/60" disabled={tracks.length < 2}>
          ⏮
        </button>
        <button type="button" onClick={onStop} className="text-white/60">
          ⏹
        </button>
        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-lg"
          style={{ color: accent }}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button type="button" onClick={onNext} className="text-white/60" disabled={tracks.length < 2}>
          ⏭
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progressRatio}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: accent }}
      />

      <label className="flex items-center gap-2 text-xs text-white/45">
        Vol
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

      {activeTrack ? (
        <StarRating
          value={{ average: 0, voteCount: 0 }}
          userStars={activeTrack.userStars}
          onVote={onVote}
        />
      ) : null}

      <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-white/10 pt-3">
        {tracks.map((track) => (
          <li key={track.id}>
            <button
              type="button"
              onClick={() => onSelectTrack(track.id)}
              className={`w-full truncate rounded px-2 py-1.5 text-left text-xs ${
                track.id === activeTrack?.id ? "bg-white/10 text-white" : "text-white/55"
              }`}
            >
              {track.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
