"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { WorldAtmosphere } from "@/types/content";
import { EqVisualizer } from "@/components/press/EqVisualizer";
import { StarRating } from "@/components/press/StarRating";
import {
  PRESS_WORLD_ORDER,
  PRESS_WORLD_THEME,
  pressWorldLabel,
} from "@/lib/press-preview-theme";

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

  const ensureAudioGraph = useCallback(async () => {
    if (!audioRef.current || sourceRef.current) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    setAnalyserReady(true);
    if (ctx.state === "suspended") await ctx.resume();
  }, []);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  }, []);

  const playTrack = useCallback(
    async (track: PreviewTrack) => {
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
    [activeTrackId, ensureAudioGraph]
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

  const handleVote = async (trackId: string, stars: number) => {
    const res = await fetch("/api/press-preview/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId, stars }),
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

  return (
    <section className="mb-14 border-b border-white/10 pb-12">
      <h2 className="text-sm uppercase tracking-[0.35em] text-white/45">{t("sectionTitle")}</h2>
      <p className="mt-2 text-sm text-white/50">{t("sectionSubtitle")}</p>

      {view === "buttons" && (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {PRESS_WORLD_ORDER.map((world) => {
            const worldTheme = PRESS_WORLD_THEME[world];
            return (
              <button
                key={world}
                type="button"
                onClick={() => void handleWorldClick(world)}
                className={`w-full border px-4 py-5 text-center text-xs uppercase tracking-[0.25em] text-white transition md:text-[8px] ${worldTheme.button} ${worldTheme.glow}`}
              >
                {pressWorldLabel(world, locale)}
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
        <div
          className={`mt-6 overflow-hidden rounded border border-white/15 bg-gradient-to-b from-black/70 to-black/40 p-5 backdrop-blur-md ${theme.glow}`}
          style={{ borderColor: `${theme.accent}44` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="mt-5">
            <EqVisualizer
              analyser={analyserReady ? analyserRef.current : null}
              active={playing}
              colors={theme.eq}
            />
          </div>

          {tracksLoading ? (
            <p className="mt-6 text-sm text-white/45">{t("loadingTracks")}</p>
          ) : tracks.length === 0 ? (
            <p className="mt-6 text-sm text-white/45">{t("noTracks")}</p>
          ) : (
            <>
              {activeTrack ? (
                <div className="mt-5 flex flex-wrap items-center gap-4 rounded border border-white/10 bg-black/35 p-4">
                  {activeTrack.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeTrack.coverImage}
                      alt=""
                      className="h-16 w-16 rounded border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded border border-white/10 bg-white/5 text-xs text-white/35">
                      REAKTON
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-light md:text-sm">{activeTrack.title}</p>
                    {activeTrack.artist ? (
                      <p className="truncate text-sm text-white/45 md:text-xs">{activeTrack.artist}</p>
                    ) : null}
                    <div className="mt-3">
                      <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={progress}
                        onChange={(e) => {
                          const audio = audioRef.current;
                          if (!audio) return;
                          audio.currentTime = Number(e.target.value);
                          setProgress(audio.currentTime);
                        }}
                        className="w-full accent-white/80"
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-white/35 md:text-[7px]">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (playing) {
                        stopPlayback();
                      } else {
                        void playTrack(activeTrack);
                      }
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg text-white transition hover:bg-white/20"
                    aria-label={playing ? t("pause") : t("play")}
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>
                </div>
              ) : null}

              <ul className="mt-5 space-y-2">
                {tracks.map((track) => {
                  const isActive = track.id === activeTrackId;
                  return (
                    <li
                      key={track.id}
                      className={`rounded border px-4 py-3 transition ${
                        isActive
                          ? "border-white/25 bg-white/10"
                          : "border-white/10 bg-black/25 hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            stopPlayback();
                            void playTrack(track);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-light md:text-xs">
                            {track.title}
                          </span>
                          {track.artist ? (
                            <span className="block truncate text-xs text-white/40">{track.artist}</span>
                          ) : null}
                        </button>
                        <StarRating
                          value={track.votes}
                          userStars={track.userStars}
                          onVote={(stars) => void handleVote(track.id, stars)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <audio ref={audioRef} preload="metadata" className="hidden" />
        </div>
      )}
    </section>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
