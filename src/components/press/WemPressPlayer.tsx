"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorldAtmosphere } from "@/types/content";
import { WemEqDisplay } from "@/components/press/WemEqDisplay";
import {
  WEM_COVER,
  WEM_ICONS,
  WEM_KNOB_TRACK,
  WEM_KNOB_VOLUME,
  WEM_PLAYER_HEIGHT,
  WEM_PLAYER_WIDTH,
  lerpCoord,
  pressPlayerAsset,
  PRESS_PLAYER_FALLBACK_COVER,
} from "@/lib/press-player-layout";

export interface WemPlayerTrack {
  id: string;
  title: string;
  artist?: string;
  coverImage?: string;
  userStars: number | null;
}

interface WemPressPlayerProps {
  world: WorldAtmosphere;
  accent: string;
  tracks: WemPlayerTrack[];
  activeTrack: WemPlayerTrack | null;
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
  onVote: (stars: number) => void;
}

function IconButton({
  src,
  x,
  y,
  label,
  onClick,
  visible = true,
  opacity = 1,
}: {
  src: string;
  x: number;
  y: number;
  label: string;
  onClick: () => void;
  visible?: boolean;
  opacity?: number;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 p-0 transition hover:brightness-125"
      style={{ left: x, top: y, opacity }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="block h-auto max-h-8 w-auto select-none" draggable={false} />
    </button>
  );
}

function KnobSlider({
  world,
  range,
  value,
  onChange,
  showLight,
}: {
  world: WorldAtmosphere;
  range: typeof WEM_KNOB_TRACK | typeof WEM_KNOB_VOLUME;
  value: number;
  onChange: (ratio: number) => void;
  showLight?: boolean;
}) {
  const dragging = useRef(false);
  const pos = lerpCoord(range.min, range.max, value);
  const lightWidth = showLight
    ? Math.max(0, pos.x - range.min.x + (WEM_KNOB_VOLUME.lightOffset?.x ?? 0) * -1)
    : 0;

  const updateFromClientX = useCallback(
    (clientX: number, rect: DOMRect) => {
      const scale = WEM_PLAYER_WIDTH / rect.width;
      const localX = (clientX - rect.left) * scale;
      const span = range.max.x - range.min.x;
      const ratio = span > 0 ? (localX - range.min.x) / span : 0;
      onChange(Math.min(1, Math.max(0, ratio)));
    },
    [onChange, range.max.x, range.min.x]
  );

  return (
    <div
      className="absolute z-20"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const root = e.currentTarget.closest("[data-wem-player-root]") as HTMLElement | null;
        if (!root) return;
        updateFromClientX(e.clientX, root.getBoundingClientRect());
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }}
    >
      {showLight && "lightOffset" in range ? (
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{
            left: range.lightOffset.x,
            top: range.lightOffset.y,
            width: lightWidth,
            height: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pressPlayerAsset(world, "wem_Player_sliderlight.png")}
            alt=""
            className="h-full w-full object-cover object-left"
            draggable={false}
          />
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pressPlayerAsset(world, "wem_knob.png")}
        alt=""
        className="relative z-10 block h-auto w-auto cursor-grab select-none active:cursor-grabbing"
        draggable={false}
      />
    </div>
  );
}

