"use client";

import { useEffect, useState, type RefObject } from "react";
import Image from "next/image";
import type { Song } from "@/types/content";

interface CoverSlotMediaProps {
  song: Song;
  isActive: boolean;
  sizes: string;
  priority?: boolean;
  videoRef?: RefObject<HTMLVideoElement>;
}

/** Cover image for every slot; optional MP4 overlays when active (poster + fallback). */
export function CoverSlotMedia({
  song,
  isActive,
  sizes,
  priority,
  videoRef,
}: CoverSlotMediaProps) {
  const cover = song.coverImage || "/covers/placeholder.svg";
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = isActive && Boolean(song.videoSnippet) && !videoFailed;

  useEffect(() => {
    setVideoFailed(false);
  }, [song.id, song.videoSnippet]);

  return (
    <div className="relative h-full w-full">
      <Image
        src={cover}
        alt={song.title}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
        draggable={false}
      />
      {showVideo && (
        <video
          ref={videoRef}
          src={song.videoSnippet}
          poster={cover}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          playsInline
          muted={!!song.audioSnippet}
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}
