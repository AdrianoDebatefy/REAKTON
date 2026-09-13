"use client";

import { Doto, Rajdhani } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";
import { NfcEqVisualizer } from "@/components/nfc/NfcEqVisualizer";
import { NfcMarqueeTitle } from "@/components/nfc/NfcMarqueeTitle";
import { useNfcCdRotation } from "@/hooks/useNfcCdRotation";
import { nfcPrefetchAdjacentStreamTracks } from "@/lib/nfc-audio-prefetch";
import { nfcApplyAudioSource, nfcWaitReadyToPlay } from "@/lib/nfc-audio-playback";
import { NFC_AUDIO_ELEMENT_STYLE, nfcPreferNativeAudioPlayback } from "@/lib/nfc-audio-platform";
import { lockPortraitForUserGesture } from "@/hooks/usePortraitOrientationLock";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
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
  NFC_V2_LOADING_LABEL,
  NFC_V2_TEXT_DESKTOPCODE,
  NFC_V2_TEXT_SONGTITLE,
  NFC_V2_TEXT_TIME,
  NFC_V2_WIDTH,
  NFC_V2_Z,
  nfcV2RectStyle,
  NFC_V2_SLIDER_DEBUG_LINE,
  nfcV2SliderDebugLineStyle,
  nfcV2SliderKnobStyle,
  nfcV2SliderRatioFromPoint,
  nfcV2SliderTrackMetrics,
  nfcV2DisplayTitle,
  nfcV2TextLayerInnerStyle,
  nfcV2TextLayerOuterStyle,
} from "@/lib/nfc-player-v2-layout";

const doto = Doto({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500"],
});

export interface NfcPlayerV2Track {
  id: string;
  title: string;
  /** Playback URL (blob after album preload). */
  audioUrl: string;
  /** Original /uploads/ path — track identity when audioUrl is a blob. */
  sourceUrl?: string;
  order: number;
}

interface NfcPlayerV2Props {
  tracks: NfcPlayerV2Track[];
  tracksLoading?: boolean;
  tracksLoadingLabel?: string;
  pcCode: string | null;
  pcCodeHidden?: boolean;
  onHidePcCode?: () => void;
  playbackError: string | null;
  onPlaybackError: (message: string | null) => void;
}

function IconEyeHide({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
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
  priority = false,
}: {
  src: string;
  rect: { left: number; top: number; width: number; height: number };
  className?: string;
  style?: React.CSSProperties;
  objectFit?: "fill" | "contain" | "cover" | "none";
  zIndex?: number;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={`pointer-events-none absolute ${className}`}
      style={{ ...nfcV2RectStyle(rect), objectFit, zIndex, ...style }}
      draggable={false}
    />
  );
}

