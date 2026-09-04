"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";

interface NfcTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
  order: number;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function NfcPlayPageClient() {
  const t = useTranslations("nfcAlbum");
  const isMobile = useIsMobile();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [pcCode, setPcCode] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [tracks, setTracks] = useState<NfcTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [autoplayDone, setAutoplayDone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const activeTrackIdRef = useRef(activeTrackId);

  tracksRef.current = tracks;
  activeTrackIdRef.current = activeTrackId;

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/nfc/session");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated: boolean;
      pcCode: string | null;
      remainingMs: number;
    };
    setAuthenticated(data.authenticated);
    setPcCode(data.pcCode);
    setRemainingMs(data.remainingMs ?? 0);
    return data;
  }, []);

  const loadTracks = useCallback(async () => {
    setTracksLoading(true);
    try {
      const res = await fetch("/api/nfc/tracks");
      if (!res.ok) throw new Error("tracks");
      const data = (await res.json()) as { tracks: NfcTrack[] };
      setTracks(data.tracks);
      setActiveTrackId(data.tracks[0]?.id ?? null);
    } catch {
      setTracks([]);
      setActiveTrackId(null);
    } finally {
      setTracksLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession().then((session) => {
      setSessionChecked(true);
      if (session?.authenticated) void loadTracks();
    });
  }, [loadTracks, refreshSession]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setInterval(() => {
      void refreshSession().then((session) => {
        if (!session?.authenticated) {
          setAuthenticated(false);
          setPlaying(false);
          if (audioRef.current) audioRef.current.pause();
        }
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [authenticated, refreshSession]);

  useEffect(() => {
    if (!authenticated || remainingMs <= 0) return;
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
  }, [authenticated, remainingMs]);

  const playTrackById = useCallback(
    async (trackId: string) => {
      const track = tracks.find((row) => row.id === trackId);
      if (!track?.audioUrl?.trim()) {
        setPlaybackError(t("playbackNoAudio"));
        return;
      }

      setPlaybackError(null);
      setActiveTrackId(trackId);

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
        setPlaybackError(t("playbackFailed"));
        setPlaying(false);
      }
    },
    [t, tracks]
  );

  const playNextInQueue = useCallback(() => {
    const list = tracksRef.current;
    const currentId = activeTrackIdRef.current;
    if (list.length === 0) return;
    const currentIndex = list.findIndex((track) => track.id === currentId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % list.length;
    void playTrackById(list[nextIndex]!.id);
  }, [playTrackById]);

  useEffect(() => {
    if (!authenticated || tracks.length === 0 || autoplayDone) return;
    setAutoplayDone(true);
    void playTrackById(tracks[0]!.id);
  }, [authenticated, autoplayDone, playTrackById, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => playNextInQueue();
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [playNextInQueue]);

  const togglePlay = useCallback(() => {
    if (!activeTrackId) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    void playTrackById(activeTrackId);
  }, [activeTrackId, playTrackById, playing]);

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const progressRatio = duration > 0 ? progress / duration : 0;

  if (!sessionChecked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-white/60">
        {t("loading")}
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-white/70">{t("desktopHint")}</p>
        <Link href="/" className="mt-6 inline-block text-sm uppercase tracking-widest text-white/50 hover:text-white">
          {t("backHome")}
        </Link>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-light tracking-wide text-white">{t("title")}</h1>
        <p className="mt-4 text-white/60">{t("sessionExpired")}</p>
        <p className="mt-2 text-sm text-white/45">{t("tapAgain")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-10 pt-[calc(5rem+env(safe-area-inset-top))]">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-red-300/80">{t("title")}</p>
        <h1 className="mt-2 text-2xl font-light tracking-wide text-white">{t("nowPlaying")}</h1>
      </header>

      {pcCode ? (
        <div className="mb-6 rounded border border-white/15 bg-black/35 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-white/45">{t("pcCodeLabel")}</p>
          <p className="mt-1 font-mono text-xl tracking-wide text-white">{pcCode}</p>
          <p className="mt-2 text-xs text-white/45">{t("pcCodeHint")}</p>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-widest text-white/45">
        <span>{t("sessionRemaining")}</span>
        <span className="font-mono text-white/75">{formatRemaining(remainingMs)}</span>
      </div>

      {playbackError ? (
        <p className="mb-4 border border-red-400/25 bg-red-500/8 px-3 py-2 text-sm text-red-200">
          {playbackError}
        </p>
      ) : null}

      {tracksLoading ? (
        <p className="text-white/50">{t("loadingTracks")}</p>
      ) : tracks.length === 0 ? (
        <p className="text-white/50">{t("noTracks")}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded border border-red-400/25 bg-black/40">
            <div className="aspect-square w-full bg-[#0a0d12]">
              {activeTrack?.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeTrack.coverImage}
                  alt={activeTrack.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm uppercase tracking-widest text-white/35">
                  REAKTON
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-lg text-white">{activeTrack?.title ?? "—"}</p>
                {activeTrack?.artist ? (
                  <p className="text-sm text-white/50">{activeTrack.artist}</p>
                ) : null}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-red-400/80 transition-[width] duration-150"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded border border-white/25 px-5 py-2 text-xs uppercase tracking-widest text-white/85"
                >
                  {playing ? t("pause") : t("play")}
                </button>
                <span className="font-mono text-xs text-white/45">
                  {Math.floor(progress)}s / {Math.floor(duration)}s
                </span>
              </div>
            </div>
          </div>

          <ol className="mt-6 space-y-2">
            {tracks.map((track, index) => {
              const isActive = track.id === activeTrackId;
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => void playTrackById(track.id)}
                    className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-red-400/40 bg-red-500/10 text-white"
                        : "border-white/10 bg-black/20 text-white/70 hover:border-white/25"
                    }`}
                  >
                    <span className="w-6 font-mono text-xs text-white/40">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate text-sm">{track.title}</span>
                    {isActive && playing ? (
                      <span className="text-[10px] uppercase tracking-widest text-red-300">▶</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
}
