"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Song } from "@/types/content";

interface SongCloudProps {
  songs: Song[];
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|v=)([^&]+)/);
  return match ? match[1] : null;
}

function PlaceholderCover({ title }: { title: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-white/5 text-center text-xs uppercase tracking-wider text-white/50"
      aria-hidden
    >
      {title}
    </div>
  );
}

export function SongCloud({ songs }: SongCloudProps) {
  const t = useTranslations("world");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const handleSelect = (song: Song) => {
    if (activeId === song.id) return;
    stopAudio();
    setActiveId(song.id);
    if (song.audioSnippet) {
      const audio = new Audio(song.audioSnippet);
      audioRef.current = audio;
      audio.play().catch(() => undefined);
    }
  };

  return (
    <>
      {/* Desktop: floating cloud */}
      <div className="relative hidden min-h-[50vh] flex-1 md:block">
        {songs.map((song, i) => {
          const isActive = activeId === song.id;
          const top = 15 + (i * 17) % 55;
          const left = 10 + (i * 23) % 65;
          return (
            <motion.button
              key={song.id}
              type="button"
              layout
              onClick={() => handleSelect(song)}
              className={`song-drift absolute overflow-hidden rounded-sm border border-white/10 shadow-2xl transition-shadow focus:outline-none focus:ring-2 focus:ring-white/30 ${
                isActive ? "z-20 ring-1 ring-white/40" : "z-10 hover:border-white/25"
              }`}
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: isActive ? 200 : 120,
                height: isActive ? 200 : 120,
              }}
              animate={{ scale: isActive ? 1.05 : 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              aria-label={song.title}
            >
              {song.coverImage ? (
                <Image src={song.coverImage} alt={song.title} fill className="object-cover" sizes="200px" />
              ) : (
                <PlaceholderCover title={song.title} />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wider">
                  {song.title}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Mobile: grid */}
      <div className="grid grid-cols-2 gap-3 p-4 md:hidden">
        {songs.map((song) => {
          const isActive = activeId === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => handleSelect(song)}
              className={`relative aspect-square overflow-hidden rounded border border-white/10 ${
                isActive ? "ring-2 ring-white/40" : ""
              }`}
            >
              {song.coverImage ? (
                <Image src={song.coverImage} alt={song.title} fill className="object-cover" sizes="50vw" />
              ) : (
                <PlaceholderCover title={song.title} />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-center gap-3 px-4 pb-8 md:pb-12"
          >
            {songs
              .find((s) => s.id === activeId)
              ?.videoUrl && (
              <button
                type="button"
                onClick={() => setVideoUrl(songs.find((s) => s.id === activeId)!.videoUrl!)}
                className="rounded border border-white/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-white/10"
              >
                {t("watchVideo")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal
          >
            <button
              type="button"
              onClick={() => setVideoUrl(null)}
              className="absolute right-4 top-20 text-xs uppercase tracking-widest text-white/70"
            >
              {t("closeVideo")}
            </button>
            <div className="aspect-video w-full max-w-4xl">
              <iframe
                title="Video"
                src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(videoUrl)}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}