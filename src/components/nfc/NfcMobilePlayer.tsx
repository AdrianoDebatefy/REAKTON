"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { formatTimeExtended, ProgressBar } from "@/components/press/press-player-controls";
import { NFC_BAR_TRANSITION_MS, NFC_PLAYER_ASSETS } from "@/lib/nfc-player-assets";

export interface NfcPlayerTrack {
  id: string;
  title: string;
  audioUrl: string;
  order: number;
}

interface NfcMobilePlayerProps {
  tracks: NfcPlayerTrack[];
  pcCode: string | null;
  sessionRemainingMs: number;
  playbackError: string | null;
  onPlaybackError: (message: string | null) => void;
}

function formatSessionRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function NfcMobilePlayer({
  tracks,
  pcCode,
  sessionRemainingMs,
  playbackError,
  onPlaybackError,
}: NfcMobilePlayerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayDone, setAutoplayDone] = useState(false);
  const [analyserReady, setAnalyserReady] = useState(false);
  const [switching, setSwitching] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const tracksRef = useRef(tracks);
  const expandedIdRef = useRef(expandedId);
  const switchingRef = useRef(false);

  tracksRef.current = tracks;
  expandedIdRef.current = expandedId;

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
        /* playback without visualizer */
      }
    }

    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  }, []);

  const loadAndPlay = useCallback(
    async (trackId: string) => {
      const track = tracksRef.current.find((row) => row.id === trackId);
      if (!track?.audioUrl?.trim()) {
        onPlaybackError("no_audio");
        return false;
      }

      onPlaybackError(null);
      setActiveTrackId(trackId);

      const audio = audioRef.current;
      if (!audio) return false;

      await ensureAudioGraph();

      const absoluteUrl = track.audioUrl.startsWith("http")
        ? track.audioUrl
        : new URL(track.audioUrl, window.location.origin).href;

      if (audio.src !== absoluteUrl) {
        audio.src = absoluteUrl;
        audio.load();
      }

      try {
        await audio.play();
        setPlaying(true);
        return true;
      } catch {
        onPlaybackError("playback_failed");
        setPlaying(false);
        return false;
      }
    },
    [ensureAudioGraph, onPlaybackError]
  );

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const collapseExpanded = useCallback(() => {
    setExpandedId(null);
    pausePlayback();
  }, [pausePlayback]);

  const expandAndPlay = useCallback(
    async (trackId: string) => {
      setExpandedId(trackId);
      await loadAndPlay(trackId);
    },
    [loadAndPlay]
  );

  const switchToTrack = useCallback(
    async (trackId: string) => {
      if (switchingRef.current) return;
      const currentExpanded = expandedIdRef.current;

      if (currentExpanded === trackId) {
        collapseExpanded();
        return;
      }

      if (currentExpanded) {
        switchingRef.current = true;
        setSwitching(true);
        pausePlayback();
        setExpandedId(null);

        window.setTimeout(async () => {
          setExpandedId(trackId);
          await loadAndPlay(trackId);
          switchingRef.current = false;
          setSwitching(false);
        }, NFC_BAR_TRANSITION_MS);
        return;
      }

      await expandAndPlay(trackId);
    },
    [collapseExpanded, expandAndPlay, loadAndPlay, playing]
  );

  const stepTrack = useCallback(
    (direction: -1 | 1) => {
      const list = tracksRef.current;
      if (list.length === 0) return;
      const currentIndex = list.findIndex((t) => t.id === (expandedIdRef.current ?? activeTrackId));
      const base = currentIndex < 0 ? 0 : currentIndex;
      const next = (base + direction + list.length) % list.length;
      void switchToTrack(list[next]!.id);
    },
    [activeTrackId, switchToTrack]
  );

  useEffect(() => {
    if (tracks.length === 0 || autoplayDone) return;
    setAutoplayDone(true);
    void expandAndPlay(tracks[0]!.id);
  }, [autoplayDone, expandAndPlay, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const list = tracksRef.current;
      const currentIndex = list.findIndex((t) => t.id === expandedIdRef.current);
      const next = list[(currentIndex + 1) % list.length];
      if (next) void switchToTrack(next.id);
    };
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
  }, [switchToTrack]);

  const progressRatio = duration > 0 ? progress / duration : 0;
  const accent = "#e85c5c";

  const handleSeek = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setProgress(audio.currentTime);
  }, [duration]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-black text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={NFC_PLAYER_ASSETS.background}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative z-10 flex h-full flex-col px-[4.5%] pb-[5%] pt-[3%]">
        {pcCode ? (
          <p className="shrink-0 text-center font-mono text-[clamp(0.65rem,2.8vw,0.85rem)] uppercase tracking-[0.2em] text-white/55">
            PC: <span className="text-white/85">{pcCode}</span>
          </p>
        ) : (
          <div className="h-[1.2rem] shrink-0" aria-hidden />
        )}

        <div className="relative mx-auto mt-[2%] w-[88%] shrink-0">
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-sm bg-black/35">
            <PressEqWaves
              atmosphere="club"
              analyser={analyserReady ? analyserRef.current : null}
              visible
              active={playing}
              className="absolute inset-0 h-full w-full"
              renderBoost={1.4}
            />
          </div>
        </div>

        <p className="mt-[2%] shrink-0 text-center font-mono text-[clamp(0.85rem,3.6vw,1.05rem)] tracking-[0.12em] text-white/55">
          {formatTimeExtended(progress)}
        </p>

        <div className="mx-auto mt-[1.5%] w-[84%] shrink-0">
          <ProgressBar
            value={progressRatio}
            accent={accent}
            disabled={!duration}
            onChange={handleSeek}
            touch
          />
        </div>

        <div
          className="mx-auto mt-[3%] h-px w-[92%] shrink-0 bg-[#3de8f6] shadow-[0_0_8px_rgba(61,232,246,0.65)]"
          aria-hidden
        />

        <div className="mt-[3%] flex min-h-0 flex-1 gap-[3%]">
          <div className="flex w-[14%] shrink-0 flex-col items-center justify-center gap-[8%]">
            <button
              type="button"
              onClick={() => stepTrack(-1)}
              disabled={switching || tracks.length < 2}
              className="flex h-[12%] min-h-[2.5rem] w-full items-center justify-center opacity-90 transition active:scale-95 disabled:opacity-30"
              aria-label="Previous track"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={NFC_PLAYER_ASSETS.arrowUp} alt="" className="max-h-full max-w-full object-contain" />
            </button>
            <button
              type="button"
              onClick={() => stepTrack(1)}
              disabled={switching || tracks.length < 2}
              className="flex h-[12%] min-h-[2.5rem] w-full items-center justify-center opacity-90 transition active:scale-95 disabled:opacity-30"
              aria-label="Next track"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={NFC_PLAYER_ASSETS.arrowUp}
                alt=""
                className="max-h-full max-w-full rotate-180 object-contain"
              />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-[2.2%] overflow-y-auto py-[1%]">
            {tracks.map((track) => {
              const isExpanded = expandedId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  disabled={switching}
                  onClick={() => void switchToTrack(track.id)}
                  className="relative flex h-[clamp(2.4rem,7.2vw,3.35rem)] items-center overflow-hidden bg-transparent bg-no-repeat transition-[width,margin] duration-1000 ease-in-out disabled:pointer-events-none"
                  style={{
                    width: isExpanded ? "96%" : "62%",
                    marginLeft: isExpanded ? "0%" : "auto",
                    marginRight: isExpanded ? "auto" : "0%",
                    backgroundImage: `url(${isExpanded ? NFC_PLAYER_ASSETS.activeBar : NFC_PLAYER_ASSETS.inactiveBar})`,
                    backgroundSize: "100% 100%",
                  }}
                >
                  <span
                    className={`w-full truncate px-[8%] text-left uppercase tracking-[0.14em] ${
                      isExpanded
                        ? "text-[clamp(0.95rem,4.2vw,1.35rem)] text-white"
                        : "text-[clamp(0.75rem,3.4vw,1.05rem)] text-white/75"
                    }`}
                  >
                    {track.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="pointer-events-none absolute right-[4%] top-[2%] font-mono text-[10px] uppercase tracking-widest text-white/35">
          {formatSessionRemaining(sessionRemainingMs)}
        </p>

        {playbackError ? (
          <p className="pointer-events-none absolute bottom-[2%] left-[4%] right-[4%] text-center text-xs text-red-300/90">
            {playbackError}
          </p>
        ) : null}
      </div>

      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
}