export function WemPressPlayer({
  world,
  accent,
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
  onVote,
}: WemPressPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? WEM_PLAYER_WIDTH;
      setScale(Math.min(1, width / WEM_PLAYER_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const progressRatio = duration > 0 ? progress / duration : 0;
  const userStars = activeTrack?.userStars ?? 0;

  return (
    <div ref={containerRef} className="w-full max-w-[1232px]">
      <div
        style={{
          width: WEM_PLAYER_WIDTH * scale,
          height: WEM_PLAYER_HEIGHT * scale,
        }}
      >
        <div
          data-wem-player-root
          className="relative select-none"
          style={{
            width: WEM_PLAYER_WIDTH,
            height: WEM_PLAYER_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Chassis — screws are baked into this PNG */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pressPlayerAsset(world, "wem_PlayerClean.png")}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full"
            width={WEM_PLAYER_WIDTH}
            height={WEM_PLAYER_HEIGHT}
            draggable={false}
          />

          {/* Side indicator lights */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pressPlayerAsset(world, "wem_Player_on_left.png")}
            alt=""
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: WEM_ICONS.onLeft.x,
              top: WEM_ICONS.onLeft.y,
              opacity: playing ? 1 : 0.35,
            }}
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pressPlayerAsset(world, "wem_Player_on_right.png")}
            alt=""
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: WEM_ICONS.onRight.x,
              top: WEM_ICONS.onRight.y,
              opacity: playing ? 1 : 0.35,
            }}
            draggable={false}
          />

          {/* Cover */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: WEM_COVER.x,
              top: WEM_COVER.y,
              width: WEM_COVER.width,
              height: WEM_COVER.height,
            }}
          >
            {activeTrack?.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeTrack.coverImage}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ backgroundColor: PRESS_PLAYER_FALLBACK_COVER }}
              />
            )}
          </div>

          {/* EQ display + track info */}
          {activeTrack ? (
            <WemEqDisplay
              analyser={analyser}
              active={playing}
              accent={accent}
              title={activeTrack.title}
              artist={activeTrack.artist}
            />
          ) : null}

          {/* Transport */}
          <IconButton
            src={pressPlayerAsset(world, "wem_Player_Icon_skip_rew.png")}
            x={WEM_ICONS.skipRew.x}
            y={WEM_ICONS.skipRew.y}
            label="Previous"
            onClick={onPrev}
            visible={tracks.length > 1}
          />
          <IconButton
            src={pressPlayerAsset(world, "wem_Player_Icon_Stop.png")}
            x={WEM_ICONS.stop.x}
            y={WEM_ICONS.stop.y}
            label="Stop"
            onClick={onStop}
          />
          <IconButton
            src={pressPlayerAsset(world, "wem_Player_Icon_play.png")}
            x={WEM_ICONS.play.x}
            y={WEM_ICONS.play.y}
            label="Play"
            onClick={onPlay}
            visible={!playing}
          />
          <IconButton
            src={pressPlayerAsset(world, "wem_Player_Icon_pause.png")}
            x={WEM_ICONS.pause.x}
            y={WEM_ICONS.pause.y}
            label="Pause"
            onClick={onPause}
            visible={playing}
          />
          <IconButton
            src={pressPlayerAsset(world, "wem_Player_Icon_skip_ffd.png")}
            x={WEM_ICONS.skipFwd.x}
            y={WEM_ICONS.skipFwd.y}
            label="Next"
            onClick={onNext}
            visible={tracks.length > 1}
          />

          {/* Stars */}
          {WEM_ICONS.stars.map((star, index) => {
            const starValue = index + 1;
            const lit = userStars >= starValue;
            return (
              <IconButton
                key={starValue}
                src={pressPlayerAsset(world, "wem_Player_Icon_star.png")}
                x={star.x}
                y={star.y}
                label={`${starValue} stars`}
                onClick={() => onVote(starValue)}
                opacity={lit ? 1 : 0.28}
              />
            );
          })}

          {/* Knobs */}
          <KnobSlider
            world={world}
            range={WEM_KNOB_TRACK}
            value={progressRatio}
            onChange={onSeek}
          />
          <KnobSlider
            world={world}
            range={WEM_KNOB_VOLUME}
            value={volume}
            onChange={onVolumeChange}
            showLight
          />

          {/* Invisible seek hit area for track slider */}
          <div
            className="absolute z-[15] cursor-pointer"
            style={{
              left: WEM_KNOB_TRACK.min.x - 20,
              top: WEM_KNOB_TRACK.min.y - 20,
              width: WEM_KNOB_TRACK.max.x - WEM_KNOB_TRACK.min.x + 40,
              height: 40,
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeek(Math.min(1, Math.max(0, ratio)));
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
