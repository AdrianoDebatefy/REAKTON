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
  NFC_V2_GESTELL_BLEED_TOP,
  NFC_V2_HEIGHT,
  NFC_V2_RECTS,
  NFC_V2_SLIDER,
  NFC_V2_TEXT_ROTATION_DEG,
  NFC_V2_WIDTH,
  nfcV2RectStyle,
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

function LayerImage({
  src,
  rect,
  className = "",
  style,
  objectFit = "fill",
}: {
  src: string;
  rect: { left: number; top: number; width: number; height: number };
  className?: string;
  style?: React.CSSProperties;
  objectFit?: "fill" | "contain" | "cover" | "none";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`pointer-events-none absolute ${className}`}
      style={{ ...nfcV2RectStyle(rect), objectFit, ...style }}
      draggable={false}
    />
  );
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
  const stageRef = useRef<HTMLDivElement>(null);
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

  const rotatedTextStyle = {
    transform: `rotate(${NFC_V2_TEXT_ROTATION_DEG}deg)`,
    transformOrigin: "top left",
  };

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
      void goToTrack(trackIndexRef.current + 1);
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
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage || !duration) return;
      const rect = stage.getBoundingClientRect();
      const scale = rect.width / NFC_V2_WIDTH;
      const x = (clientX - rect.left) / scale;
      const y = (clientY - rect.top) / scale - NFC_V2_GESTELL_BLEED_TOP;
      const dx = NFC_V2_SLIDER.end.x - NFC_V2_SLIDER.start.x;
      const dy = NFC_V2_SLIDER.end.y - NFC_V2_SLIDER.start.y;
      const lenSq = dx * dx + dy * dy;
      const t = Math.min(
        1,
        Math.max(0, ((x - NFC_V2_SLIDER.start.x) * dx + (y - NFC_V2_SLIDER.start.y) * dy) / lenSq)
      );
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
          height: (NFC_V2_HEIGHT + NFC_V2_GESTELL_BLEED_TOP) * stageScale,
          marginLeft: -(NFC_V2_WIDTH * stageScale) / 2,
          marginTop: -((NFC_V2_HEIGHT + NFC_V2_GESTELL_BLEED_TOP) * stageScale) / 2,
        }}
      >
        <div
          ref={stageRef}
          className="relative select-none"
          style={{
            width: NFC_V2_WIDTH,
            height: NFC_V2_HEIGHT + NFC_V2_GESTELL_BLEED_TOP,
            paddingTop: NFC_V2_GESTELL_BLEED_TOP,
            boxSizing: "border-box",
            overflow: "visible",
            transform: `scale(${stageScale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="relative"
            style={{ width: NFC_V2_WIDTH, height: NFC_V2_HEIGHT, overflow: "visible" }}
          >
          <LayerImage src={NFC_PLAYER_V2_ASSETS.background} rect={NFC_V2_RECTS.background} />

          <div className="absolute overflow-hidden" style={nfcV2RectStyle(NFC_V2_RECTS.equalizerflaeche)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_V2_ASSETS.equalizerflaeche}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-fill"
              draggable={false}
            />
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: "140%",
                height: "140%",
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

          <LayerImage src={NFC_PLAYER_V2_ASSETS.gestell} rect={NFC_V2_RECTS.gestell} objectFit="fill" />
          <LayerImage src={NFC_PLAYER_V2_ASSETS.cdLaufwerk} rect={NFC_V2_RECTS.cdLaufwerk} />

          <div className="absolute overflow-hidden" style={nfcV2RectStyle(NFC_V2_RECTS.realCd)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_V2_ASSETS.realCd}
              alt=""
              className="h-full w-full object-cover"
              style={{
                transformOrigin: "center center",
                animation: `nfc-cd-spin ${60 / NFC_CD_RPM}s linear infinite`,
                animationPlayState: cdSpinning ? "running" : "paused",
              }}
              draggable={false}
            />
          </div>

          <LayerImage src={NFC_PLAYER_V2_ASSETS.albumplayerDecker} rect={NFC_V2_RECTS.albumplayerDecker} />

          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.skipForward}
            rect={NFC_V2_RECTS.skipForward}
            className="pointer-events-none"
          />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.skipOnFwd}
            rect={NFC_V2_RECTS.skipOnFwd}
            style={{ opacity: skipFwdFlash ? 1 : 0, transition: "opacity 150ms ease" }}
          />
          <LayerImage src={NFC_PLAYER_V2_ASSETS.stop} rect={NFC_V2_RECTS.stop} />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.stopOn}
            rect={NFC_V2_RECTS.stopOn}
            style={{ opacity: paused ? 1 : 0, transition: "opacity 300ms ease" }}
          />
          <LayerImage src={NFC_PLAYER_V2_ASSETS.skipBack} rect={NFC_V2_RECTS.skipBack} />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.skipOnBack}
            rect={NFC_V2_RECTS.skipOnBack}
            style={{ opacity: skipBackFlash ? 1 : 0, transition: "opacity 150ms ease" }}
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
              const move = (ev: PointerEvent) => seekFromKnob(ev.clientX, ev.clientY);
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
              seekFromKnob(e.clientX, e.clientY);
            }}
          />

          <button
            type="button"
            className="absolute z-10 bg-transparent p-0"
            style={nfcV2RectStyle(NFC_V2_RECTS.skipForward)}
            onClick={() => void goToTrack(trackIndex + 1, "fwd")}
            aria-label="Next track"
          />
          <button
            type="button"
            className="absolute z-10 bg-transparent p-0"
            style={nfcV2RectStyle(NFC_V2_RECTS.stop)}
            onClick={handleStop}
            aria-label={paused ? "Resume" : "Pause"}
          />
          <button
            type="button"
            className="absolute z-10 bg-transparent p-0"
            style={nfcV2RectStyle(NFC_V2_RECTS.skipBack)}
            onClick={() => void goToTrack(trackIndex - 1, "back")}
            aria-label="Previous track"
          />

          <div className="absolute" style={{ ...nfcV2RectStyle(NFC_V2_RECTS.textSongtitle), ...rotatedTextStyle }}>
            <NfcMarqueeTitle
              title={(activeTrack?.title ?? "").toUpperCase()}
              className="flex h-full items-center"
              style={{ color: "#000", fontSize: 20, fontWeight: 700, width: NFC_V2_RECTS.textSongtitle.width }}
            />
          </div>

          <p
            className="absolute flex items-center font-bold text-white"
            style={{
              ...nfcV2RectStyle(NFC_V2_RECTS.textTime),
              ...rotatedTextStyle,
              fontSize: 18,
            }}
          >
            {formatPlayTime(progress)}
          </p>

          <div className="absolute" style={nfcV2RectStyle(NFC_V2_RECTS.textDesktopcode)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_V2_ASSETS.textDesktopcodeBg}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full"
              draggable={false}
            />
            <p
              className="absolute inset-0 flex items-center justify-center truncate px-2 text-center font-bold text-black"
              style={{ fontSize: 22 }}
            >
              {pcCode ?? "—"}
            </p>
          </div>

          {playbackError ? (
            <p className="absolute bottom-2 left-2 right-2 z-20 text-center text-xs text-red-300">
              {playbackError}
            </p>
          ) : null}
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </div>
  );
}
