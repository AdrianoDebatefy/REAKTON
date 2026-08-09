"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Locale, World, WorldAtmosphere } from "@/types/content";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import { getLocalized } from "@/lib/locale";

const COLUMN_EXIT_S = 2;
const COLUMN_STAGGER_S = 0.01;
const COLUMN_EASE = [0.4, 0, 0.2, 1] as const;
const CAPTION_DECODE_MS = 720;
const EARTH_TRANSITION = { duration: COLUMN_EXIT_S, ease: COLUMN_EASE };
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

/** Vertical crop — mirrors desktop columnClipPath (horizontal thirds). */
function mobileClipPath(displayIndex: number, panelCount: number, expanded: boolean) {
  if (expanded) return "inset(0% 0% 0% 0%)";
  const slotHeight = 100 / panelCount;
  const top = displayIndex * slotHeight;
  const bottom = 100 - top - slotHeight;
  return `inset(${top}% 0% ${bottom}% 0%)`;
}

/** Vertical pan — mirrors desktop columnPanLeft. */
function mobilePanTop(displayIndex: number, panelCount: number, expanded: boolean) {
  const slotHeight = 100 / panelCount;
  const centerPct = displayIndex * slotHeight + slotHeight / 2;
  return expanded ? "50%" : `${centerPct}%`;
}

function bgOffscreenY(displayIndex: number, pivotDisplay: number) {
  if (displayIndex === pivotDisplay) return 0;
  return displayIndex < pivotDisplay ? "-100%" : "100%";
}

