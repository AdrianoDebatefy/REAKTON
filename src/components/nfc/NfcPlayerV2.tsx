"use client";

import { Doto } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";
import { PressEqWaves } from "@/components/press/PressEqWaves";
import { NfcMarqueeTitle } from "@/components/nfc/NfcMarqueeTitle";
import { nfcPrepareAudioPlayback, useNfcCdRotation } from "@/hooks/useNfcCdRotation";
import {
  NFC_CD_RPM,
  NFC_CD_SPIN_RAMP_SEC,
  NFC_PLAYER_V2_ASSETS,
  NFC_SKIP_FLASH_MS,
} from "@/lib/nfc-player-v2-assets";
import {
  NFC_V2_GESTELL_BLEED_TOP,
  NFC_V2_HEIGHT,
  NFC_V2_RECTS,
  NFC_V2_SLIDER,
  NFC_V2_TEXT_SONGTITLE,
  NFC_V2_TEXT_TIME,
  NFC_V2_WIDTH,
  NFC_V2_Z,
  nfcV2RectStyle,
  nfcV2SliderPosition,
  nfcV2SliderRatioFromPoint,
  nfcV2TextLayerInnerStyle,
  nfcV2TextLayerOuterStyle,
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
  zIndex,
}: {
  src: string;
  rect: { left: number; top: number; width: number; height: number };
  className?: string;
  style?: React.CSSProperties;
  objectFit?: "fill" | "contain" | "cover" | "none";
  zIndex?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`pointer-events-none absolute ${className}`}
      style={{ ...nfcV2RectStyle(rect), objectFit, zIndex, ...style }}
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
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [paused, setPaused] = useState(true);
  const [gestellSrc, setGestellSrc] = useState<string>(NFC_PLAYER_V2_ASSETS.gestell);
  const [knobDragRatio, setKnobDragRatio] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayDone, setAutoplayDone] = useState(false);
  const [analyserReady, setAnalyserReady] = useState(false);
  const [skipBackFlash, setSkipBackFlash] = useState(false);
  const [skipFwdFlash, setSkipFwdFlash] = useState(false);
  const [stageScale, setStageScale] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const tracksRef = useRef(tracks);
  const trackIndexRef = useRef(trackIndex);
  const trackLoadingRef = useRef(false);
  const cdSpinRef = useRef<HTMLDivElement>(null);

  tracksRef.current = tracks;
  trackIndexRef.current = trackIndex;

  const activeTrack = tracks[trackIndex] ?? null;
  const progressRatio = duration > 0 ? progress / duration : 0;
  const sliderRatio = knobDragRatio ?? progressRatio;
  const knobPos = nfcV2SliderPosition(sliderRatio);
  const cdSpinActive = !paused && isAudioPlaying;
  useNfcCdRotation(cdSpinRef, cdSpinActive, NFC_CD_RPM, NFC_CD_SPIN_RAMP_SEC);

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

      trackLoadingRef.current = true;
      if (autoPlay) {
        setPaused(false);
      }

      await ensureAudioGraph();

      const absoluteUrl = track.audioUrl.startsWith("http")
        ? track.audioUrl
        : new URL(track.audioUrl, window.location.origin).href;

      try {
        await nfcPrepareAudioPlayback(audio, absoluteUrl);

        if (!autoPlay) {
          trackLoadingRef.current = false;
          return true;
        }

        await audio.play();
        setIsAudioPlaying(true);
        setPaused(false);
        trackLoadingRef.current = false;
        return true;
      } catch {
        onPlaybackError("playback_failed");
        setIsAudioPlaying(false);
        setPaused(true);
        trackLoadingRef.current = false;
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
      setIsAudioPlaying(true);
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
    setPaused(true);
    setIsAudioPlaying(false);
    void loadTrack(0, false);
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
      setIsAudioPlaying(true);
      setPaused(false);
    };
    const onPause = () => {
      if (trackLoadingRef.current) return;
      setIsAudioPlaying(false);
      setPaused(true);
    };
    const onPlaying = () => {
      setIsAudioPlaying(true);
      setPaused(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
    };
  }, [goToTrack]);

  const pointerToArtboard = useCallback((clientX: number, clientY: number) => {
    const artboard = artboardRef.current;
    if (!artboard) return null;
    const rect = artboard.getBoundingClientRect();
    const scale = rect.width / NFC_V2_WIDTH;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, []);

  const seekAlongSlider = useCallback(
    (clientX: number, clientY: number) => {
      if (!duration) return;
      const point = pointerToArtboard(clientX, clientY);
      if (!point) return;
      const t = nfcV2SliderRatioFromPoint(point.x, point.y);
      setKnobDragRatio(t);
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = t * duration;
      setProgress(audio.currentTime);
    },
    [duration, pointerToArtboard]
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
            ref={artboardRef}
            className="relative"
            style={{ width: NFC_V2_WIDTH, height: NFC_V2_HEIGHT, overflow: "visible" }}
          >
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.background}
            rect={NFC_V2_RECTS.background}
            zIndex={NFC_V2_Z.background}
          />

          <div
            className="absolute overflow-hidden"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.equalizerflaeche), zIndex: NFC_V2_Z.equalizerflaeche }}
          >
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
                active={isAudioPlaying && !paused}
                className="h-full w-full"
                renderBoost={1.35}
              />
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gestellSrc}
            alt=""
            className="pointer-events-none absolute"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.gestell), objectFit: "fill", zIndex: NFC_V2_Z.gestell }}
            draggable={false}
            onError={() => setGestellSrc(NFC_PLAYER_V2_ASSETS.gestellFallback)}
          />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.cdLaufwerk}
            rect={NFC_V2_RECTS.cdLaufwerk}
            zIndex={NFC_V2_Z.cdLaufwerk}
          />

          <div
            className="absolute overflow-hidden rounded-full"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.realCd), zIndex: NFC_V2_Z.realCd }}
          >
            <div
              ref={cdSpinRef}
              className="h-full w-full"
              style={{
                transformOrigin: "center center",
                willChange: "transform",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={NFC_PLAYER_V2_ASSETS.realCd}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          </div>

          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.albumplayerDecker}
            rect={NFC_V2_RECTS.albumplayerDecker}
            zIndex={NFC_V2_Z.albumplayerDecker}
          />

          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.skipForward}
            rect={NFC_V2_RECTS.skipForward}
            zIndex={NFC_V2_Z.skipForward}
          />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.skipOnFwd}
            rect={NFC_V2_RECTS.skipOnFwd}
            zIndex={NFC_V2_Z.skipOnFwd}
            style={{ opacity: skipFwdFlash ? 1 : 0, transition: "opacity 150ms ease" }}
          />
          <LayerImage src={NFC_PLAYER_V2_ASSETS.stop} rect={NFC_V2_RECTS.stop} zIndex={NFC_V2_Z.stop} />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.stopRedplay}
            rect={NFC_V2_RECTS.stopRedplay}
            zIndex={NFC_V2_Z.stopOn}
            style={{ opacity: paused ? 1 : 0, transition: "opacity 300ms ease" }}
          />
          <LayerImage src={NFC_PLAYER_V2_ASSETS.skipBack} rect={NFC_V2_RECTS.skipBack} zIndex={NFC_V2_Z.skipBack} />
          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.skipOnBack}
            rect={NFC_V2_RECTS.skipOnBack}
            zIndex={NFC_V2_Z.skipOnBack}
            style={{ opacity: skipBackFlash ? 1 : 0, transition: "opacity 150ms ease" }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.sliderKnob}
            alt=""
            className="absolute touch-none"
            style={{
              left: knobPos.x,
              top: knobPos.y,
              width: NFC_V2_SLIDER.knobWidth,
              height: NFC_V2_SLIDER.knobHeight,
              zIndex: NFC_V2_Z.sliderKnob,
              touchAction: "none",
            }}
            draggable={false}
            onPointerDown={(e) => {
              e.preventDefault();
              const knobEl = e.currentTarget;
              knobEl.setPointerCapture(e.pointerId);
              const move = (ev: PointerEvent) => seekAlongSlider(ev.clientX, ev.clientY);
              const up = (ev: PointerEvent) => {
                setKnobDragRatio(null);
                if (knobEl.hasPointerCapture(ev.pointerId)) {
                  knobEl.releasePointerCapture(ev.pointerId);
                }
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
              seekAlongSlider(e.clientX, e.clientY);
            }}
          />

          <button
            type="button"
            className="absolute bg-transparent p-0"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.skipForward), zIndex: NFC_V2_Z.controls }}
            onClick={() => void goToTrack(trackIndex + 1, "fwd")}
            aria-label="Next track"
          />
          <button
            type="button"
            className="absolute bg-transparent p-0"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.stopRedplay), zIndex: NFC_V2_Z.controls }}
            onClick={handleStop}
            aria-label={paused ? "Play" : "Pause"}
          />
          <button
            type="button"
            className="absolute bg-transparent p-0"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.skipBack), zIndex: NFC_V2_Z.controls }}
            onClick={() => void goToTrack(trackIndex - 1, "back")}
            aria-label="Previous track"
          />

          <div
            className="absolute overflow-visible"
            style={{
              ...nfcV2TextLayerOuterStyle(NFC_V2_RECTS.textSongtitle, NFC_V2_TEXT_SONGTITLE),
              zIndex: NFC_V2_Z.textSongtitle,
            }}
          >
            <div className="overflow-hidden" style={nfcV2TextLayerInnerStyle(NFC_V2_TEXT_SONGTITLE)}>
              <NfcMarqueeTitle
                title={(activeTrack?.title ?? "").toUpperCase()}
                className="flex h-full w-full items-center"
                style={{ color: "#000", fontSize: 22, fontWeight: 700 }}
              />
            </div>
          </div>

          <div
            className="absolute overflow-visible"
            style={{
              ...nfcV2TextLayerOuterStyle(NFC_V2_RECTS.textTime, NFC_V2_TEXT_TIME),
              zIndex: NFC_V2_Z.textTime,
            }}
          >
            <p
              className="flex h-full w-full items-center font-bold text-white"
              style={{ ...nfcV2TextLayerInnerStyle(NFC_V2_TEXT_TIME), fontSize: 20 }}
            >
              {formatPlayTime(progress)}
            </p>
          </div>

          <div
            className="absolute"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.textDesktopcode), zIndex: NFC_V2_Z.textDesktopcode }}
          >
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
