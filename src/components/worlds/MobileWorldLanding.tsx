"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Locale, World, WorldAtmosphere } from "@/types/content";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import { getLocalized } from "@/lib/locale";

const COLUMN_EXIT_S = 2;
const MOBILE_RETURN_SLIDE_S = 1;
const MOBILE_RETURN_BG_DELAY_S = 0.5;
const COLUMN_STAGGER_S = 0.01;
const COLUMN_EASE = [0.4, 0, 0.2, 1] as const;
const CAPTION_DECODE_MS = 720;
const EARTH_TRANSITION = { duration: COLUMN_EXIT_S, ease: COLUMN_EASE };
const OVERLAY_EXIT_S = 0.45;
const MOBILE_MEDIA = "(max-width: 767px)";
const MOBILE_WORLD_ORDER: WorldAtmosphere[] = ["cosmos", "nano", "club"];

function columnCopyTone(atmosphere: WorldAtmosphere) {
  if (atmosphere === "nano") {
    return {
      title: "text-white",
      scrim: "from-black/55 via-black/20 to-black/55",
      titleStyle: { color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.9)" } as const,
    };
  }
  if (atmosphere === "club") {
    return {
      title: "text-white",
      scrim: "from-black/60 via-black/25 to-black/60",
      titleStyle: { color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.9)" } as const,
    };
  }
  return {
    title: "text-white",
    scrim: "from-black/50 via-black/15 to-black/50",
    titleStyle: { color: "#ffffff", textShadow: "0 2px 14px rgba(0,0,0,0.85)" } as const,
  };
}

function atmosphereFallbackBg(atmosphere: WorldAtmosphere): string {
  if (atmosphere === "nano") return "#1a2430";
  if (atmosphere === "club") return "#1a0808";
  return "#0a1628";
}

function panelGeometry(displayIndex: number, panelCount: number) {
  const heightPct = 100 / panelCount;
  const topPct = (displayIndex * 100) / panelCount;
  return {
    top: `${topPct}%`,
    height: `${heightPct}%`,
  };
}

function bgOffscreenY(displayIndex: number, pivotDisplay: number) {
  if (displayIndex === pivotDisplay) return 0;
  return displayIndex < pivotDisplay ? "-100%" : "100%";
}

function mobileSlideY(
  displayIndex: number,
  pivotDisplay: number | null,
  isEntering: boolean,
  isColumnReturning: boolean
): string | number {
  if (isColumnReturning) {
    return 0;
  }
  if (isEntering && pivotDisplay !== null) {
    return bgOffscreenY(displayIndex, pivotDisplay);
  }
  return 0;
}

function mobileSlideDelay(
  displayIndex: number,
  pivotDisplay: number | null,
  isEntering: boolean,
  isColumnReturning: boolean,
  worldCount: number,
  returnAtmosphere: WorldAtmosphere | null
): number {
  if (isColumnReturning) {
    if (returnAtmosphere === "cosmos" && displayIndex === 0) {
      return 0;
    }
    return (worldCount - 1 - displayIndex) * COLUMN_STAGGER_S;
  }
  if (!isEntering || pivotDisplay === null) return 0;
  if (displayIndex === pivotDisplay) return 0;
  if (displayIndex < pivotDisplay) {
    return (pivotDisplay - 1 - displayIndex) * COLUMN_STAGGER_S;
  }
  return (displayIndex - pivotDisplay - 1) * COLUMN_STAGGER_S;
}

function mobileDisplayIndex(atmosphere: WorldAtmosphere): number {
  return MOBILE_WORLD_ORDER.indexOf(atmosphere);
}

function pivotDisplayIndex(
  worlds: World[],
  selectedIndex: number | null,
  returnFromIndex: number | null,
  isColumnReturning: boolean
): number | null {
  const dataIndex = isColumnReturning ? returnFromIndex : selectedIndex;
  if (dataIndex === null) return null;
  const world = worlds[dataIndex];
  if (!world) return null;
  const slot = mobileDisplayIndex(world.atmosphere);
  return slot >= 0 ? slot : null;
}

function mobileBgObjectPosition(
  atmosphere: WorldAtmosphere,
  worldViewHold: boolean
): string {
  if (!worldViewHold) return "center center";
  if (atmosphere === "cosmos") return "center 42%";
  if (atmosphere === "club") return "center 58%";
  return "center center";
}

function sortWorldsForMobile(worlds: World[]): World[] {
  return [...worlds].sort(
    (a, b) =>
      MOBILE_WORLD_ORDER.indexOf(a.atmosphere) - MOBILE_WORLD_ORDER.indexOf(b.atmosphere)
  );
}