function mobileSlideY(
  displayIndex: number,
  pivotDisplay: number | null,
  isEntering: boolean,
  isImmersed: boolean,
  isColumnReturning: boolean,
  returnBgExpandHold: boolean,
  returnPivotDisplay: number | null
): string | number {
  if (isColumnReturning) {
    if (
      returnBgExpandHold &&
      returnPivotDisplay !== null &&
      displayIndex !== returnPivotDisplay
    ) {
      return bgOffscreenY(displayIndex, returnPivotDisplay);
    }
    return 0;
  }
  if (pivotDisplay !== null && (isEntering || isImmersed)) {
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

function mobileOverlayOpacity(
  displayIndex: number,
  pivotDisplay: number | null,
  isEntering: boolean,
  isImmersed: boolean,
  isColumnReturning: boolean,
  inWorld: boolean,
  expanded: boolean
): number {
  if (inWorld) return 0;
  if (isColumnReturning) return 1;
  if (!expanded && pivotDisplay === null) return 1;
  if (pivotDisplay === null) return 1;
  if (displayIndex === pivotDisplay && (isEntering || isImmersed)) return 0;
  if (isEntering || isImmersed) return 0;
  if (!expanded) return 1;
  return 0;
}

function mobileBgVisible(
  isLanding: boolean,
  isEntering: boolean,
  isColumnReturning: boolean,
  selectedIndex: number | null,
  worldIndex: number,
  isPivotActive: boolean,
  expandHeld: boolean,
  isImmersed: boolean
) {
  return (
    isLanding ||
    isPivotActive ||
    expandHeld ||
    isColumnReturning ||
    (isEntering && selectedIndex !== worldIndex) ||
    (isImmersed && selectedIndex !== null && worldIndex !== selectedIndex)
  );
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

function sortWorldsForMobile(worlds: World[]): World[] {
  return [...worlds].sort(
    (a, b) =>
      MOBILE_WORLD_ORDER.indexOf(a.atmosphere) - MOBILE_WORLD_ORDER.indexOf(b.atmosphere)
  );
}

function columnSlideTransition(delay: number) {
  return {
    type: "tween" as const,
    duration: COLUMN_EXIT_S,
    delay,
    ease: COLUMN_EASE,
  };
}

function ColumnBgImage({
  desktopSrc,
  mobileSrc,
  onError,
}: {
  desktopSrc: string;
  mobileSrc: string;
  onError?: () => void;
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt=""
      className="column-bg-image--full-bleed"
      onError={handleError}
    />
  );
}

function MobileBgLayer({
  world,
  displayIndex,
  panelCount,
  expanded,
  visible,
  slideY,
  slideDelay,
  animateSlide,
  inWorld,
  pivotDisplay,
  isEntering,
  isImmersed,
  isColumnReturning,
  bg,
  scrimOpacity,
  showWorld,
}: {
  world: World;
  displayIndex: number;
  panelCount: number;
  expanded: boolean;
  visible: boolean;
  slideY: number | string;
  slideDelay: number;
  animateSlide: boolean;
  inWorld: boolean;
  pivotDisplay: number | null;
  isEntering: boolean;
  isImmersed: boolean;
  isColumnReturning: boolean;
  bg: { desktop: string; mobile: string; onError?: () => void };
  scrimOpacity: number;
  showWorld: boolean;
}) {
  const tone = columnCopyTone(world.atmosphere);
  const clipPath = mobileClipPath(displayIndex, panelCount, expanded);
  const panTop = mobilePanTop(displayIndex, panelCount, expanded);
  const overlayOpacity = mobileOverlayOpacity(
    displayIndex,
    pivotDisplay,
    isEntering,
    isImmersed,
    isColumnReturning,
    inWorld,
    expanded
  );

  return (
    <motion.div
      className="landing-earth landing-earth--mobile"
      style={{
        pointerEvents: "none",
        zIndex: expanded ? 20 : displayIndex + 1,
        backgroundColor: atmosphereFallbackBg(world.atmosphere),
      }}
      initial={false}
      animate={{
        clipPath,
        opacity: visible ? 1 : 0,
        y: slideY,
      }}
      transition={{
        clipPath: { ...EARTH_TRANSITION, type: "tween" },
        opacity: { duration: 0 },
        y: animateSlide ? columnSlideTransition(slideDelay) : { duration: 0 },
      }}
    >
      <motion.div
        className="landing-earth-pan landing-earth-pan--mobile"
        initial={false}
        animate={{ top: panTop, y: "-50%" }}
        transition={{
          top: { ...EARTH_TRANSITION, type: "tween" },
          y: { duration: 0 },
        }}
      >
        <ColumnBgImage
          desktopSrc={bg.desktop}
          mobileSrc={bg.mobile}
          onError={bg.onError}
        />
      </motion.div>
      <motion.div
        className={`landing-column-overlay landing-column-overlay--${world.atmosphere}`}
        initial={false}
        animate={{ opacity: overlayOpacity }}
        transition={{ opacity: EARTH_TRANSITION }}
        aria-hidden
      />
      {!showWorld && (
        <motion.div
          className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b ${tone.scrim}`}
          initial={false}
          animate={{ opacity: scrimOpacity }}
          transition={{ opacity: EARTH_TRANSITION }}
          aria-hidden
        />
      )}
    </motion.div>
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
  const isLanding = !isImmersed && !isColumnReturning;
  const panelCount = worlds.length;
  const mobileWorlds = sortWorldsForMobile(worlds);
  const pivotSlot = pivotDisplayIndex(
    worlds,
    selectedIndex,
    returnFromIndex,
    isColumnReturning
  );
  const returnPivotSlot = pivotDisplayIndex(
    worlds,
    null,
    returnFromIndex,
    true
  );

  if (!landingVisible && !isColumnReturning && selectedIndex === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 top-[calc(5.5rem+env(safe-area-inset-top))] z-[15] md:hidden"
      aria-hidden={showWorld}
    >
      <div className="landing-bg-stack relative h-full overflow-hidden">
        {mobileWorlds.map((world, displayIndex) => {
          const index = worlds.findIndex((w) => w.id === world.id);
          if (index < 0) return null;

          const bg = bgSourcesForWorld(world);
          const pivotDataIndex = isColumnReturning ? returnFromIndex : selectedIndex;
          const isPivot = pivotDataIndex !== null && index === pivotDataIndex;
          const expanded =
            isPivot &&
            (isEntering ||
              isImmersed ||
              showWorld ||
              (isColumnReturning && returnBgExpandHold));
          const visible = mobileBgVisible(
            isLanding,
            isEntering,
            isColumnReturning,
            selectedIndex,
            index,
            Boolean(isImmersed && isPivot),
            Boolean(returnBgExpandHold && isPivot),
            isImmersed
          );
          const slideY = mobileSlideY(
            displayIndex,
            pivotSlot,
            isEntering,
            isImmersed,
            isColumnReturning,
            returnBgExpandHold,
            returnPivotSlot
          );
          const delay = mobileSlideDelay(
            displayIndex,
            pivotSlot,
            isEntering,
            isColumnReturning,
            panelCount,
            returnAtmosphere
          );

          return (
            <MobileBgLayer
              key={world.id}
              world={world}
              displayIndex={displayIndex}
              panelCount={panelCount}
              expanded={expanded}
              visible={visible}
              slideY={slideY}
              slideDelay={delay}
              animateSlide={isAnimating}
              inWorld={showWorld && isPivot}
              pivotDisplay={pivotSlot}
              isEntering={isEntering}
              isImmersed={isImmersed}
              isColumnReturning={isColumnReturning}
              bg={bg}
              scrimOpacity={scrimOpacity}
              showWorld={showWorld}
            />
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
        <div className="absolute inset-0 z-[30] grid grid-rows-3">
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
    </div>
  );
}
