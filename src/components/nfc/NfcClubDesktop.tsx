"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface NfcTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
  order: number;
}

export function useNfcClubSession(enabled: boolean) {
  const [authenticated, setAuthenticated] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [tracks, setTracks] = useState<NfcTrack[]>([]);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const activeTrackIndexRef = useRef(activeTrackIndex);

  tracksRef.current = tracks;
  activeTrackIndexRef.current = activeTrackIndex;

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/nfc/session");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated: boolean;
      role: "mobile" | "desktop" | null;
      remainingMs: number;
    };
    const isDesktop = data.authenticated && data.role === "desktop";
    setAuthenticated(isDesktop);
    setRemainingMs(data.remainingMs ?? 0);
    if (!isDesktop) {
      setTracks([]);
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
    return data;
  }, []);

  const loadTracks = useCallback(async () => {
    const res = await fetch("/api/nfc/tracks");
    if (!res.ok) {
      setTracks([]);
      return;
    }
    const data = (await res.json()) as { tracks: NfcTrack[] };
    setTracks(data.tracks);
    setActiveTrackIndex(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refreshSession().then((session) => {
      if (session?.authenticated && session.role === "desktop") void loadTracks();
    });
  }, [enabled, loadTracks, refreshSession]);

  useEffect(() => {
    if (!enabled || !authenticated || remainingMs <= 0) return;
    const started = Date.now();
    const initial = remainingMs;
    const timer = window.setInterval(() => {
      const next = Math.max(0, initial - (Date.now() - started));
      setRemainingMs(next);
      if (next <= 0) {
        setAuthenticated(false);
        setPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [authenticated, enabled, remainingMs]);

  const playTrackAtIndex = useCallback(
    async (index: number) => {
      const list = tracksRef.current;
      const track = list[index];
      if (!track?.audioUrl?.trim()) {
        setPlaybackError("no_audio");
        return;
      }

      setPlaybackError(null);
      setActiveTrackIndex(index);

      const audio = audioRef.current;
      if (!audio) return;

      if (audio.src !== track.audioUrl) {
        audio.src = track.audioUrl;
        audio.load();
      }

      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaybackError("playback_failed");
        setPlaying(false);
      }
    },
    []
  );

  const playNext = useCallback(() => {
    const list = tracksRef.current;
    if (list.length === 0) return;
    const next = (activeTrackIndexRef.current + 1) % list.length;
    void playTrackAtIndex(next);
  }, [playTrackAtIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => playNext();
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [playNext]);

  const togglePlayAtIndex = useCallback(
    (index: number) => {
      if (index === activeTrackIndex && playing) {
        audioRef.current?.pause();
        return;
      }
      void playTrackAtIndex(index);
    },
    [activeTrackIndex, playTrackAtIndex, playing]
  );

  const pairCode = useCallback(
    async (code: string) => {
      const res = await fetch("/api/nfc/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return false;
      await refreshSession();
      await loadTracks();
      return true;
    },
    [loadTracks, refreshSession]
  );

  return {
    authenticated,
    remainingMs,
    tracks,
    activeTrackIndex,
    playing,
    playbackError,
    audioRef,
    pairCode,
    togglePlayAtIndex,
    refreshSession,
  };
}

export function NfcClubCodeEntry({
  onSubmit,
  busy,
  error,
  fadingOut = false,
  onFadeComplete,
}: {
  onSubmit: (code: string) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  fadingOut?: boolean;
  onFadeComplete?: () => void;
}) {
  const t = useTranslations("nfcAlbum");
  const [code, setCode] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || busy || fadingOut) return;
    await onSubmit(code.trim());
  };

  return (
    <motion.div
      data-player-ui
      className="pointer-events-auto fixed inset-x-0 top-[3.5rem] z-[55] px-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: fadingOut ? 0 : 1,
        y: fadingOut ? -12 : 0,
      }}
      transition={{ duration: fadingOut ? 0.45 : 0.3, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (fadingOut) onFadeComplete?.();
      }}
    >
      <div className="mx-auto w-full max-w-2xl rounded border border-red-400/30 bg-black/80 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-[0.35em] text-red-300/80">{t("clubCodeTitle")}</p>
        <p className="mt-1 text-xs text-white/50">{t("clubCodeHint")}</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("clubCodePlaceholder")}
            className="min-w-0 flex-1 border border-white/15 bg-black/50 px-3 py-2 font-mono text-sm text-white"
            autoComplete="off"
            spellCheck={false}
            disabled={fadingOut}
          />
          <button
            type="submit"
            disabled={busy || fadingOut || !code.trim()}
            className="shrink-0 rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/85 disabled:opacity-40"
          >
            {busy ? t("pairing") : t("pair")}
          </button>
        </form>
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      </div>
    </motion.div>
  );
}

export function NfcClubSessionBadge({ remainingMs }: { remainingMs: number }) {
  const t = useTranslations("nfcAlbum");
  const min = Math.floor(Math.max(0, remainingMs) / 60_000);
  const sec = Math.floor((Math.max(0, remainingMs) / 1000) % 60);
  const label = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  return (
    <div
      data-player-ui
      className="pointer-events-none absolute right-4 top-4 z-[60] rounded border border-red-400/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-widest text-red-200/90"
    >
      {t("clubSession")}: <span className="font-mono text-white">{label}</span>
    </div>
  );
}
