"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { WorldAtmosphere } from "@/types/content";
import { WemPressPlayer } from "@/components/press/WemPressPlayer";
import { WemPressPlayerMobile } from "@/components/press/WemPressPlayerMobile";
import {
  PRESS_WORLD_ORDER,
  PRESS_WORLD_THEME,
  pressWorldLabel,
} from "@/lib/press-preview-theme";
import { isPressPlayerAssetsReady } from "@/lib/press-player-layout";

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

type ViewState = "buttons" | "login" | "player";

export function PressPreviewSection() {
  const locale = useLocale();
  const t = useTranslations("pressPreview");
  const [view, setView] = useState<ViewState>("buttons");
  const [selectedWorld, setSelectedWorld] = useState<WorldAtmosphere | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
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

  const theme = selectedWorld ? PRESS_WORLD_THEME[selectedWorld] : null;

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/press-preview/session");
    if (!res.ok) return;
    const data = (await res.json()) as {
      authenticated: boolean;
      email: string | null;
      passwordConfigured: boolean;
      passwordExpired: boolean;
    };
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
    void refreshSession();
  }, [refreshSession]);

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
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
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

  const handleWorldClick = async (world: WorldAtmosphere) => {
    setSelectedWorld(world);
    setLoginError("");
    const session = await refreshSession();
    if (session?.authenticated) {
      setView("player");
      await loadTracks(world);
      return;
    }
    setView("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorld) return;
    setLoginBusy(true);
    setLoginError("");
    try {
      const res = await fetch("/api/press-preview/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, world: selectedWorld }),
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
      setView("player");
      await loadTracks(selectedWorld);
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
    const data = (await res.json()) as {
      votes: PreviewTrack["votes"];
      userStars: number;
    };
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, votes: data.votes, userStars: data.userStars } : track
      )
    );
  };

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
    <section className="mb-14 border-b border-white/10 pb-12">
      <h2 className="text-sm uppercase tracking-[0.35em] text-white/45">{t("sectionTitle")}</h2>
      <p className="mt-2 text-sm text-white/50">{t("sectionSubtitle")}</p>

      {view === "buttons" && (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {PRESS_WORLD_ORDER.map((world) => {
            const worldTheme = PRESS_WORLD_THEME[world];
            const playerReady = isPressPlayerAssetsReady(world);
            return (
              <button
                key={world}
                type="button"
                disabled={!playerReady}
                onClick={() => void handleWorldClick(world)}
                className={`w-full border px-4 py-5 text-center text-xs uppercase tracking-[0.25em] text-white transition md:text-[8px] ${worldTheme.button} ${worldTheme.glow} ${
                  playerReady ? "" : "cursor-not-allowed opacity-40"
                }`}
              >
                {pressWorldLabel(world, locale)}
                {!playerReady ? (
                  <span className="mt-1 block text-[9px] normal-case tracking-normal text-white/50 md:text-[7px]">
                    {t("playerWorldSoon")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {view === "login" && selectedWorld && theme && (
        <div
          className={`mt-6 rounded border border-white/15 bg-black/40 p-6 backdrop-blur-sm ${theme.glow}`}
          style={{ borderColor: `${theme.accent}55` }}
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-light tracking-wide md:text-sm">
              {pressWorldLabel(selectedWorld, locale)}
            </h3>
            <button
              type="button"
              onClick={() => {
                setView("buttons");
                setSelectedWorld(null);
                setLoginError("");
              }}
              className="text-xs uppercase tracking-widest text-white/45 hover:text-white/70"
            >
              {t("back")}
            </button>
          </div>
          <p className="mt-2 text-sm text-white/50">{t("loginHint")}</p>
          <form onSubmit={(e) => void handleLogin(e)} className="mt-6 space-y-4">
            <label className="block text-xs uppercase tracking-widest text-white/50">
              {t("email")}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                placeholder="press@example.com"
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
              className="w-full rounded border border-white/25 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {loginBusy ? t("loginBusy") : t("loginSubmit")}
            </button>
          </form>
        </div>
      )}

      {view === "player" && selectedWorld && theme && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 md:text-[7px]">
                {t("playerLabel")}
              </p>
              <h3 className="mt-1 text-xl font-light tracking-wide md:text-sm">
                {pressWorldLabel(selectedWorld, locale)}
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  stopPlayback();
                  setView("buttons");
                  setSelectedWorld(null);
                }}
                className="rounded border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/55 hover:border-white/35 md:text-[7px]"
              >
                {t("back")}
              </button>
              {authenticated ? (
                <button
                  type="button"
                  onClick={async () => {
                    stopPlayback();
                    await fetch("/api/press-preview/session", { method: "DELETE" });
                    setAuthenticated(false);
                    setView("buttons");
                    setSelectedWorld(null);
                    setTracks([]);
                  }}
                  className="rounded border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/55 hover:border-white/35 md:text-[7px]"
                >
                  {t("logout")}
                </button>
              ) : null}
            </div>
          </div>

          {tracksLoading ? (
            <p className="text-sm text-white/45">{t("loadingTracks")}</p>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-white/45">{t("noTracks")}</p>
          ) : !isPressPlayerAssetsReady(selectedWorld) ? (
            <p className="text-sm text-white/45">{t("playerWorldSoon")}</p>
          ) : (
            <>
              <div className="hidden md:block">
                <WemPressPlayer
                  world={selectedWorld}
                  accent={theme.accent}
                  tracks={playerTracks}
                  activeTrack={activeTrack ? playerTracks.find((t) => t.id === activeTrack.id) ?? null : null}
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
              <div className="md:hidden">
                <WemPressPlayerMobile
                  tracks={playerTracks}
                  activeTrack={activeTrack ? playerTracks.find((t) => t.id === activeTrack.id) ?? null : null}
                  playing={playing}
                  progress={progress}
                  duration={duration}
                  volume={volume}
                  accent={theme.accent}
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
                  onSelectTrack={(id) => void playTrackById(id)}
                  onVote={(stars) => {
                    if (activeTrack) void handleVote(activeTrack.id, stars, activeTrack.title);
                  }}
                />
              </div>
            </>
          )}

          <audio ref={audioRef} preload="metadata" className="hidden" />
        </div>
      )}
    </section>
  );
}
