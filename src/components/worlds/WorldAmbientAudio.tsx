"use client";

import { useEffect, useRef } from "react";

export function WorldAmbientAudio({ src }: { src?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src?.trim()) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.42;
    audioRef.current = audio;
    audio.play().catch(() => undefined);

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  return null;
}
