"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Locale, Song } from "@/types/content";
import { getLocalized } from "@/lib/locale";

interface Position {
  x: number;
  y: number;
}

interface AlbumSlotSceneProps {
  songs: Song[];
  positions: Position[];
  backgroundImage?: string;
  backgroundVideo?: string;
  borderClass?: string;
  maxSlots?: number;
  hideEarthLayer?: boolean;
  variant?: "cosmos" | "nano" | "club";
  onBackgroundClick?: () => void;
  exiting?: boolean;
  onExitComplete?: () => void;
  skipIntro?: boolean;
  locale?: Locale;
}

const POLE = { x: 50, y: 26 };
const INACTIVE_SIZE = 80;
const LINE_STROKE_PX = 1.5;
const COVER_COLOR = "#C1E5F9";
const COVER_INTRO_S = 1;
const COVER_STAGGER_S = 0.01;
const LINE_OUT_S = 1;
const MOVE_TRANSITION = { duration: 2, ease: [0.4, 0, 0.2, 1] as const };
const LINE_OUT_TRANSITION = { duration: LINE_OUT_S, ease: [0.4, 0, 0.2, 1] as const };
const DRAG_CLICK_THRESHOLD_PX = 6;

const INFO_TEXT_SIZE_KEY = "reakton-info-text-size";
const INFO_TEXT_SIZE_MIN = 12;
const INFO_TEXT_SIZE_MAX = 22;
const INFO_TEXT_SIZE_STEP = 2;
const INFO_TEXT_SIZE_DEFAULT = 14;

function readStoredInfoTextSize(): number {
  try {
    const saved = localStorage.getItem(INFO_TEXT_SIZE_KEY);
    if (saved) {
      const size = Number(saved);
      if (size >= INFO_TEXT_SIZE_MIN && size <= INFO_TEXT_SIZE_MAX) return size;
    }
  } catch {
    /* ignore */
  }
  return INFO_TEXT_SIZE_DEFAULT;
}

function getYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&/]+)/,
    /[?&]v=([^?&/]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function isPlayerUiTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-player-ui]"));
}

function MotifVolumeSlider({
  value,
  onChange,
  visible,
}: {
  value: number;
  onChange: (value: number) => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      data-player-ui
      className="pointer-events-auto absolute right-4 top-1/2 z-30 flex h-36 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 px-2 py-4 backdrop-blur-[2px]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="motif-volume-slider h-28 w-5 cursor-pointer"
        aria-label="Volume"
      />
    </div>
  );
}

function clampPosition(p: Position): Position {
  return {
    x: Math.min(94, Math.max(6, p.x)),
    y: Math.min(82, Math.max(6, p.y)),
  };
}

function orbitAroundPole(count: number, center: Position, radiusX = 34, radiusY = 20): Position[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: Math.min(90, Math.max(10, center.x + radiusX * Math.cos(angle))),
      y: Math.min(68, Math.max(14, center.y + radiusY * Math.sin(angle))),
    };
  });
}

