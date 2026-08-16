"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { Locale, World, WorldAtmosphere } from "@/types/content";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import { getLocalized } from "@/lib/locale";
import {
  MOBILE_OVERLAY_FADE_S,
  MOBILE_RETURN_LABEL_IN_MS,
  MOBILE_RETURN_OVERLAY_FADE_S,
  MOBILE_RETURN_REVEAL_MS,
  MOBILE_RETURN_SLIDE_S,
} from "@/lib/mobile-world-timing";
import {
  GPU_COMPOSIT_LAYER,
  mobileBgOverscanTransform,
} from "@/lib/mobile-compositor";

const COLUMN_EXIT_S = 2;
const COLUMN_STAGGER_S = 0.01;
const COLUMN_EASE = [0.4, 0, 0.2, 1] as const;
const CAPTION_DECODE_MS = 720;
const OVERLAY_EXIT_S = MOBILE_OVERLAY_FADE_S;
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

/** Cosmos landing row: shift visible motif 30 % upward within the panel strip. */
const MOBILE_COSMOS_LANDING_SHIFT = "30%";

/** Same BG crop for cosmos whenever the panel is visible (landing, enter, world view, return). */
function cosmosUsesLandingRowBgShift(
  atmosphere: WorldAtmosphere,
  parkedOffscreen: boolean
): boolean {
  return atmosphere === "cosmos" && !parkedOffscreen;
}

function cosmosLandingBgStyle(
  atmosphere: WorldAtmosphere,
  usesLandingRowBgShift: boolean
): CSSProperties | undefined {
  if (!usesLandingRowBgShift) return undefined;
  return {
    top: `-${MOBILE_COSMOS_LANDING_SHIFT}`,
    height: `calc(100% + ${MOBILE_COSMOS_LANDING_SHIFT})`,
    objectPosition: "center center",
  };
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
  landingBgStyle,
}: {
  desktopSrc: string;
  mobileSrc: string;
  onError?: () => void;
  objectPosition?: string;
  landingBgStyle?: CSSProperties;
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
    <img
      src={src}
      alt=""
      className={`absolute left-0 right-0 w-full object-cover ${
        landingBgStyle ? "" : "inset-y-0 h-full"
      }`}
      style={{
        objectPosition,
        ...landingBgStyle,
        ...GPU_COMPOSIT_LAYER,
        transform: mobileBgOverscanTransform(),
        transformOrigin: "center center",
      }}
      onError={handleError}
      decoding="async"
    />
  );
}