export function NfcPlayerV2({
  tracks,
  tracksLoading = false,
  tracksLoadingLabel = "",
  pcCode,
  pcCodeHidden = false,
  onHidePcCode,
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
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const tracksRef = useRef(tracks);
  const trackIndexRef = useRef(trackIndex);
  const trackLoadingRef = useRef(false);
  const playbackIntentRef = useRef(false);
  const advancingTrackRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const androidEqTimerRef = useRef<number | null>(null);
  const cdSpinRef = useRef<HTMLDivElement>(null);

  tracksRef.current = tracks;
  trackIndexRef.current = trackIndex;

  const activeTrack = tracks[trackIndex] ?? null;
  const progressRatio = duration > 0 ? progress / duration : 0;
  const sliderRatio = knobDragRatio ?? progressRatio;
  const knobStyle = nfcV2SliderKnobStyle(sliderRatio);
  const sliderTrack = nfcV2SliderTrackMetrics();
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

  const releaseCaptureStreamGraph = useCallback(() => {
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    if (captureStreamRef.current) {
      for (const track of captureStreamRef.current.getTracks()) {
        track.stop();
      }
      captureStreamRef.current = null;
    }
    sourceRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const captureStream = (
      audio as HTMLAudioElement & { captureStream?: () => MediaStream }
    ).captureStream?.bind(audio);

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (captureStream) {
        // New src = new MediaStream; must re-capture after each track change (Android).
        releaseCaptureStreamGraph();
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        captureStreamRef.current = captureStream();
        const source = ctx.createMediaStreamSource(captureStreamRef.current);
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        setAnalyserReady(true);
      } else if (!sourceRef.current) {
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
      }
    } catch {
      /* audio without EQ */
    }

    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  }, [releaseCaptureStreamGraph]);

  const scheduleAndroidEq = useCallback(() => {
    if (!nfcPreferNativeAudioPlayback()) return;
    if (androidEqTimerRef.current) {
      window.clearTimeout(androidEqTimerRef.current);
    }
    androidEqTimerRef.current = window.setTimeout(() => {
      androidEqTimerRef.current = null;
      if (!playbackIntentRef.current) return;
      void ensureAudioGraph();
    }, 2_500);
  }, [ensureAudioGraph]);

  const playPreparedAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    lockPortraitForUserGesture();
    playbackIntentRef.current = true;
    await audio.play();
    setIsAudioPlaying(true);
    setPaused(false);

    if (!nfcPreferNativeAudioPlayback()) {
      await ensureAudioGraph();
    } else {
      scheduleAndroidEq();
    }
  }, [ensureAudioGraph, scheduleAndroidEq]);

  const prefetchNeighbors = useCallback((index: number) => {
    const list = tracksRef.current;
    const current = list[index];
    if (!current?.audioUrl || current.audioUrl.startsWith("blob:")) return;
    nfcPrefetchAdjacentStreamTracks(list, index);
  }, []);

  const loadTrack = useCallback(
    async (index: number, autoPlay: boolean) => {
      const list = tracksRef.current;
      const track = list[index];
      if (!track?.audioUrl?.trim()) {
        onPlaybackError("no_audio");
        return false;
      }

      const loadGen = loadGenerationRef.current + 1;
      loadGenerationRef.current = loadGen;

      onPlaybackError(null);
      const audio = audioRef.current;
      if (!audio) return false;

      trackLoadingRef.current = true;
      setAudioLoading(true);
      if (androidEqTimerRef.current) {
        window.clearTimeout(androidEqTimerRef.current);
        androidEqTimerRef.current = null;
      }
      if (nfcPreferNativeAudioPlayback()) {
        releaseCaptureStreamGraph();
        setAnalyserReady(false);
      }
      if (autoPlay) {
        setPaused(false);
      }

      const preferBuffered = !track.audioUrl.startsWith("blob:");

      try {
        nfcApplyAudioSource(audio, track.audioUrl, track.sourceUrl);
        if (autoPlay) {
          await nfcWaitReadyToPlay(audio, 12_000, { preferBuffered });
          if (loadGenerationRef.current !== loadGen) return false;
          await playPreparedAudio();
          if (loadGenerationRef.current !== loadGen) return false;
          prefetchNeighbors(index);
        }

        trackLoadingRef.current = false;
        setAudioLoading(false);
        return true;
      } catch {
        if (loadGenerationRef.current !== loadGen) return false;
        onPlaybackError("playback_failed");
        setIsAudioPlaying(false);
        setPaused(true);
        trackLoadingRef.current = false;
        setAudioLoading(false);
        return false;
      }
    },
    [onPlaybackError, playPreparedAudio, prefetchNeighbors, releaseCaptureStreamGraph]
  );

  const playCurrent = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const index = trackIndexRef.current;
    const track = tracksRef.current[index];
    if (!track?.audioUrl?.trim()) {
      onPlaybackError("no_audio");
      return;
    }

    trackLoadingRef.current = true;
    setAudioLoading(true);
    try {
      nfcApplyAudioSource(audio, track.audioUrl, track.sourceUrl);
      if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        await nfcWaitReadyToPlay(audio, 8_000);
      }
      await playPreparedAudio();
      onPlaybackError(null);
      prefetchNeighbors(trackIndexRef.current);
    } catch {
      onPlaybackError("playback_failed");
      setIsAudioPlaying(false);
      setPaused(true);
    } finally {
      trackLoadingRef.current = false;
      setAudioLoading(false);
    }
  }, [onPlaybackError, playPreparedAudio, prefetchNeighbors]);

  const pauseCurrent = useCallback(() => {
    playbackIntentRef.current = false;
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
    setIsAudioPlaying(false);
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
    async (nextIndex: number, flash?: "back" | "fwd", autoPlay?: boolean) => {
      const list = tracksRef.current;
      if (list.length === 0) return;
      const wrapped = (nextIndex + list.length) % list.length;
      loadGenerationRef.current += 1;
      if (flash) flashSkip(flash);
      advancingTrackRef.current = true;
      setTrackIndex(wrapped);
      setProgress(0);
      setDuration(0);
      const shouldPlay = autoPlay ?? !paused;
      await loadTrack(wrapped, shouldPlay);
      advancingTrackRef.current = false;
    },
    [flashSkip, loadTrack, paused]
  );

  const handleStop = useCallback(() => {
    if (paused) {
      void playCurrent();
      return;
    }
    pauseCurrent();
  }, [pauseCurrent, playCurrent, paused]);

  useEffect(() => {
    if (tracks.length === 0 || autoplayDone) return;
    setAutoplayDone(true);
    setTrackIndex(0);
    setPaused(true);
    setIsAudioPlaying(false);
  }, [autoplayDone, tracks.length]);

  useEffect(
    () => () => {
      if (androidEqTimerRef.current) {
        window.clearTimeout(androidEqTimerRef.current);
      }
      releaseCaptureStreamGraph();
    },
    [releaseCaptureStreamGraph]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const hrefs = [NFC_PLAYER_V2_ASSETS.gestell, NFC_PLAYER_V2_ASSETS.background];
    for (const href of hrefs) {
      if (document.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const list = tracksRef.current;
      if (list.length === 0) return;

      const dur = audio.duration;
      const t = audio.currentTime;
      if (Number.isFinite(dur) && dur > 0 && t < dur - 0.75) {
        if (playbackIntentRef.current) {
          void audio.play().catch(() => undefined);
        }
        return;
      }

      void goToTrack(trackIndexRef.current + 1, undefined, true);
    };
    const onPlay = () => {
      setIsAudioPlaying(true);
      setPaused(false);
    };
    const onPause = () => {
      if (trackLoadingRef.current || advancingTrackRef.current) return;

      const dur = audio.duration;
      const t = audio.currentTime;
      const atNaturalEnd =
        Number.isFinite(dur) && dur > 0 && t >= dur - 0.75;
      if (atNaturalEnd) {
        setIsAudioPlaying(false);
        setPaused(true);
        return;
      }

      if (nfcPreferNativeAudioPlayback() && playbackIntentRef.current) {
        void audio.play().catch(() => undefined);
        return;
      }
      setIsAudioPlaying(false);
      setPaused(true);
    };
    const recoverPlayback = () => {
      if (!playbackIntentRef.current || trackLoadingRef.current) return;
      if (audio.paused) void audio.play().catch(() => undefined);
    };
    const onPlaying = () => {
      setIsAudioPlaying(true);
      setPaused(false);
      setAudioLoading(false);
    };
    const onWaiting = () => {
      if (playbackIntentRef.current && !trackLoadingRef.current) {
        setAudioLoading(true);
      }
      recoverPlayback();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("stalled", recoverPlayback);
    audio.addEventListener("waiting", onWaiting);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("stalled", recoverPlayback);
      audio.removeEventListener("waiting", onWaiting);
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

  const applySliderRatio = useCallback(
    (t: number) => {
      const clamped = Math.min(1, Math.max(0, t));
      setKnobDragRatio(clamped);
      const audio = audioRef.current;
      const dur = audio?.duration && Number.isFinite(audio.duration) ? audio.duration : duration;
      if (!audio || !dur || dur <= 0) {
        setProgress(clamped * (dur || 0));
        return;
      }
      audio.currentTime = clamped * dur;
      setProgress(audio.currentTime);
    },
    [duration]
  );

  const seekAlongSlider = useCallback(
    (clientX: number, clientY: number) => {
      const point = pointerToArtboard(clientX, clientY);
      if (!point) return;
      applySliderRatio(nfcV2SliderRatioFromPoint(point.x, point.y));
    },
    [applySliderRatio, pointerToArtboard]
  );

  const bindSliderPointer = useCallback(
    (clientX: number, clientY: number) => {
      seekAlongSlider(clientX, clientY);
      const move = (ev: PointerEvent) => seekAlongSlider(ev.clientX, ev.clientY);
      const up = () => {
        setKnobDragRatio(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [seekAlongSlider]
  );

  const toggleFullscreen = useCallback(async () => {
    const root = viewportRef.current;
    if (!root) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        const req =
          root.requestFullscreen ??
          (root as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
        await req?.call(root);
      }
    } catch {
      /* not supported or denied */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreenActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useScreenWakeLock(fullscreenActive);

  return (
    <div
      ref={viewportRef}
      className={`fixed inset-0 z-[100] overflow-hidden bg-black text-white ${doto.className}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {audioLoading || tracksLoading ? (
        <div
          className="pointer-events-none absolute inset-0 z-[120] flex items-center justify-center bg-black/40"
          aria-live="polite"
          aria-busy="true"
        >
          <p
            className={`${rajdhani.className} text-sm font-medium uppercase tracking-[0.35em] text-white/90`}
          >
            {tracksLoading && tracksLoadingLabel ? tracksLoadingLabel : NFC_V2_LOADING_LABEL}
          </p>
        </div>
      ) : null}
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
            priority
          />

          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{ ...nfcV2RectStyle(NFC_V2_RECTS.equalizerflaeche), zIndex: NFC_V2_Z.equalizerflaeche }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NFC_PLAYER_V2_ASSETS.equalizerflaeche}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-fill"
              draggable={false}
            />
            <NfcEqVisualizer
              analyser={analyserReady ? analyserRef.current : null}
              visible
              active={isAudioPlaying && !paused}
              className="absolute inset-0 h-full w-full"
            />
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

          <div
            className="pointer-events-none absolute overflow-visible"
            style={{
              ...nfcV2TextLayerOuterStyle(NFC_V2_RECTS.textSongtitle, NFC_V2_TEXT_SONGTITLE),
              zIndex: NFC_V2_Z.textSongtitle,
            }}
          >
            <div className="overflow-hidden" style={nfcV2TextLayerInnerStyle(NFC_V2_TEXT_SONGTITLE)}>
              <NfcMarqueeTitle
                title={nfcV2DisplayTitle(activeTrack?.title)}
                className="flex h-full w-full items-center"
                style={{ color: "#000", fontSize: 22, fontWeight: 700 }}
              />
            </div>
          </div>

          <div
            className="pointer-events-none absolute overflow-visible"
            style={{
              ...nfcV2TextLayerOuterStyle(NFC_V2_RECTS.textTime, NFC_V2_TEXT_TIME),
              zIndex: NFC_V2_Z.textTime,
            }}
          >
            <p
              className={`flex h-full w-full justify-center text-center font-bold text-white ${
                NFC_V2_TEXT_TIME.align === "bottom" ? "items-end" : "items-center"
              }`}
              style={{ ...nfcV2TextLayerInnerStyle(NFC_V2_TEXT_TIME), fontSize: 20 }}
            >
              {formatPlayTime(progress)}
            </p>
          </div>

          {!pcCodeHidden && pcCode ? (
            <div
              className="absolute"
              style={{ ...nfcV2RectStyle(NFC_V2_RECTS.textDesktopcode), zIndex: NFC_V2_Z.textDesktopcode }}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-md border border-white/35 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md"
                aria-hidden
              />
              {onHidePcCode ? (
                <button
                  type="button"
                  onClick={onHidePcCode}
                  className="absolute right-1 top-1 z-20 rounded p-1 text-white/45 transition-colors hover:text-white/75 active:text-white/90"
                  aria-label="Hide computer code"
                >
                  <IconEyeHide />
                </button>
              ) : null}
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1 px-3 py-2 pt-3">
                <p
                  className={`${rajdhani.className} text-center font-medium leading-tight text-white/90`}
                  style={{ fontSize: NFC_V2_TEXT_DESKTOPCODE.labelFontSize }}
                >
                  {NFC_V2_TEXT_DESKTOPCODE.label}
                </p>
                <p
                  className="truncate text-center font-bold text-white drop-shadow-md"
                  style={{
                    fontSize: NFC_V2_TEXT_DESKTOPCODE.fontSize,
                    transform: `scale(${NFC_V2_TEXT_DESKTOPCODE.scale})`,
                    transformOrigin: "50% 50%",
                  }}
                >
                  {pcCode}
                </p>
              </div>
            </div>
          ) : null}

          {NFC_V2_SLIDER_DEBUG_LINE ? (
            <div
              className="pointer-events-none absolute"
              style={{ ...nfcV2SliderDebugLineStyle(), zIndex: NFC_V2_Z.sliderKnob + 1 }}
              aria-hidden
            />
          ) : null}

          <div
            className="absolute touch-none"
            style={{
              left: sliderTrack.startCenter.x,
              top: sliderTrack.startCenter.y - NFC_V2_SLIDER.knobHeight / 2,
              width: sliderTrack.length,
              height: NFC_V2_SLIDER.knobHeight,
              transformOrigin: "0 50%",
              transform: `rotate(${sliderTrack.angleDeg}deg)`,
              zIndex: NFC_V2_Z.sliderTrack,
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              bindSliderPointer(e.clientX, e.clientY);
            }}
            role="slider"
            aria-label="Track position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderRatio * 100)}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NFC_PLAYER_V2_ASSETS.sliderKnob}
            alt=""
            className="absolute touch-none"
            style={{
              ...knobStyle,
              zIndex: NFC_V2_Z.sliderKnob,
              touchAction: "none",
              pointerEvents: "auto",
            }}
            draggable={false}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              bindSliderPointer(e.clientX, e.clientY);
            }}
          />

          <LayerImage
            src={NFC_PLAYER_V2_ASSETS.fullScreen}
            rect={NFC_V2_RECTS.fullScreen}
            zIndex={NFC_V2_Z.fullScreen}
          />
          <button
            type="button"
            className="absolute cursor-pointer border-0 bg-transparent p-0"
            style={{
              ...nfcV2RectStyle(NFC_V2_RECTS.fullScreen),
              zIndex: NFC_V2_Z.fullScreen + 1,
              touchAction: "manipulation",
            }}
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreenActive ? "Exit fullscreen" : "Enter fullscreen"}
          />

          <button
            type="button"
            className="absolute border-0 bg-transparent p-0"
            style={{
              ...nfcV2RectStyle(NFC_V2_RECTS.skipForward),
              zIndex: NFC_V2_Z.controls,
              touchAction: "manipulation",
            }}
            onClick={() => void goToTrack(trackIndex + 1, "fwd")}
            aria-label="Next track"
          />
          <button
            type="button"
            className="absolute cursor-pointer border-0 bg-transparent p-0"
            style={{
              ...nfcV2RectStyle(NFC_V2_RECTS.stopHit),
              zIndex: NFC_V2_Z.stopControl,
              touchAction: "manipulation",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleStop();
            }}
            aria-label={paused ? "Play" : "Pause"}
          />
          <button
            type="button"
            className="absolute border-0 bg-transparent p-0"
            style={{
              ...nfcV2RectStyle(NFC_V2_RECTS.skipBack),
              zIndex: NFC_V2_Z.controls,
              touchAction: "manipulation",
            }}
            onClick={() => void goToTrack(trackIndex - 1, "back")}
            aria-label="Previous track"
          />

          {tracksLoading && tracksLoadingLabel ? (
            <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 text-center text-xs text-white/50">
              {tracksLoadingLabel}
            </p>
          ) : null}
          {playbackError ? (
            <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 text-center text-xs text-red-300">
              {playbackError}
            </p>
          ) : null}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        style={NFC_AUDIO_ELEMENT_STYLE}
        aria-hidden
      />
    </div>
  );
}
