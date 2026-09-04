"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { formatTimeExtended, ProgressBar } from "@/components/press/press-player-controls";
import { NFC_BAR_TRANSITION_MS, NFC_PLAYER_ASSETS } from "@/lib/nfc-player-assets";
import {
  NFC_BAR,
  NFC_DESIGN_HEIGHT,
  NFC_DESIGN_WIDTH,
  nfcBarTop,
  nfcEqBox,
} from "@/lib/nfc-player-layout";

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
  const [stageScale, setStageScale] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const tracksRef = useRef(tracks);
  const expandedIdRef = useRef(expandedId);
  const switchingRef = useRef(false);

  tracksRef.current = tracks;
  expandedIdRef.current = expandedId;

  const eqBox = nfcEqBox();

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const updateScale = () => {
      const { width, height } = el.getBoundingClientRect();
      setStageScale(Math.max(width / NFC_DESIGN_WIDTH, height / NFC_DESIGN_HEIGHT));
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    [collapseExpanded, expandAndPlay, loadAndPlay]
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

  const firstBarTop = tracks.length > 0 ? nfcBarTop(0, tracks.length) : 0;
  const lastBarTop =
    tracks.length > 0 ? nfcBarTop(tracks.length - 1, tracks.length) : 0;
  const arrowColumnCenterY = (firstBarTop + lastBarTop + NFC_BAR.height) / 2;

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 z-[100] overflow-hidden bg-black text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: NFC_DESIGN_WIDTH * stageScale,
          height: NFC_DESIGN_HEIGHT * stageScale,
          marginLeft: -(NFC_DESIGN_WIDTH * stageScale) / 2,
          marginTop: -(NFC_DESIGN_HEIGHT * stageScale) / 2,
        }}
      >
        <div
          className="relative"
          style={{
            width: NFC_DESIGN_WIDTH,
            height: NFC_DESIGN_HEIGHT,
            transform: `scale(${stageScale})`,
            transformOrigin: "top left",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_ASSETS.background}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            width={NFC_DESIGN_WIDTH}
            height={NFC_DESIGN_HEIGHT}
          />

          {pcCode ? (
            <p
              className="absolute left-0 right-0 text-center font-mono text-[34px] uppercase tracking-[0.2em] text-white/55"
              style={{ top: 120 }}
            >
              PC: <span className="text-white/85">{pcCode}</span>
            </p>
          ) : null}

          <div
            className="absolute overflow-hidden bg-black/35"
            style={{
              left: eqBox.left,
              top: eqBox.top,
              width: eqBox.width,
              height: eqBox.height,
            }}
          >
            <PressEqWaves
              atmosphere="club"
              analyser={analyserReady ? analyserRef.current : null}
              visible
              active={playing}
              className="absolute inset-0 h-full w-full"
              renderBoost={1.4}
            />
          </div>

          <p
            className="absolute left-0 right-0 text-center font-mono text-[44px] tracking-[0.12em] text-white/55"
            style={{ top: eqBox.top + eqBox.height + 72 }}
          >
            {formatTimeExtended(progress)}
          </p>

          <div
            className="absolute"
            style={{
              left: eqBox.left + 40,
              top: eqBox.top + eqBox.height + 148,
              width: eqBox.width - 80,
            }}
          >
            <ProgressBar
              value={progressRatio}
              accent={accent}
              disabled={!duration}
              onChange={handleSeek}
              touch
            />
          </div>

          <div
            className="absolute h-px bg-[#3de8f6] shadow-[0_0_8px_rgba(61,232,246,0.65)]"
            style={{
              left: 96,
              top: eqBox.top + eqBox.height + 248,
              width: NFC_DESIGN_WIDTH - 192,
            }}
            aria-hidden
          />

          <button
            type="button"
            onClick={() => stepTrack(-1)}
            disabled={switching || tracks.length < 2}
            className="absolute flex items-center justify-center opacity-90 transition active:scale-95 disabled:opacity-30"
            style={{
              left: 120,
              top: arrowColumnCenterY - 180,
              width: 280,
              height: 254,
            }}
            aria-label="Previous track"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_ASSETS.arrowUp}
              alt=""
              width={280}
              height={254}
              className="h-full w-full object-contain"
            />
          </button>

          <button
            type="button"
            onClick={() => stepTrack(1)}
            disabled={switching || tracks.length < 2}
            className="absolute flex items-center justify-center opacity-90 transition active:scale-95 disabled:opacity-30"
            style={{
              left: 120,
              top: arrowColumnCenterY + 40,
              width: 280,
              height: 254,
            }}
            aria-label="Next track"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_ASSETS.arrowUp}
              alt=""
              width={280}
              height={254}
              className="h-full w-full rotate-180 object-contain"
            />
          </button>

          {tracks.map((track, index) => {
            const isExpanded = expandedId === track.id;
            return (
              <button
                key={track.id}
                type="button"
                disabled={switching}
                onClick={() => void switchToTrack(track.id)}
                className="absolute overflow-hidden bg-transparent disabled:pointer-events-none"
                style={{
                  left: isExpanded ? NFC_BAR.xExpanded : NFC_BAR.xCollapsed,
                  top: nfcBarTop(index, tracks.length),
                  width: NFC_BAR.width,
                  height: NFC_BAR.height,
                  transition: `left ${NFC_BAR_TRANSITION_MS}ms ease-in-out`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isExpanded ? NFC_PLAYER_ASSETS.activeBar : NFC_PLAYER_ASSETS.inactiveBar}
                  alt=""
                  width={NFC_BAR.width}
                  height={NFC_BAR.height}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  draggable={false}
                />
                <span
                  className={`absolute bottom-0 top-0 flex items-center truncate text-right uppercase tracking-[0.14em] ${
                    isExpanded ? "text-[54px] text-white" : "text-[42px] text-white/75"
                  }`}
                  style={{
                    right: NFC_BAR.textPaddingRight,
                    left: 120,
                  }}
                >
                  {track.title}
                </span>
              </button>
            );
          })}

          <p
            className="pointer-events-none absolute font-mono text-[28px] uppercase tracking-widest text-white/35"
            style={{ right: 96, top: 96 }}
          >
            {formatSessionRemaining(sessionRemainingMs)}
          </p>

          {playbackError ? (
            <p
              className="pointer-events-none absolute left-[96px] right-[96px] text-center text-[32px] text-red-300/90"
              style={{ bottom: 96 }}
            >
              {playbackError}
            </p>
          ) : null}
        </div>
      </div>

      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
}