function PanelBgLayers({
  world,
  tone,
  bg,
  showWorld,
  isEntering,
  isColumnReturning,
  returnRevealLanding,
  scrimOpacity,
  usesLandingRowBgShift,
}: {
  world: World;
  tone: ReturnType<typeof columnCopyTone>;
  bg: { desktop: string; mobile: string; onError?: () => void };
  showWorld: boolean;
  isEntering: boolean;
  isColumnReturning: boolean;
  returnRevealLanding: boolean;
  scrimOpacity: number;
  usesLandingRowBgShift: boolean;
}) {
  const hideOverlays =
    showWorld || isEntering || (isColumnReturning && !returnRevealLanding);
  const landingBgStyle = cosmosLandingBgStyle(world.atmosphere, usesLandingRowBgShift);
  const overlayFade =
    isColumnReturning && returnRevealLanding
      ? { duration: MOBILE_RETURN_OVERLAY_FADE_S, ease: COLUMN_EASE }
      : { duration: OVERLAY_EXIT_S, ease: COLUMN_EASE };

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ ...GPU_COMPOSIT_LAYER, contain: "paint" }}
      >
        <ColumnBgImage
          desktopSrc={bg.desktop}
          mobileSrc={bg.mobile}
          onError={bg.onError}
          objectPosition="center center"
          landingBgStyle={landingBgStyle}
        />
        <motion.div
          className={`landing-column-overlay landing-column-overlay--${world.atmosphere} absolute inset-0`}
          initial={false}
          animate={{ opacity: hideOverlays ? 0 : 1 }}
          transition={{ opacity: overlayFade }}
          aria-hidden
        />
      </div>
      <motion.div
        className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b ${tone.scrim}`}
        initial={false}
        animate={{ opacity: hideOverlays ? 0 : scrimOpacity }}
        transition={{ opacity: overlayFade }}
        aria-hidden
      />
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
  returnAtmosphere,
  returnRevealLanding,
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
  returnAtmosphere: WorldAtmosphere | null;
  returnRevealLanding: boolean;
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
  const returnSlidePhase = isColumnReturning && !returnRevealLanding;
  const returnSettlePhase = isColumnReturning && returnRevealLanding;
  const landingVisible = !showWorld;
  const captionDuration =
    returnSettlePhase ? MOBILE_RETURN_LABEL_IN_MS : CAPTION_DECODE_MS;
  const panelCount = worlds.length;
  const mobileWorlds = sortWorldsForMobile(worlds);
  const pivotSlot = pivotDisplayIndex(
    worlds,
    selectedIndex,
    returnFromIndex,
    isColumnReturning
  );
  const returnPivotSlot = pivotDisplayIndex(worlds, null, returnFromIndex, true);
  /** Full-bleed only during return slide — settle back under header in reveal phase. */
  const fullBleedBg = isImmersed || returnSlidePhase;

  if (!landingVisible && !isColumnReturning && selectedIndex === null) return null;

  const stackOffset = fullBleedBg
    ? "0px"
    : "calc(5.5rem + env(safe-area-inset-top))";

  const stackTransition = returnSlidePhase
    ? { duration: MOBILE_RETURN_SLIDE_S, ease: COLUMN_EASE }
    : returnSettlePhase
      ? { duration: MOBILE_RETURN_REVEAL_MS / 1000, ease: COLUMN_EASE }
      : isEntering
        ? { duration: COLUMN_EXIT_S, ease: COLUMN_EASE }
        : { duration: 0.35, ease: COLUMN_EASE };

  const stackOverflow =
    isEntering || returnSlidePhase ? "overflow-visible" : "overflow-hidden";

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-[15] h-dvh md:hidden"
      initial={false}
      animate={{ y: stackOffset }}
      transition={stackTransition}
      aria-hidden={showWorld}
      style={{ isolation: "isolate", ...GPU_COMPOSIT_LAYER }}
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
          const offscreenY = bgOffscreenY(displayIndex, pivotDisplay);
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
          const slideOffscreen = isEntering && !isPivot;
          const slideReturning = returnSlidePhase && !isPivot;
          const slideDuration = returnSlidePhase
            ? MOBILE_RETURN_SLIDE_S
            : COLUMN_EXIT_S;
          const geometryTransition =
            isEntering || returnSlidePhase
              ? {
                  duration: slideDuration,
                  ease: COLUMN_EASE,
                  type: "tween" as const,
                }
              : { duration: 0 };
          const animateY = parkedOffscreen
            ? offscreenY
            : slideOffscreen
              ? slideY
              : slideReturning
                ? 0
                : 0;
          const animateOpacity = parkedOffscreen ? 0 : 1;
          const keepPivotOnTop =
            isPivot &&
            (fillsViewport || isEntering || returnSlidePhase);
          const panelZIndex = keepPivotOnTop ? panelCount + 1 : displayIndex + 1;
          const panelOverflow =
            isEntering || returnSlidePhase ? "overflow-visible" : "overflow-hidden";
          const usesLandingRowBgShift = cosmosUsesLandingRowBgShift(
            world.atmosphere,
            parkedOffscreen
          );

          return (
            <motion.div
              key={world.id}
              layout={false}
              className={`absolute inset-x-0 ${panelOverflow}`}
              style={{
                position: "absolute",
                backgroundColor: showWorld
                  ? "transparent"
                  : atmosphereFallbackBg(world.atmosphere),
                zIndex: panelZIndex,
                pointerEvents: parkedOffscreen ? "none" : undefined,
                ...GPU_COMPOSIT_LAYER,
                willChange:
                  isEntering || returnSlidePhase ? "transform" : undefined,
              }}
              initial={false}
              animate={{
                top: fillsViewport ? "0%" : resting.top,
                height: fillsViewport ? "100%" : resting.height,
                y: animateY,
                opacity: animateOpacity,
              }}
              transition={{
                top: geometryTransition,
                height: geometryTransition,
                y:
                  isEntering || returnSlidePhase
                    ? { duration: slideDuration, delay, ease: COLUMN_EASE }
                    : { duration: 0 },
                opacity: { duration: 0 },
              }}
            >
              <PanelBgLayers
                world={world}
                tone={tone}
                bg={bg}
                showWorld={showWorld}
                isEntering={isEntering}
                isColumnReturning={isColumnReturning}
                returnRevealLanding={returnRevealLanding}
                scrimOpacity={scrimOpacity}
                usesLandingRowBgShift={usesLandingRowBgShift}
              />
            </motion.div>
          );
        })}
      </div>

      {!showWorld &&
        landingCaptionMode !== "hidden" &&
        (!isColumnReturning || returnRevealLanding) && (
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
                  duration={captionDuration}
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

      {!showWorld &&
        landingCaptionMode !== "out" &&
        (!isEntering && (!isColumnReturning || returnRevealLanding)) && (
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
