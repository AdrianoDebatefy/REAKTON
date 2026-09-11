"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";
import { NfcAlbumPreloadScreen } from "@/components/nfc/NfcAlbumPreloadScreen";
import { NfcPlayerV2, type NfcPlayerV2Track } from "@/components/nfc/NfcPlayerV2";
import { NfcPreloadTrackError, revokeNfcPreloadBlobs } from "@/lib/nfc-audio-preload";

interface NfcTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
  order: number;
}

function toPlayerTracks(tracks: NfcTrack[]): NfcPlayerV2Track[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    order: t.order,
    audioUrl: t.audioUrl,
  }));
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
  const [preloadedTracks, setPreloadedTracks] = useState<NfcPlayerV2Track[] | null>(null);
  const [preloadFailed, setPreloadFailed] = useState(false);
  const [preloadFailDetail, setPreloadFailDetail] = useState<string | null>(null);
  const [useStreamingFallback, setUseStreamingFallback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const sessionEndAtRef = useRef(0);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/nfc/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated: boolean;
      pcCode: string | null;
      remainingMs: number;
    };
    setAuthenticated(data.authenticated);
    setPcCode(data.pcCode);
    setRemainingMs(data.remainingMs ?? 0);
    if (data.authenticated && data.remainingMs > 0) {
      sessionEndAtRef.current = Date.now() + data.remainingMs;
    }
    return data;
  }, []);

  const loadTracks = useCallback(async () => {
    setTracksLoading(true);
    setPreloadFailed(false);
    setPreloadFailDetail(null);
    setUseStreamingFallback(false);
    setPreloadedTracks(null);
    revokeNfcPreloadBlobs(blobUrlsRef.current);
    blobUrlsRef.current = [];
    try {
      const res = await fetch("/api/nfc/tracks", { cache: "no-store" });
      if (!res.ok) throw new Error("tracks");
      const data = (await res.json()) as { tracks: NfcTrack[] };
      setTracks(data.tracks);
    } catch {
      setTracks([]);
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
        if (!session?.authenticated) setAuthenticated(false);
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [authenticated, refreshSession]);

  useEffect(() => {
    if (!authenticated) return undefined;
    if (sessionEndAtRef.current <= 0) {
      sessionEndAtRef.current = Date.now() + remainingMs;
    }
    const timer = window.setInterval(() => {
      const next = Math.max(0, sessionEndAtRef.current - Date.now());
      setRemainingMs(next);
      if (next <= 0) setAuthenticated(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [authenticated]);

  useEffect(
    () => () => {
      revokeNfcPreloadBlobs(blobUrlsRef.current);
      blobUrlsRef.current = [];
    },
    []
  );

  const handlePreloadReady = useCallback((ready: NfcPlayerV2Track[], blobs: string[]) => {
    blobUrlsRef.current = blobs;
    setPreloadedTracks(ready);
    setPreloadFailed(false);
    setPreloadFailDetail(null);
  }, []);

  const handlePreloadError = useCallback(
    (error: unknown) => {
      setPreloadFailed(true);
      if (error instanceof NfcPreloadTrackError) {
        setPreloadFailDetail(
          t("preloadFailedAtTrack", {
            title: error.trackTitle,
            done: error.completedBeforeFail,
            total: tracks.length,
          })
        );
      } else {
        setPreloadFailDetail(null);
      }
    },
    [t, tracks.length]
  );

  const handlePlaybackError = useCallback(
    (code: string | null) => {
      if (!code) {
        setPlaybackError(null);
        return;
      }
      if (code === "no_audio") setPlaybackError(t("playbackNoAudio"));
      else setPlaybackError(t("playbackFailed"));
    },
    [t]
  );

  if (!sessionChecked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white/60">
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
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center">
        <h1 className="text-2xl font-light tracking-wide text-white">{t("title")}</h1>
        <p className="mt-4 text-white/60">{t("sessionExpired")}</p>
        <p className="mt-2 text-sm text-white/45">{t("tapAgain")}</p>
      </div>
    );
  }

  if (tracksLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white/60">
        {t("loadingTracks")}
      </div>
    );
  }

  if (!tracksLoading && tracks.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black px-6 text-center text-white/60">
        {t("noTracks")}
      </div>
    );
  }

  if (useStreamingFallback) {
    return (
      <NfcPlayerV2
        tracks={toPlayerTracks(tracks)}
        pcCode={pcCode}
        playbackError={playbackError}
        onPlaybackError={handlePlaybackError}
      />
    );
  }

  if (preloadFailed) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-white/70">{preloadFailDetail ?? t("preloadFailed")}</p>
        <p className="mt-3 max-w-sm text-sm text-white/45">{t("preloadStreamHint")}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="border border-white/30 px-6 py-2 text-sm uppercase tracking-widest text-white/80"
            onClick={() => void loadTracks()}
          >
            {t("preloadRetry")}
          </button>
          <button
            type="button"
            className="border border-white/15 px-6 py-2 text-sm uppercase tracking-widest text-white/55"
            onClick={() => {
              setPreloadFailed(false);
              setUseStreamingFallback(true);
            }}
          >
            {t("preloadStreamAnyway")}
          </button>
        </div>
      </div>
    );
  }

  if (!preloadedTracks) {
    return (
      <NfcAlbumPreloadScreen
        tracks={tracks}
        onReady={handlePreloadReady}
        onError={handlePreloadError}
      />
    );
  }

  return (
    <NfcPlayerV2
      tracks={preloadedTracks}
      pcCode={pcCode}
      playbackError={playbackError}
      onPlaybackError={handlePlaybackError}
    />
  );
}
