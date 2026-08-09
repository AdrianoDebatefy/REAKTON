"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Locale, Song } from "@/types/content";
import { getLocalized } from "@/lib/locale";
import {
  MOBILE_COVER_ACTIVE_CENTER,
  MOBILE_COVER_FADE_S,
  MOBILE_COVER_INACTIVE_PX,
  buildMobilePadLayout,
} from "@/lib/mobile-cover-layout";

function getYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&/]+)/,
    /[?&]v=([^?&/]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

const MOVE_TRANSITION = { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const };
const FADE_TRANSITION = { duration: MOBILE_COVER_FADE_S, ease: [0.4, 0, 0.2, 1] as const };

const INFO_TEXT_SIZE_KEY = "reakton-info-text-size";
const INFO_TEXT_SIZE_MIN = 12;
const INFO_TEXT_SIZE_MAX = 22;
const INFO_TEXT_SIZE_STEP = 2;
const INFO_TEXT_SIZE_DEFAULT = 14;

function readStoredInfoTextSize(): number {
  try {
    const saved = localStorage.getItem(INFO_TEXT_SIZE_KEY);
    if (saved) {
      const size = Number(saved);
      if (size >= INFO_TEXT_SIZE_MIN && size <= INFO_TEXT_SIZE_MAX) return size;
    }
  } catch {
    /* ignore */
  }
  return INFO_TEXT_SIZE_DEFAULT;
}

function useActiveCoverSize() {
  const [size, setSize] = useState(240);
  useEffect(() => {
    const update = () => setSize(Math.min(260, Math.round(window.innerWidth * 0.72)));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export function MobileAlbumSlotScene({
  songs,
  maxSlots = 12,
  borderClass = "border-white/30",
  exiting = false,
  onExitComplete,
  locale = "de",
}: {
  songs: Song[];
  maxSlots?: number;
  borderClass?: string;
  exiting?: boolean;
  onExitComplete?: () => void;
  locale?: Locale;
}) {
  const t = useTranslations("world");
  const items = songs.slice(0, maxSlots);
  const padPositions = useMemo(() => buildMobilePadLayout(items.length), [items.length]);
  const activeCoverSize = useActiveCoverSize();
  const sceneRef = useRef<HTMLDivElement>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoTextSize, setInfoTextSize] = useState(INFO_TEXT_SIZE_DEFAULT);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slotVideoRef = useRef<HTMLVideoElement | null>(null);
  const exitStartedRef = useRef(false);

  const activeSong = items.find((s) => s.id === activeId) ?? null;
  const activeInfoText = activeSong ? getLocalized(activeSong.infoText, locale) : "";
  const isPoleMode = activeId !== null;

  useEffect(() => {
    setInfoTextSize(readStoredInfoTextSize());
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const startAudio = useCallback(
    (song: Song) => {
      if (!song.audioSnippet) return;
      const audio = new Audio(song.audioSnippet);
      audio.loop = true;
      audio.volume = volume;
      audioRef.current = audio;
      audio.play().catch(() => undefined);
    },
    [volume]
  );

  const handleSelect = useCallback(
    (song: Song) => {
      if (exiting || isPoleMode) return;
      stopAudio();
      setActiveId(song.id);
      setInfoPanelOpen(false);
      startAudio(song);
    },
    [exiting, isPoleMode, startAudio, stopAudio]
  );

  const handleBackToGrid = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      stopAudio();
      slotVideoRef.current?.pause();
      setActiveId(null);
      setInfoPanelOpen(false);
    },
    [stopAudio]
  );

  const adjustInfoTextSize = useCallback((delta: number) => {
    setInfoTextSize((prev) => {
      const next = Math.min(INFO_TEXT_SIZE_MAX, Math.max(INFO_TEXT_SIZE_MIN, prev + delta));
      try {
        localStorage.setItem(INFO_TEXT_SIZE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!exiting) {
      exitStartedRef.current = false;
      return;
    }
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    stopAudio();
    const timer = window.setTimeout(() => onExitComplete?.(), 420);
    return () => window.clearTimeout(timer);
  }, [exiting, onExitComplete, stopAudio]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  return (
    <motion.div
      ref={sceneRef}
      className="album-slot-scene relative mx-auto h-[calc(100dvh-11.5rem-env(safe-area-inset-top))] min-h-[320px] w-full max-w-lg overflow-hidden"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      {items.map((song, i) => {
        const pad = padPositions[i] ?? MOBILE_COVER_ACTIVE_CENTER;
        const isActive = activeId === song.id;
        const targetSize = isActive ? activeCoverSize : MOBILE_COVER_INACTIVE_PX;
        const targetX = isActive ? MOBILE_COVER_ACTIVE_CENTER.x : pad.x;
        const targetY = isActive ? MOBILE_COVER_ACTIVE_CENTER.y : pad.y;
        const hidden = isPoleMode && !isActive;

        return (
          <motion.button
            key={song.id}
            type="button"
            disabled={exiting || (isPoleMode && !isActive)}
            onClick={() => handleSelect(song)}
            className={`album-cover-slot absolute overflow-hidden rounded-sm border focus:outline-none ${borderClass} ${
              isActive ? "z-40 border-white/40 shadow-lg" : "z-10 shadow-md shadow-black/50"
            }`}
            style={{
              backgroundColor:
                song.coverImage && !song.coverImage.includes("placeholder")
                  ? "#080c12"
                  : "#C1E5F9",
            }}
            initial={false}
            animate={{
              left: `${targetX}%`,
              top: `${targetY}%`,
              width: targetSize,
              height: targetSize,
              x: "-50%",
              y: "-50%",
              opacity: hidden ? 0 : 1,
              scale: hidden ? 0.85 : 1,
            }}
            transition={{
              left: MOVE_TRANSITION,
              top: MOVE_TRANSITION,
              width: MOVE_TRANSITION,
              height: MOVE_TRANSITION,
              opacity: FADE_TRANSITION,
              scale: FADE_TRANSITION,
            }}
            aria-label={song.title}
            aria-pressed={isActive}
          >
            {isActive && !exiting && !infoPanelOpen && (
              <button
                type="button"
                onClick={handleBackToGrid}
                className="absolute left-1.5 top-1.5 z-50 flex h-11 min-w-[3rem] items-center justify-center rounded-sm bg-black/50 px-2 text-[11px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm"
                aria-label={t("backToGrid")}
              >
                {t("backToGrid")}
              </button>
            )}

            <div className="relative h-full w-full">
              {isActive && activeSong?.videoSnippet ? (
                <video
                  ref={slotVideoRef}
                  src={activeSong.videoSnippet}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  playsInline
                  muted={!!activeSong.audioSnippet}
                />
              ) : (
                <Image
                  src={song.coverImage || "/covers/placeholder.svg"}
                  alt={song.title}
                  fill
                  className="object-cover"
                  sizes={isActive ? "280px" : "40px"}
                  priority={isActive}
                  draggable={false}
                />
              )}

              {!isActive && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-0.5 py-0.5 text-[8px] uppercase tracking-wider text-white/85">
                  {song.title}
                </span>
              )}

              {isActive && activeSong && !exiting && (
                <>
                  {!infoPanelOpen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoPanelOpen(true);
                      }}
                      className="cover-info-btn absolute right-2 top-2 z-50"
                      aria-label={t("songInfo")}
                    >
                      <span className="cover-info-btn__glyph">i</span>
                    </button>
                  )}

                  <AnimatePresence>
                    {infoPanelOpen && (
                      <motion.div
                        key="info"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                        className="cover-info-panel absolute inset-0 z-[45] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="cover-info-panel__toolbar flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustInfoTextSize(-INFO_TEXT_SIZE_STEP)}
                              disabled={infoTextSize <= INFO_TEXT_SIZE_MIN}
                              className="cover-info-size-btn"
                              aria-label={t("textSizeDecrease")}
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustInfoTextSize(INFO_TEXT_SIZE_STEP)}
                              disabled={infoTextSize >= INFO_TEXT_SIZE_MAX}
                              className="cover-info-size-btn"
                              aria-label={t("textSizeIncrease")}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInfoPanelOpen(false)}
                            className="cover-info-panel__close px-2 py-1 text-[11px] uppercase tracking-[0.25em] text-black/55"
                          >
                            {t("closeInfo")}
                          </button>
                        </div>
                        <div
                          className="cover-info-panel__body flex-1 overflow-y-auto px-5 pb-5 pt-1 leading-relaxed text-black/88"
                          style={{ fontSize: `${infoTextSize}px` }}
                        >
                          {activeInfoText ? (
                            <p className="whitespace-pre-wrap">{activeInfoText}</p>
                          ) : (
                            <p className="text-black/45">{t("noSongInfo")}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    className="absolute inset-x-0 bottom-0 z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                  >
                    <div className="motif-bottom-bar bg-black/28 px-3 py-2 backdrop-blur-sm">
                      {activeSong.audioSnippet && (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={volume}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const next = parseFloat(e.target.value);
                            setVolume(next);
                            if (audioRef.current) audioRef.current.volume = next;
                          }}
                          className="mb-2 w-full"
                          aria-label={t("nowPlaying")}
                        />
                      )}
                      {activeSong.videoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopAudio();
                            setYoutubeUrl(activeSong.videoUrl!.trim());
                          }}
                          className="block w-full text-center text-[11px] uppercase tracking-[0.3em] text-white/85 underline"
                        >
                          {t("watchVideo")}
                        </button>
                      )}
                      <p className="mt-1 text-center text-sm lowercase tracking-[0.15em] text-white">
                        {activeSong.title}
                      </p>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </motion.button>
        );
      })}

      <AnimatePresence>
        {youtubeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 pt-24"
            role="dialog"
            aria-modal
          >
            <button
              type="button"
              onClick={() => setYoutubeUrl(null)}
              className="absolute right-4 top-28 text-sm uppercase tracking-widest text-white/70"
            >
              {t("closeVideo")}
            </button>
            <div className="aspect-video w-full max-w-lg">
              {getYouTubeId(youtubeUrl) ? (
                <iframe
                  title="Video"
                  src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(youtubeUrl)}?autoplay=1&rel=0`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <p className="text-center text-white/60">Ungültiger YouTube-Link</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