function buildNearestEdges(positions: Position[], neighborCount = 3) {
  const edgeSet = new Set<string>();
  const edges: { from: number; to: number; key: string }[] = [];

  positions.forEach((pos, i) => {
    positions
      .map((p, j) => ({ j, d: Math.hypot(p.x - pos.x, p.y - pos.y) }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, neighborCount)
      .forEach(({ j }) => {
        const from = Math.min(i, j);
        const to = Math.max(i, j);
        const key = `edge-${from}-${to}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from, to, key });
        }
      });
  });

  return edges;
}

function useActiveCoverSize() {
  const [size, setSize] = useState(480);

  useEffect(() => {
    const update = () => setSize(Math.min(520, window.innerHeight * 0.44));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

function layoutStorageKey(variant: string, count: number) {
  return `reakton-cover-layout-${variant}-${count}`;
}

function getVisualPosition(
  index: number,
  activeId: string | null,
  activeUsesLayout: boolean,
  items: { id: string }[],
  layoutPositions: Position[]
): Position {
  if (activeId === null) return layoutPositions[index] ?? POLE;

  const activeIndex = items.findIndex((s) => s.id === activeId);
  if (activeIndex >= 0 && activeUsesLayout) {
    return layoutPositions[index] ?? POLE;
  }

  if (items[index]?.id === activeId) return { ...POLE };

  const inactiveCount = items.length - 1;
  const orbit = orbitAroundPole(inactiveCount, POLE);
  let o = 0;
  for (let j = 0; j < items.length; j++) {
    if (items[j].id === activeId) continue;
    if (j === index) return orbit[o] ?? POLE;
    o++;
  }
  return layoutPositions[index] ?? POLE;
}

function snapshotVisualToLayout(
  activeId: string,
  items: { id: string }[],
  layoutPositions: Position[]
): Position[] {
  return items.map((_, index) =>
    getVisualPosition(index, activeId, false, items, layoutPositions)
  );
}

export function AlbumSlotScene({
  songs,
  positions,
  backgroundImage,
  backgroundVideo,
  borderClass = "border-white/30",
  maxSlots = 12,
  hideEarthLayer = false,
  variant = "cosmos",
  onBackgroundClick,
  exiting = false,
  onExitComplete,
  skipIntro = false,
  locale = "de",
}: AlbumSlotSceneProps) {
  const t = useTranslations("world");
  const items = songs.slice(0, maxSlots);
  const defaultLayout = useMemo(
    () => positions.slice(0, items.length),
    [positions, items.length]
  );
  const activeCoverSize = useActiveCoverSize();
  const sceneRef = useRef<HTMLDivElement>(null);
  const layoutPositionsRef = useRef<Position[]>([]);
  const dragRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const [layoutPositions, setLayoutPositions] = useState<Position[]>(defaultLayout);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragLivePos, setDragLivePos] = useState<Position | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [showVolume, setShowVolume] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [earthOk, setEarthOk] = useState(Boolean(backgroundImage));
  const [earthSrc, setEarthSrc] = useState(
    () => backgroundImage || "/worlds/earth-night.svg"
  );
  const [showLines, setShowLines] = useState(skipIntro);
  const [linesDrawn, setLinesDrawn] = useState(skipIntro);
  const [introDone, setIntroDone] = useState(skipIntro);
  const [exitStep, setExitStep] = useState<"lines" | "covers" | null>(null);
  const [activeUsesLayout, setActiveUsesLayout] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoTextSize, setInfoTextSize] = useState(INFO_TEXT_SIZE_DEFAULT);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.7);
  const slotVideoRef = useRef<HTMLVideoElement | null>(null);
  const exitStartedRef = useRef(false);

  useEffect(() => {
    setInfoTextSize(readStoredInfoTextSize());
  }, []);

  const adjustInfoTextSize = useCallback((delta: number) => {
    setInfoTextSize((prev) => {
      const next = Math.min(
        INFO_TEXT_SIZE_MAX,
        Math.max(INFO_TEXT_SIZE_MIN, prev + delta)
      );
      try {
        localStorage.setItem(INFO_TEXT_SIZE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const commitLayoutPositions = useCallback((next: Position[]) => {
    layoutPositionsRef.current = next;
    setLayoutPositions(next);
  }, []);

  useEffect(() => {
    layoutPositionsRef.current = layoutPositions;
  }, [layoutPositions]);

  const activeSong = items.find((s) => s.id === activeId) ?? null;
  const activeInfoText = activeSong ? getLocalized(activeSong.infoText, locale) : "";
  const isPoleMode = activeId !== null;
  const isCloud = variant === "nano" || variant === "club";
  const usePoleLines = variant === "cosmos";

  useEffect(() => {
    const key = layoutStorageKey(variant, items.length);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as Position[];
        if (Array.isArray(parsed) && parsed.length === items.length) {
          const loaded = parsed.map(clampPosition);
          layoutPositionsRef.current = loaded;
          setLayoutPositions(loaded);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    layoutPositionsRef.current = defaultLayout;
    setLayoutPositions(defaultLayout);
  }, [defaultLayout, items.length, variant]);

  const persistLayout = useCallback(
    (next: Position[]) => {
      try {
        localStorage.setItem(layoutStorageKey(variant, items.length), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [items.length, variant]
  );

  const displayPositions = useMemo(() => {
    if (activeId === null) return layoutPositions;

    const activeIndex = items.findIndex((s) => s.id === activeId);
    if (activeIndex >= 0 && activeUsesLayout) {
      return layoutPositions;
    }

    const inactiveCount = items.length - 1;
    const orbit = orbitAroundPole(inactiveCount, POLE);
    let o = 0;
    return items.map((song) => {
      if (song.id === activeId) return POLE;
      return orbit[o++] ?? POLE;
    });
  }, [activeId, activeUsesLayout, items, layoutPositions]);

  const coverEdges = useMemo(() => {
    const edgePositions =
      activeId !== null && !activeUsesLayout ? displayPositions : layoutPositions;
    return buildNearestEdges(edgePositions, 3);
  }, [activeId, activeUsesLayout, displayPositions, layoutPositions]);

  const introEndMs = useMemo(
    () => (COVER_INTRO_S + (items.length - 1) * COVER_STAGGER_S) * 1000,
    [items.length]
  );

  const coverOutEndMs = useMemo(
    () => (COVER_INTRO_S + (items.length - 1) * COVER_STAGGER_S) * 1000,
    [items.length]
  );

  const pointToPercent = useCallback((clientX: number, clientY: number): Position => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return clampPosition({
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const handleVolumeChange = useCallback((next: number) => {
    volumeRef.current = next;
    setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  }, []);

  const openYoutube = useCallback(
    (url: string) => {
      stopAudio();
      slotVideoRef.current?.pause();
      setYoutubeUrl(url.trim());
    },
    [stopAudio]
  );

  useEffect(() => {
    if (!exiting) {
      exitStartedRef.current = false;
      return;
    }
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    stopAudio();
    setExitStep("lines");

    const linesTimer = window.setTimeout(() => {
      setExitStep("covers");
    }, LINE_OUT_S * 1000);

    const doneTimer = window.setTimeout(() => {
      onExitComplete?.();
    }, LINE_OUT_S * 1000 + coverOutEndMs);

    return () => {
      window.clearTimeout(linesTimer);
      window.clearTimeout(doneTimer);
    };
  }, [coverOutEndMs, exiting, onExitComplete, stopAudio]);

  useEffect(() => {
    if (skipIntro) {
      setShowLines(true);
      setLinesDrawn(true);
      setIntroDone(true);
      if (!exiting) setExitStep(null);
      return;
    }
    setShowLines(false);
    setLinesDrawn(false);
    setIntroDone(false);
    if (!exiting) setExitStep(null);
    const linesTimer = window.setTimeout(() => setShowLines(true), introEndMs);
    const doneTimer = window.setTimeout(() => setIntroDone(true), introEndMs + 400);
    return () => {
      window.clearTimeout(linesTimer);
      window.clearTimeout(doneTimer);
    };
  }, [exiting, introEndMs, skipIntro]);

  useEffect(() => {
    if (!showLines) {
      setLinesDrawn(false);
      return;
    }
    setLinesDrawn(false);
    const frame = window.requestAnimationFrame(() => setLinesDrawn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [showLines]);

  const startAudio = useCallback((song: Song) => {
    if (!song.audioSnippet) return;
    const audio = new Audio(song.audioSnippet);
    audio.loop = true;
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    audio.play().catch(() => undefined);
  }, []);

  const handleSelect = useCallback(
    (song: Song) => {
      if (!introDone || exiting) return;
      if (activeId === song.id) return;

      stopAudio();
      setActiveUsesLayout(false);
      setActiveId(song.id);
      setInfoPanelOpen(false);
      startAudio(song);
    },
    [activeId, exiting, introDone, startAudio, stopAudio]
  );

  const handleBackToDefault = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    stopAudio();
    setDragLivePos(null);
    setDraggingIndex(null);
    dragRef.current = null;
    setActiveUsesLayout(false);
    setActiveId(null);
    setInfoPanelOpen(false);
  }, [stopAudio]);

  const handleCoverPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (!introDone || exiting) return;
      if (isPlayerUiTarget(e.target)) return;

      dragRef.current = {
        index,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [exiting, introDone]
  );

  const handleCoverPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_CLICK_THRESHOLD_PX) return;

      if (!drag.moved) {
        drag.moved = true;
        const activeIndex = items.findIndex((s) => s.id === activeId);
        if (activeIndex === drag.index && activeId && !activeUsesLayout) {
          const snapshot = snapshotVisualToLayout(
            activeId,
            items,
            layoutPositionsRef.current
          );
          commitLayoutPositions(snapshot);
          setActiveUsesLayout(true);
        }
        const startPos = layoutPositionsRef.current[drag.index] ?? POLE;
        setDragLivePos(startPos);
        setDraggingIndex(drag.index);
      }

      const next = pointToPercent(e.clientX, e.clientY);
      setDragLivePos(next);
      const positions = layoutPositionsRef.current.map((p, i) =>
        i === drag.index ? next : p
      );
      commitLayoutPositions(positions);
    },
    [activeId, activeUsesLayout, commitLayoutPositions, items, pointToPercent]
  );

  const handleCoverPointerUp = useCallback(
    (song: Song, e: React.PointerEvent) => {
      if (isPlayerUiTarget(e.target)) {
        dragRef.current = null;
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (drag.moved) {
        const final = pointToPercent(e.clientX, e.clientY);
        const next = layoutPositionsRef.current.map((p, i) =>
          i === drag.index ? final : p
        );
        commitLayoutPositions(next);
        persistLayout(next);

        const activeIndex = items.findIndex((s) => s.id === activeId);
        if (activeIndex === drag.index) {
          setActiveUsesLayout(true);
        }
      } else {
        handleSelect(song);
      }

      dragRef.current = null;
      setDragLivePos(null);
      setDraggingIndex(null);
    },
    [
      activeId,
      commitLayoutPositions,
      handleSelect,
      items,
      persistLayout,
      pointToPercent,
    ]
  );

  useEffect(() => {
    setInfoPanelOpen(false);
  }, [activeId]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  useEffect(() => {
    setEarthOk(Boolean(backgroundImage));
    setEarthSrc(backgroundImage || "/worlds/earth-night.svg");
  }, [backgroundImage]);

  const handleEarthError = useCallback(() => {
    const fallbacks = ["/worlds/Erde.jpg", "/worlds/earth-night.jpg", "/worlds/earth-night.svg"];
    const idx = fallbacks.indexOf(earthSrc);
    const next = fallbacks[idx + 1];
    if (next) {
      setEarthSrc(next);
      return;
    }
    setEarthOk(false);
  }, [earthSrc]);

  useEffect(() => {
    if (activeSong?.videoSnippet && slotVideoRef.current) {
      slotVideoRef.current.play().catch(() => undefined);
    }
  }, [activeSong]);

  const coverTransition = (index: number) => {
    if (draggingIndex !== null) {
      return { duration: 0 };
    }

    if (exitStep === "covers") {
      return {
        left: { duration: 0 },
        top: { duration: 0 },
        width: { duration: 0 },
        height: { duration: 0 },
        x: { duration: 0 },
        y: { duration: 0 },
        scale: {
          duration: COVER_INTRO_S,
          delay: index * COVER_STAGGER_S,
          ease: [0.25, 0.1, 0.25, 1] as const,
        },
        opacity: { duration: 0.35, delay: index * COVER_STAGGER_S },
      };
    }

    if (exitStep === "lines") {
      return {
        left: { duration: 0 },
        top: { duration: 0 },
        width: { duration: 0 },
        height: { duration: 0 },
        x: { duration: 0 },
        y: { duration: 0 },
        scale: { duration: 0 },
        opacity: { duration: 0 },
      };
    }

    return {
      left: MOVE_TRANSITION,
      top: MOVE_TRANSITION,
      width: MOVE_TRANSITION,
      height: MOVE_TRANSITION,
      x: MOVE_TRANSITION,
      y: MOVE_TRANSITION,
      scale: introDone
        ? { duration: 0 }
        : { duration: COVER_INTRO_S, delay: index * COVER_STAGGER_S, ease: [0.25, 0.1, 0.25, 1] as const },
      opacity: introDone
        ? { duration: 0 }
        : { duration: 0.35, delay: index * COVER_STAGGER_S },
    };
  };

  const linesExpanded = linesDrawn && exitStep !== "lines" && exitStep !== "covers";
  const showLineGraphics = (showLines && !exitStep) || exitStep === "lines";

  return (
    <motion.div
      ref={sceneRef}
      className="album-slot-scene relative -mx-4 mt-4 h-[calc(100vh-12rem)] min-h-[480px] overflow-visible md:-mx-0 md:h-[calc(100vh-11rem)]"
      onClick={() => onBackgroundClick?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onBackgroundClick?.();
      }}
      role={onBackgroundClick ? "button" : undefined}
      tabIndex={onBackgroundClick ? 0 : undefined}
    >
      {!hideEarthLayer &&
        (backgroundVideo ? (
          <video
            className="earth-layer pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[42vh] w-full object-cover object-bottom"
            src={backgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
          />
        ) : earthOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={earthSrc}
            alt=""
            className="earth-layer pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[42vh] w-full object-cover object-bottom"
            onError={handleEarthError}
            aria-hidden
          />
        ) : (
          <motion.div className="earth-horizon-full earth-layer pointer-events-none absolute bottom-0 left-0 right-0 z-[1]" aria-hidden />
        ))}

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-[8] h-full w-full overflow-visible"
        aria-hidden
      >
        {showLineGraphics &&
          coverEdges.map(({ key, from, to }) => {
            const a = displayPositions[from] ?? layoutPositions[from];
            const b = displayPositions[to] ?? layoutPositions[to];
            if (!a || !b) return null;

            return (
              <motion.line
                key={key}
                stroke="rgba(255, 255, 255, 0.65)"
                strokeWidth={LINE_STROKE_PX}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                initial={{ x2: a.x, y2: a.y, opacity: 0 }}
                animate={{
                  x1: a.x,
                  y1: a.y,
                  x2: linesExpanded ? b.x : a.x,
                  y2: linesExpanded ? b.y : a.y,
                  opacity: 1,
                }}
                transition={{
                  x1: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  y1: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  x2: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  y2: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  opacity: { duration: 0.35, ease: "easeOut" },
                }}
              />
            );
          })}
        {showLineGraphics &&
          usePoleLines &&
          layoutPositions.map((pos, i) => {
            const target = displayPositions[i] ?? pos;
            return (
              <motion.line
                key={`pole-${i}`}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth={LINE_STROKE_PX}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                initial={{ x2: POLE.x, y2: POLE.y, opacity: 0 }}
                animate={{
                  x1: POLE.x,
                  y1: POLE.y,
                  x2: linesExpanded ? target.x : POLE.x,
                  y2: linesExpanded ? target.y : POLE.y,
                  opacity: 1,
                }}
                transition={{
                  x1: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  y1: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  x2: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  y2: exitStep === "lines" ? LINE_OUT_TRANSITION : draggingIndex !== null ? { duration: 0 } : MOVE_TRANSITION,
                  opacity: { duration: 0.35, delay: i * 0.02, ease: "easeOut" },
                }}
              />
            );
          })}
      </svg>

      {introDone && !exiting && !isPoleMode && (
        <p className="pointer-events-none absolute left-0 top-0 z-[9] text-[18px] uppercase tracking-widest text-white/35">
          {t("dragCovers")}
        </p>
      )}

      {items.map((song, i) => {
        const pos =
          draggingIndex === i && dragLivePos
            ? dragLivePos
            : displayPositions[i] ?? layoutPositions[i];
        const isActive = activeId === song.id;
        const targetSize = isActive ? activeCoverSize : INACTIVE_SIZE;
        const isDragging = draggingIndex === i;
        const driftClass =
          introDone && !isPoleMode && !exiting && isCloud && !isDragging
            ? `cover-cloud-drift cover-cloud-drift--${(i % 3) + 1}`
            : introDone && !isPoleMode && !exiting && !isCloud && !isDragging
              ? `cover-slot-drift cover-slot-drift--${(i % 4) + 1}`
              : "";

        return (
          <motion.button
            key={song.id}
            type="button"
            aria-disabled={!introDone || exiting}
            onPointerDown={(e) => handleCoverPointerDown(i, e)}
            onPointerMove={handleCoverPointerMove}
            onPointerUp={(e) => handleCoverPointerUp(song, e)}
            onPointerCancel={(e) => handleCoverPointerUp(song, e)}
            className={`album-cover-slot absolute overflow-hidden rounded-sm border focus:outline-none focus:ring-2 focus:ring-white/40 ${borderClass} ${
              isActive ? "border-white/40 shadow-lg" : "shadow-md shadow-black/50"
            } ${introDone && !exiting ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${
              isDragging ? "z-50 cursor-grabbing" : isActive ? "z-40" : "z-10"
            }`}
            style={{
              backgroundColor:
                song.coverImage && !song.coverImage.includes("placeholder")
                  ? "#080c12"
                  : COVER_COLOR,
            }}
            initial={{ left: `${pos.x}%`, top: `${pos.y}%`, width: INACTIVE_SIZE, height: INACTIVE_SIZE, x: "-50%", y: "-50%", scale: 0, opacity: 0 }}
            animate={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: targetSize,
              height: targetSize,
              x: "-50%",
              y: "-50%",
              scale: exitStep === "covers" ? 0 : 1,
              opacity: exitStep === "covers" ? 0 : 1,
            }}
            transition={coverTransition(i)}
            aria-label={song.title}
            aria-pressed={isActive}
          >
            {isPoleMode && isActive && !exiting && !infoPanelOpen && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleBackToDefault}
                className="absolute left-1.5 top-1.5 z-50 flex h-14 w-14 items-center justify-center rounded-sm bg-black/50 text-2xl text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
                aria-label={t("backToGrid")}
              >
                ←
              </button>
            )}

            <motion.div
              className="relative h-full w-full"
              onMouseEnter={() => isActive && setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div className={`cover-slot-media ${driftClass}`}>
                  {isActive && activeSong?.videoSnippet ? (
                    <video
                      ref={slotVideoRef}
                      src={activeSong.videoSnippet}
                      className="h-full w-full object-cover"
                      autoPlay
                      loop
                      playsInline
                      muted={!!activeSong.audioSnippet}
                    />
                  ) : (
                    <Image
                      src={song.coverImage || "/covers/placeholder.svg"}
                      alt={song.title}
                      fill
                      className="object-cover"
                      sizes={isActive ? "520px" : "80px"}
                      priority={isActive}
                      draggable={false}
                    />
                  )}
                </div>
              </div>
              {!isActive && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5 text-[14px] uppercase tracking-wider text-white/85">
                  {song.title}
                </span>
              )}

              {isActive && activeSong && !exiting && (
                <>
                  {!infoPanelOpen && (
                    <button
                      type="button"
                      data-player-ui
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoPanelOpen(true);
                      }}
                      className="cover-info-btn absolute right-2 top-2 z-50"
                      aria-label={t("songInfo")}
                    >
                      <span className="cover-info-btn__glyph">i</span>
                    </button>
                  )}

                  <AnimatePresence>
                    {infoPanelOpen && (
                      <motion.div
                        key="cover-info-panel"
                        data-player-ui
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                        className="cover-info-panel absolute inset-0 z-[45] flex flex-col"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="cover-info-panel__toolbar flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustInfoTextSize(-INFO_TEXT_SIZE_STEP);
                              }}
                              disabled={infoTextSize <= INFO_TEXT_SIZE_MIN}
                              className="cover-info-size-btn"
                              aria-label={t("textSizeDecrease")}
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustInfoTextSize(INFO_TEXT_SIZE_STEP);
                              }}
                              disabled={infoTextSize >= INFO_TEXT_SIZE_MAX}
                              className="cover-info-size-btn"
                              aria-label={t("textSizeIncrease")}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoPanelOpen(false);
                            }}
                            className="cover-info-panel__close px-2 py-1 text-[11px] uppercase tracking-[0.25em] text-black/55 transition hover:text-black"
                          >
                            {t("closeInfo")}
                          </button>
                        </div>
                        <div
                          className="cover-info-panel__body flex-1 overflow-y-auto px-5 pb-5 pt-1 leading-relaxed text-black/88"
                          style={{ fontSize: `${infoTextSize}px` }}
                        >
                          {activeInfoText ? (
                            <p className="whitespace-pre-wrap">{activeInfoText}</p>
                          ) : (
                            <p className="text-black/45">{t("noSongInfo")}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <MotifVolumeSlider
                    value={volume}
                    onChange={handleVolumeChange}
                    visible={showVolume && Boolean(activeSong.audioSnippet)}
                  />
                  <motion.div
                    data-player-ui
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.15 }}
                    className="absolute inset-x-0 bottom-0 z-20"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="motif-bottom-bar bg-black/28 px-4 py-2.5 backdrop-blur-sm">
                      {activeSong.videoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openYoutube(activeSong.videoUrl!);
                          }}
                          className="block w-full text-center text-sm uppercase tracking-[0.35em] text-white/85 underline decoration-white/50 underline-offset-4 transition hover:text-white"
                        >
                          {t("watchVideo")}
                        </button>
                      )}
                      <p className="mt-1 text-center text-xl lowercase tracking-[0.2em] text-white">
                        {activeSong.title}
                      </p>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.button>
        );
      })}

      <AnimatePresence>
        {youtubeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal
          >
            <button
              type="button"
              onClick={() => setYoutubeUrl(null)}
              className="absolute right-4 top-28 text-2xl uppercase tracking-widest text-white/70"
            >
              {t("closeVideo")}
            </button>
            <motion.div className="aspect-video w-full max-w-4xl">
              {getYouTubeId(youtubeUrl) ? (
                <iframe
                  title="Video"
                  src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(youtubeUrl)}?autoplay=1&rel=0`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <p className="text-center text-white/60">Ungültiger YouTube-Link</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
