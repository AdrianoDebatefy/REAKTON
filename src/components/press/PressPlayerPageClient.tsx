"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { WorldAtmosphere } from "@/types/content";
import { PressPreviewPlayer } from "@/components/press/PressPreviewPlayer";
import { PressPreviewPlayerMobile } from "@/components/press/PressPreviewPlayerMobile";
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
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>({});
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const DEFAULT_VOLUME = 0.85;
  const getTrackVolume = useCallback(
    (trackId: string) => trackVolumes[trackId] ?? DEFAULT_VOLUME,
    [trackVolumes]
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const loadedAudioUrlRef = useRef<string | null>(null);
  const tracksRef = useRef(tracks);
  const activeTrackIdRef = useRef(activeTrackId);
  const [analyserReady, setAnalyserReady] = useState(false);

  tracksRef.current = tracks;
  activeTrackIdRef.current = activeTrackId;

  const waitUntilCanPlay = useCallback((audio: HTMLAudioElement) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("audio_load_failed"));
      };
      const cleanup = () => {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener("canplay", onReady);
      audio.addEventListener("error", onError);
    });
  }, []);

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
    if (!activeTrackId || !audioRef.current) return;
    audioRef.current.volume = getTrackVolume(activeTrackId);
  }, [activeTrackId, getTrackVolume]);

  const handleVolumeChange = useCallback(
    (trackId: string, value: number) => {
      setTrackVolumes((prev) => ({ ...prev, [trackId]: value }));
      if (trackId === activeTrackId && audioRef.current) {
        audioRef.current.volume = value;
      }
    },
    [activeTrackId]
  );

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!sourceRef.current) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.minDecibels = -92;
        analyser.maxDecibels = -8;
        analyser.smoothingTimeConstant = 0.5;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        setAnalyserReady(true);
      } catch {
        // Playback still works without the EQ visualizer.
      }
    }

    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  }, []);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setProgress(0);
    setPlaying(false);
  }, []);

  const selectTrack = useCallback(
    (trackId: string) => {
      if (trackId === activeTrackId) return;
      stopPlayback();
      setActiveTrackId(trackId);
    },
    [activeTrackId, stopPlayback]
  );

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

      try {
        if (loadedAudioUrlRef.current !== track.audioUrl) {
          audio.pause();
          audio.src = track.audioUrl;
          loadedAudioUrlRef.current = track.audioUrl;
          audio.load();
          setProgress(0);
          await waitUntilCanPlay(audio);
        }

        await ensureAudioGraph();
        audio.volume = getTrackVolume(trackId);
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaybackError(t("playbackFailed"));
        setPlaying(false);
      }
    },
    [ensureAudioGraph, getTrackVolume, t, tracks, waitUntilCanPlay]
  );

  const playNextTrackAfterEnd = useCallback(() => {
    const list = tracksRef.current;
    const currentId = activeTrackIdRef.current;
    if (!currentId) return;

    const currentIndex = list.findIndex((row) => row.id === currentId);
    for (let i = currentIndex + 1; i < list.length; i += 1) {
      const next = list[i];
      if (next.audioUrl?.trim()) {
        void playTrackById(next.id);
        return;
      }
    }
  }, [playTrackById]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onEnded = () => {
      setPlaying(false);
      playNextTrackAfterEnd();
    };
    const onError = () => {
      setPlaybackError(t("playbackFailed"));
      setPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [t, playNextTrackAfterEnd]);

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

  const handleVote = async (trackId: string, stars: number) => {
    const track = tracks.find((row) => row.id === trackId);
    if (!track) return;
    const res = await fetch("/api/press-preview/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId, stars, trackTitle: track.title }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { votes: PreviewTrack["votes"]; userStars: number };
    setTracks((prev) =>
      prev.map((row) =>
        row.id === trackId ? { ...row, votes: data.votes, userStars: data.userStars } : row
      )
    );
  };

  if (!atmosphere || !theme || !isPlayerSlugReady(slug)) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-16 pt-24 text-center">
        <p className="text-lg text-white/50">{t("playerWorldSoon")}</p>
        <Link href="/press" className="mt-6 inline-block text-base uppercase tracking-widest text-white/70 underline">
          {t("backToPress")}
        </Link>
      </div>
    );
  }

  const playerTracks = tracks.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverImage: track.coverImage,
    userStars: track.userStars,
    votes: track.votes,
  }));

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setProgress(audio.currentTime);
  };

  const playerLabels = { play: t("play"), stop: t("stop"), volume: t("volume") };
  const playerProps = {
    accent: theme.accent,
    atmosphere,
    tracks: playerTracks,
    activeTrackId,
    playing,
    progress,
    duration,
    getVolume: getTrackVolume,
    analyser: analyserReady ? analyserRef.current : null,
    playbackError,
    onPlay: (id: string) => void playTrackById(id),
    onStop: stopPlayback,
    onSeek: seekToRatio,
    onVolumeChange: handleVolumeChange,
    onVote: handleVote,
    labels: playerLabels,
  };

  return (
    <div className="mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base uppercase tracking-[0.35em] text-white/40">
            {t("playerLabel")}
          </p>
          <h1 className="mt-1 text-3xl font-light tracking-wide">
            {pressWorldLabel(atmosphere, locale)}
          </h1>
        </div>
        <Link
          href="/press"
          className="rounded border border-white/15 px-4 py-2 text-base uppercase tracking-widest text-white/60 transition hover:border-white/35"
        >
          {t("backToPress")}
        </Link>
      </div>

      {!sessionChecked ? (
        <p className="mt-10 text-lg text-white/45">{t("loadingTracks")}</p>
      ) : !authenticated ? (
        <div
          className={`mx-auto mt-10 max-w-md rounded-md border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md ${theme.glow}`}
          style={{ borderColor: `${theme.accent}44` }}
        >
          <p className="text-lg text-white/50">{t("loginHint")}</p>
          <form onSubmit={(e) => void handleLogin(e)} className="mt-6 space-y-4">
            <label className="block text-base uppercase tracking-widest text-white/50">
              {t("email")}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-lg text-white"
              />
            </label>
            <label className="block text-base uppercase tracking-widest text-white/50">
              {t("password")}
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-lg text-white"
              />
            </label>
            {loginError ? <p className="text-lg text-red-300/90">{loginError}</p> : null}
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full rounded border border-white/25 bg-white/10 px-4 py-3 text-base uppercase tracking-[0.3em] text-white disabled:opacity-50"
            >
              {loginBusy ? t("loginBusy") : t("loginSubmit")}
            </button>
          </form>
        </div>
      ) : tracksLoading ? (
        <p className="mt-10 text-lg text-white/45">{t("loadingTracks")}</p>
      ) : tracks.length === 0 ? (
        <p className="mt-10 text-lg text-white/45">{t("noTracks")}</p>
      ) : (
        <div className="mt-10">
          <PressPreviewPlayerMobile {...playerProps} onSelectTrack={selectTrack} />
          <PressPreviewPlayer {...playerProps} />
        </div>
      )}

      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
}
