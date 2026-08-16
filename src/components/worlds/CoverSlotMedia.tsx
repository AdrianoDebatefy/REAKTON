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

function isUploadPath(url: string): boolean {
  return url.startsWith("/uploads/");
}

function CoverImage({
  src,
  alt,
  sizes,
  priority,
  onError,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  onError?: () => void;
}) {
  if (isUploadPath(src)) {
    return (
      // Admin uploads: plain img avoids Next image pipeline quirks on the VPS.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes={sizes}
      priority={priority}
      draggable={false}
      onError={onError}
    />
  );
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
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const resolvedCover = imageFailed ? "/covers/placeholder.svg" : cover;
  const showVideo = isActive && Boolean(song.videoSnippet) && !videoFailed;

  useEffect(() => {
    setImageFailed(false);
    setVideoFailed(false);
    setVideoVisible(false);
  }, [song.id, song.coverImage, song.videoSnippet]);

  return (
    <div className="relative h-full w-full bg-[#C1E5F9]">
      <CoverImage
        src={resolvedCover}
        alt={song.title}
        sizes={sizes}
        priority={priority}
        onError={() => setImageFailed(true)}
      />
      {showVideo && (
        <video
          ref={videoRef}
          src={song.videoSnippet}
          poster={resolvedCover}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoVisible ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          loop
          playsInline
          muted={!!song.audioSnippet}
          onPlaying={() => setVideoVisible(true)}
          onError={() => {
            setVideoFailed(true);
            setVideoVisible(false);
          }}
        />
      )}
    </div>
  );
}
