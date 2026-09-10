"use client";

import { Doto } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { NfcMarqueeTitle } from "@/components/nfc/NfcMarqueeTitle";
import {
  NFC_CD_RPM,
  NFC_PLAYER_V2_ASSETS,
  NFC_SKIP_FLASH_MS,
} from "@/lib/nfc-player-v2-assets";
import {
  NFC_V2_HEIGHT,
  NFC_V2_LAYERS,
  NFC_V2_SLIDER,
  NFC_V2_WIDTH,
  nfcV2SliderPosition,
} from "@/lib/nfc-player-v2-layout";

const doto = Doto({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export interface NfcPlayerV2Track {
  id: string;
  title: string;
  audioUrl: string;
  order: number;
}

interface NfcPlayerV2Props {
  tracks: NfcPlayerV2Track[];
  pcCode: string | null;
  playbackError: string | null;
  onPlaybackError: (message: string | null) => void;
}

function formatPlayTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function NfcPlayerV2({
  tracks,
  pcCode,
  playbackError,
  onPlaybackError,
}: NfcPlayerV2Props) {
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayDone, setAutoplayDone] = useState(false);
  const [analyserReady, setAnalyserReady] = useState(false);
  const [skipBackFlash, setSkipBackFlash] = useState(false);
  const [skipFwdFlash, setSkipFwdFlash] = useState(false);
  const [stageScale, setStageScale] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const tracksRef = useRef(tracks);
  const trackIndexRef = useRef(trackIndex);

  tracksRef.current = tracks;
  trackIndexRef.current = trackIndex;

  const activeTrack = tracks[trackIndex] ?? null;
  const progressRatio = duration > 0 ? progress / duration : 0;
  const knobPos = nfcV2SliderPosition(progressRatio);
  const cdSpinning = playing && !paused;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setStageScale(Math.max(width / NFC_V2_WIDTH, height / NFC_V2_HEIGHT));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || sourceRef.current) {
      if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
      return;
    }
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setAnalyserReady(true);
    } catch {
      /* audio without EQ */
    }
  }, []);

  const loadTrack = useCallback(
    async (index: number, autoPlay: boolean) => {
      const list = tracksRef.current;
      const track = list[index];
      if (!track?.audioUrl?.trim()) {
        onPlaybackError("no_audio");
        return false;
      }

      onPlaybackError(null);
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

      if (!autoPlay) return true;

      try {
        await audio.play();
        setPlaying(true);
        setPaused(false);
        return true;
      } catch {
        onPlaybackError("playback_failed");
        setPlaying(false);
        return false;
      }
    },
    [ensureAudioGraph, onPlaybackError]
  );

  const playCurrent = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setPlaying(true);
      setPaused(false);
    } catch {
      onPlaybackError("playback_failed");
    }
  }, [onPlaybackError]);

  const pauseCurrent = useCallback(() => {
    audioRef.current?.pause();
    setPaused(true);
  }, []);

  const flashSkip = useCallback((direction: "back" | "fwd") => {
    if (direction === "back") {
      setSkipBackFlash(true);
      window.setTimeout(() => setSkipBackFlash(false), NFC_SKIP_FLASH_MS);
    } else {
      setSkipFwdFlash(true);
      window.setTimeout(() => setSkipFwdFlash(false), NFC_SKIP_FLASH_MS);
    }
  }, []);

  const goToTrack = useCallback(
    async (nextIndex: number, flash?: "back" | "fwd") => {
      const list = tracksRef.current;
      if (list.length === 0) return;
      const wrapped = (nextIndex + list.length) % list.length;
      if (flash) flashSkip(flash);
      setTrackIndex(wrapped);
      setProgress(0);
      setDuration(0);
      await loadTrack(wrapped, !paused);
    },
    [flashSkip, loadTrack, paused]
  );

  const handleStop = useCallback(() => {
    if (paused) {
      void playCurrent();
      return;
    }
    pauseCurrent();
  }, [pauseCurrent, playCurrent]);

  useEffect(() => {
    if (tracks.length === 0 || autoplayDone) return;
    setAutoplayDone(true);
    setTrackIndex(0);
    void loadTrack(0, true);
  }, [autoplayDone, loadTrack, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const list = tracksRef.current;
      if (list.length === 0) return;
      const next = (trackIndexRef.current + 1) % list.length;
      void goToTrack(next);
    };
    const onPlay = () => {
      setPlaying(true);
      setPaused(false);
    };
    const onPause = () => setPaused(true);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [goToTrack]);

  const seekFromKnob = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const list = tracksRef.current;
      if (!duration || list.length === 0) return;
      const scale = rect.width / NFC_V2_WIDTH;
      const x = (clientX - rect.left) / scale;
      const y = (clientY - rect.top) / scale;
      const dx = NFC_V2_SLIDER.end.x - NFC_V2_SLIDER.start.x;
      const dy = NFC_V2_SLIDER.end.y - NFC_V2_SLIDER.start.y;
      const lenSq = dx * dx + dy * dy;
      const t = Math.min(1, Math.max(0, ((x - NFC_V2_SLIDER.start.x) * dx + (y - NFC_V2_SLIDER.start.y) * dy) / lenSq));
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = t * duration;
      setProgress(audio.currentTime);
    },
    [duration]
  );

  return (
    <div
      ref={viewportRef}
      className={`fixed inset-0 z-[100] overflow-hidden bg-black text-white ${doto.className}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: NFC_V2_WIDTH * stageScale,
          height: NFC_V2_HEIGHT * stageScale,
          marginLeft: -(NFC_V2_WIDTH * stageScale) / 2,
          marginTop: -(NFC_V2_HEIGHT * stageScale) / 2,
        }}
      >
        <div
          className="relative select-none"
          style={{
            width: NFC_V2_WIDTH,
            height: NFC_V2_HEIGHT,
            transform: `scale(${stageScale})`,
            transformOrigin: "top left",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.chassis}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full"
            width={NFC_V2_WIDTH}
            height={NFC_V2_HEIGHT}
            draggable={false}
          />

          <div
            className="absolute overflow-hidden"
            style={NFC_V2_LAYERS.equalizer}
            aria-hidden
          >
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: "150%",
                height: "150%",
                transform: "translate(-50%, -50%) rotate(90deg)",
              }}
            >
              <PressEqWaves
                atmosphere="club"
                analyser={analyserReady ? analyserRef.current : null}
                visible
                active={cdSpinning}
                className="h-full w-full"
                renderBoost={1.35}
              />
            </div>
          </div>

          <div
            className="absolute overflow-hidden rounded-full"
            style={NFC_V2_LAYERS.realCd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_V2_ASSETS.realCd}
              alt=""
              className="h-full w-full object-cover"
              style={{
                animation: `nfc-cd-spin ${60 / NFC_CD_RPM}s linear infinite`,
                animationPlayState: cdSpinning ? "running" : "paused",
              }}
              draggable={false}
            />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.cdRing}
            alt=""
            className="pointer-events-none absolute"
            style={NFC_V2_LAYERS.cdRing}
            draggable={false}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.sliderArm}
            alt=""
            className="pointer-events-none absolute"
            style={NFC_V2_LAYERS.sliderArm}
            draggable={false}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.sliderKnob}
            alt=""
            className="absolute touch-manipulation"
            style={{
              left: knobPos.x,
              top: knobPos.y,
              width: NFC_V2_SLIDER.knobWidth,
              height: NFC_V2_SLIDER.knobHeight,
            }}
            draggable={false}
            onPointerDown={(e) => {
              const stage = e.currentTarget.parentElement;
              if (!stage) return;
              const rect = stage.getBoundingClientRect();
              const move = (ev: PointerEvent) => seekFromKnob(ev.clientX, ev.clientY, rect);
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
              seekFromKnob(e.clientX, e.clientY, rect);
            }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.skipOnBack}
            alt=""
            className="pointer-events-none absolute transition-opacity duration-150"
            style={{ ...NFC_V2_LAYERS.skipOnBack, opacity: skipBackFlash ? 1 : 0 }}
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.skipOnFwd}
            alt=""
            className="pointer-events-none absolute transition-opacity duration-150"
            style={{ ...NFC_V2_LAYERS.skipOnFwd, opacity: skipFwdFlash ? 1 : 0 }}
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.stopOn}
            alt=""
            className="pointer-events-none absolute transition-opacity duration-300"
            style={{ ...NFC_V2_LAYERS.stopOn, opacity: paused ? 1 : 0 }}
            draggable={false}
          />

          <button
            type="button"
            className="absolute bg-transparent p-0"
            style={NFC_V2_LAYERS.skipBack}
            onClick={() => void goToTrack(trackIndex - 1, "back")}
            aria-label="Previous track"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFC_PLAYER_V2_ASSETS.skipBack} alt="" className="h-full w-full" />
          </button>
          <button
            type="button"
            className="absolute bg-transparent p-0"
            style={NFC_V2_LAYERS.stop}
            onClick={handleStop}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFC_PLAYER_V2_ASSETS.stop} alt="" className="h-full w-full" />
          </button>
          <button
            type="button"
            className="absolute bg-transparent p-0"
            style={NFC_V2_LAYERS.skipForward}
            onClick={() => void goToTrack(trackIndex + 1, "fwd")}
            aria-label="Next track"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFC_PLAYER_V2_ASSETS.skipForward} alt="" className="h-full w-full" />
          </button>

          <div className="absolute" style={NFC_V2_LAYERS.textDesktopcode}>
            <p className="text-[11px] font-bold leading-tight text-white/80">PC</p>
            <p className="truncate text-[15px] font-bold text-white">{pcCode ?? "—"}</p>
          </div>

          <NfcMarqueeTitle
            title={(activeTrack?.title ?? "").toUpperCase()}
            className="absolute flex items-center"
            style={{
              ...NFC_V2_LAYERS.textSongtitle,
              color: "#000",
              fontSize: 18,
              fontWeight: 700,
            }}
          />

          <p
            className="absolute flex items-center justify-end text-right font-bold text-white"
            style={{
              ...NFC_V2_LAYERS.textTime,
              fontSize: 16,
            }}
          >
            {formatPlayTime(progress)}
          </p>

          {playbackError ? (
            <p className="absolute bottom-2 left-2 right-2 text-center text-xs text-red-300">
              {playbackError}
            </p>
          ) : null}
        </div>
      </div>

      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
}