function ColumnBgImage({
  desktopSrc,
  mobileSrc,
  onError,
  objectPosition = "center center",
  objectPositionTransition,
}: {
  desktopSrc: string;
  mobileSrc: string;
  onError?: () => void;
  objectPosition?: string;
  objectPositionTransition?: { duration: number; ease: [number, number, number, number] };
}) {
  const [src, setSrc] = useState(desktopSrc);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA);
    const pickSrc = () => {
      if (!media.matches || !mobileSrc || mobileSrc === desktopSrc) {
        setSrc(desktopSrc);
        return;
      }
      setSrc(mobileSrc);
    };
    pickSrc();
    media.addEventListener("change", pickSrc);
    return () => media.removeEventListener("change", pickSrc);
  }, [desktopSrc, mobileSrc]);

  const handleError = () => {
    if (src !== desktopSrc) {
      setSrc(desktopSrc);
      return;
    }
    onError?.();
  };

  return (
    <motion.img
      src={src}
      alt=""
      className="absolute inset-0 block h-full w-full object-cover"
      initial={false}
      animate={{ objectPosition }}
      transition={
        objectPositionTransition
          ? { objectPosition: objectPositionTransition }
          : { duration: 0 }
      }
      onError={handleError}
    />
  );
}

function PanelBgLayers({
  world,
  tone,
  bg,
  showWorld,
  isColumnReturning,
  isPivot,
  returnBgExpandHold,
  scrimOpacity,
}: {
  world: World;
  tone: ReturnType<typeof columnCopyTone>;
  bg: { desktop: string; mobile: string; onError?: () => void };
  showWorld: boolean;
  isColumnReturning: boolean;
  isPivot: boolean;
  returnBgExpandHold: boolean;
  scrimOpacity: number;
}) {
  const hideOverlays = showWorld || isColumnReturning;
  const bgRepositionActive =
    isPivot &&
    isColumnReturning &&
    returnBgExpandHold &&
    (world.atmosphere === "cosmos" || world.atmosphere === "club");
  const objectPosition = mobileBgObjectPosition(world.atmosphere, bgRepositionActive);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ColumnBgImage
          desktopSrc={bg.desktop}
          mobileSrc={bg.mobile}
          onError={bg.onError}
          objectPosition={objectPosition}
          objectPositionTransition={
            isColumnReturning && isPivot && world.atmosphere !== "nano"
              ? { duration: MOBILE_RETURN_BG_DELAY_S, ease: [...COLUMN_EASE] as [number, number, number, number] }
              : undefined
          }
        />
        <motion.div
          className={`landing-column-overlay landing-column-overlay--${world.atmosphere} absolute inset-0`}
          initial={false}
          animate={{ opacity: hideOverlays ? 0 : 1 }}
          transition={{
            opacity: hideOverlays
              ? { duration: OVERLAY_EXIT_S, ease: COLUMN_EASE }
              : EARTH_TRANSITION,
          }}
          aria-hidden
        />
      </div>
      {!hideOverlays && (
        <motion.div
          className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b ${tone.scrim}`}
          initial={false}
          animate={{ opacity: scrimOpacity }}
          transition={{ opacity: EARTH_TRANSITION }}
          aria-hidden
        />
      )}
    </>
  );
}

export function MobileWorldLanding({
  worlds,
  locale,
  columnClass,
  selectedIndex,
  isEntering,
  isImmersed,
  isColumnReturning,
  returnFromIndex,
  returnBgExpandHold,
  returnAtmosphere,
  showWorld,
  landingCaptionMode,
  captionDecodeMode,
  lockedHintLabel,
  enterWorldLabel,
  scrimOpacity,
  bgSourcesForWorld,
  onWorldClick,
  onCaptionDecodeComplete,
}: {
  worlds: World[];
  locale: Locale;
  columnClass: Record<World["color"], string>;
  selectedIndex: number | null;
  isEntering: boolean;
  isImmersed: boolean;
  isColumnReturning: boolean;
  returnFromIndex: number | null;
  returnBgExpandHold: boolean;
  returnAtmosphere: WorldAtmosphere | null;
  showWorld: boolean;
  landingCaptionMode: DecodeMode | "hidden";
  captionDecodeMode: DecodeMode;
  lockedHintLabel: string;
  enterWorldLabel: string;
  scrimOpacity: number;
  bgSourcesForWorld: (world: World) => { desktop: string; mobile: string; onError?: () => void };
  onWorldClick: (world: World, index: number) => void;
  onCaptionDecodeComplete: () => void;
}) {
  const isAnimating = isEntering || isColumnReturning;
  const landingVisible = !showWorld;
  const panelCount = worlds.length;
  const mobileWorlds = sortWorldsForMobile(worlds);
  const pivotSlot = pivotDisplayIndex(
    worlds,
    selectedIndex,
    returnFromIndex,
    isColumnReturning
  );
  const returnPivotSlot = pivotDisplayIndex(worlds, null, returnFromIndex, true);
  const fullBleedBg = isImmersed || isColumnReturning;

  if (!landingVisible && !isColumnReturning && selectedIndex === null) return null;

  const stackTop = fullBleedBg
    ? "0px"
    : "calc(5.5rem + env(safe-area-inset-top))";
  const stackOverflow = isAnimating ? "overflow-visible" : "overflow-hidden";

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[15] md:hidden"
      initial={false}
      animate={{ top: stackTop }}
      transition={EARTH_TRANSITION}
      aria-hidden={showWorld}
      style={{ isolation: "isolate" }}
    >
      <div className={`relative h-full ${stackOverflow}`}>
        {mobileWorlds.map((world, displayIndex) => {
          const index = worlds.findIndex((w) => w.id === world.id);
          if (index < 0) return null;

          const tone = columnCopyTone(world.atmosphere);
          const bg = bgSourcesForWorld(world);
          const pivotDataIndex = isColumnReturning ? returnFromIndex : selectedIndex;
          const isPivot = pivotDataIndex !== null && index === pivotDataIndex;
          const pivotDisplay = pivotSlot ?? returnPivotSlot ?? displayIndex;
          const parkedOffscreen = !isPivot && showWorld;
          const offscreenTop =
            displayIndex < pivotDisplay
              ? `-${100 / panelCount}%`
              : "100%";
          const fillsViewport =
            isPivot && (isEntering || isImmersed || showWorld);
          const resting = panelGeometry(displayIndex, panelCount);
          const slideY = mobileSlideY(
            displayIndex,
            pivotSlot,
            isEntering,
            isColumnReturning
          );
          const delay = mobileSlideDelay(
            displayIndex,
            pivotSlot,
            isEntering,
            isColumnReturning,
            panelCount,
            returnAtmosphere
          );
          const slideOffscreen = isAnimating && !isPivot && !isColumnReturning;
          const returnSlideS = isColumnReturning ? MOBILE_RETURN_SLIDE_S : COLUMN_EXIT_S;
          const geometryTransition =
            isEntering || isColumnReturning
              ? {
                  duration: isColumnReturning ? MOBILE_RETURN_SLIDE_S : COLUMN_EXIT_S,
                  ease: COLUMN_EASE,
                  type: "tween" as const,
                }
              : { duration: 0 };
          const animateTop = fillsViewport
            ? "0%"
            : parkedOffscreen
              ? offscreenTop
              : resting.top;
          const animateY = slideOffscreen ? slideY : 0;
          const animateOpacity = parkedOffscreen ? 0 : 1;
          const keepPivotOnTop =
            isPivot && (fillsViewport || isEntering || isColumnReturning);
          const panelZIndex = keepPivotOnTop ? panelCount + 1 : displayIndex + 1;
          const panelOverflow = isAnimating ? "overflow-visible" : "overflow-hidden";

          return (
            <motion.div
              key={world.id}
              layout={false}
              className={`absolute inset-x-0 ${panelOverflow}`}
              style={{
                position: "absolute",
                backgroundColor: atmosphereFallbackBg(world.atmosphere),
                zIndex: panelZIndex,
                pointerEvents: parkedOffscreen ? "none" : undefined,
                willChange: isAnimating ? "transform, top, height" : undefined,
              }}
              initial={false}
              animate={{
                top: animateTop,
                height: fillsViewport ? "100%" : resting.height,
                y: animateY,
                opacity: animateOpacity,
              }}
              transition={{
                top: geometryTransition,
                height: geometryTransition,
                y: isAnimating
                  ? { duration: returnSlideS, delay, ease: COLUMN_EASE }
                  : { duration: 0 },
                opacity: isColumnReturning
                  ? { duration: 0.2, ease: COLUMN_EASE }
                  : { duration: 0 },
              }}
            >
              <PanelBgLayers
                world={world}
                tone={tone}
                bg={bg}
                showWorld={showWorld}
                isColumnReturning={isColumnReturning}
                isPivot={isPivot}
                returnBgExpandHold={returnBgExpandHold}
                scrimOpacity={scrimOpacity}
              />
            </motion.div>
          );
        })}
      </div>

      {!showWorld && landingCaptionMode !== "hidden" && (
        <div className="pointer-events-none absolute inset-0 z-[25] grid grid-rows-3">
          {mobileWorlds.map((world) => {
            const tone = columnCopyTone(world.atmosphere);
            const locked = world.locked;
            return (
              <div
                key={`caption-${world.id}`}
                className={`relative flex min-h-0 flex-col items-center justify-center px-4 text-center ${columnClass[world.color]}`}
              >
                <DecodeText
                  as="h2"
                  text={getLocalized(world.albumTitle, locale)}
                  mode={captionDecodeMode}
                  className={`text-2xl font-light leading-snug tracking-wide ${tone.title}`}
                  style={tone.titleStyle}
                  duration={CAPTION_DECODE_MS}
                  onComplete={() => {
                    if (captionDecodeMode === "in") onCaptionDecodeComplete();
                  }}
                />
                {locked && (
                  <p className="mt-2 text-xs uppercase tracking-widest text-white/40">
                    {lockedHintLabel}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showWorld && landingCaptionMode !== "out" && (
        <div className="pointer-events-auto absolute inset-0 z-[30] grid grid-rows-3">
          {mobileWorlds.map((world) => {
            const index = worlds.findIndex((w) => w.id === world.id);
            if (index < 0) return null;
            return (
              <button
                key={`hit-${world.id}`}
                type="button"
                disabled={world.locked}
                onClick={() => onWorldClick(world, index)}
                className={`border-0 bg-transparent ${
                  world.locked ? "cursor-not-allowed" : "cursor-pointer"
                }`}
                aria-label={`${getLocalized(world.albumTitle, locale)} — ${enterWorldLabel}`}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
