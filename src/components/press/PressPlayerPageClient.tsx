"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { WorldAtmosphere } from "@/types/content";
import { WemPressPlayer } from "@/components/press/WemPressPlayer";
import {
  atmosphereFromPlayerSlug,
  isPlayerSlugReady,
} from "@/lib/press-player-layout";
import { PRESS_WORLD_THEME, pressWorldLabel } from "@/lib/press-preview-theme";

interface PreviewTrack {
  id: string;
  world: WorldAtmosphere;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
  order: number;
  votes: { totalStars: number; voteCount: number; average: number };
  userStars: number | null;
}

export function PressPlayerPageClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useTranslations("pressPreview");
  const atmosphere = atmosphereFromPlayerSlug(slug);
  const theme = atmosphere ? PRESS_WORLD_THEME[atmosphere] : null;

  const [authenticated, setAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [tracks, setTracks] = useState<PreviewTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyserReady, setAnalyserReady] = useState(false);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/press-preview/session");
    if (!res.ok) return;
    const data = (await res.json()) as { authenticated: boolean; email: string | null };
    setAuthenticated(data.authenticated);
    if (data.email) setEmail(data.email);
    return data;
  }, []);

  const loadTracks = useCallback(async (world: WorldAtmosphere) => {
    setTracksLoading(true);
    try {
      const res = await fetch(`/api/press-preview/tracks?world=${world}`);
      if (!res.ok) throw new Error("tracks");
      const data = (await res.json()) as { tracks: PreviewTrack[] };
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
    if (!atmosphere) return;
    void refreshSession().then((session) => {
      setSessionChecked(true);
      if (session?.authenticated) void loadTracks(atmosphere);
    });
  }, [atmosphere, loadTracks, refreshSession]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const ensureAudioGraph = useCallback(async () => {
    if (!audioRef.current || sourceRef.current) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    setAnalyserReady(true);
    if (ctx.state === "suspended") await ctx.resume();
  }, []);

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setProgress(0);
    setPlaying(false);
  }, []);

  const playTrackById = useCallback(
    async (trackId: string) => {
      const track = tracks.find((row) => row.id === trackId);
      if (!track) return;
      await ensureAudioGraph();
      const audio = audioRef.current;
      if (!audio) return;

      if (activeTrackId !== track.id) {
        audio.src = track.audioUrl;
        setActiveTrackId(track.id);
        setProgress(0);
      }

      await audio.play();
      setPlaying(true);
    },
    [activeTrackId, ensureAudioGraph, tracks]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atmosphere) return;
    setLoginBusy(true);
    setLoginError("");
    try {
      const res = await fetch("/api/press-preview/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, world: atmosphere }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (err.error === "expired") setLoginError(t("loginExpired"));
        else if (err.error === "not_configured") setLoginError(t("loginNotConfigured"));
        else setLoginError(t("loginFailed"));
        return;
      }
      setAuthenticated(true);
      setPassword("");
      await loadTracks(atmosphere);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleVote = async (trackId: string, stars: number, trackTitle: string) => {
    const res = await fetch("/api/press-preview/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId, stars, trackTitle }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { votes: PreviewTrack["votes"]; userStars: number };
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, votes: data.votes, userStars: data.userStars } : track
      )
    );
  };

  if (!atmosphere || !theme || !isPlayerSlugReady(slug)) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-16 pt-24 text-center">
        <p className="text-sm text-white/50">{t("playerWorldSoon")}</p>
        <Link href="/press" className="mt-6 inline-block text-xs uppercase tracking-widest text-white/70 underline">
          {t("backToPress")}
        </Link>
      </div>
    );
  }

  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const activeIndex = tracks.findIndex((track) => track.id === activeTrackId);
  const playerTracks = tracks.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverImage: track.coverImage,
    userStars: track.userStars,
  }));

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setProgress(audio.currentTime);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 md:text-[7px]">
            {t("playerLabel")}
          </p>
          <h1 className="mt-1 text-2xl font-light tracking-wide md:text-xl">
            {pressWorldLabel(atmosphere, locale)}
          </h1>
        </div>
        <Link
          href="/press"
          className="rounded border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white/60 transition hover:border-white/35 md:text-[7px]"
        >
          {t("backToPress")}
        </Link>
      </div>

      {!sessionChecked ? (
        <p className="mt-10 text-sm text-white/45">{t("loadingTracks")}</p>
      ) : !authenticated ? (
        <div
          className={`mx-auto mt-10 max-w-md rounded border border-white/15 bg-black/40 p-6 ${theme.glow}`}
          style={{ borderColor: `${theme.accent}55` }}
        >
          <p className="text-sm text-white/50">{t("loginHint")}</p>
          <form onSubmit={(e) => void handleLogin(e)} className="mt-6 space-y-4">
            <label className="block text-xs uppercase tracking-widest text-white/50">
              {t("email")}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs uppercase tracking-widest text-white/50">
              {t("password")}
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              />
            </label>
            {loginError ? <p className="text-sm text-red-300/90">{loginError}</p> : null}
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full rounded border border-white/25 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white disabled:opacity-50"
            >
              {loginBusy ? t("loginBusy") : t("loginSubmit")}
            </button>
          </form>
        </div>
      ) : tracksLoading ? (
        <p className="mt-10 text-sm text-white/45">{t("loadingTracks")}</p>
      ) : tracks.length === 0 ? (
        <p className="mt-10 text-sm text-white/45">{t("noTracks")}</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <WemPressPlayer
            assetFolder={slug}
            accent={theme.accent}
            tracks={playerTracks}
            activeTrack={activeTrack ? playerTracks.find((row) => row.id === activeTrack.id) ?? null : null}
            playing={playing}
            progress={progress}
            duration={duration}
            volume={volume}
            analyser={analyserReady ? analyserRef.current : null}
            onPlay={() => {
              if (activeTrack) void playTrackById(activeTrack.id);
            }}
            onPause={pausePlayback}
            onStop={stopPlayback}
            onPrev={() => {
              if (activeIndex > 0) void playTrackById(tracks[activeIndex - 1]!.id);
            }}
            onNext={() => {
              if (activeIndex < tracks.length - 1) void playTrackById(tracks[activeIndex + 1]!.id);
            }}
            onSeek={seekToRatio}
            onVolumeChange={setVolume}
            onVote={(stars) => {
              if (activeTrack) void handleVote(activeTrack.id, stars, activeTrack.title);
            }}
          />
        </div>
      )}

      <audio ref={audioRef} preload="metadata" className="hidden" />
    </div>
  );
}
