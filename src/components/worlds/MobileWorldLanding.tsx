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

function mobileSlideY(
  worldIndex: number,
  selectedIndex: number | null,
  isEntering: boolean,
  isImmersed: boolean,
  isColumnReturning: boolean
): string | number {
  if (isColumnReturning || selectedIndex === null) return 0;
  if (!isEntering && !isImmersed) return 0;
  if (worldIndex === selectedIndex) return 0;
  if (worldIndex < selectedIndex) return "-100%";
  return "100%";
}

function mobileSlideDelay(
  worldIndex: number,
  selectedIndex: number | null,
  isEntering: boolean,
  isColumnReturning: boolean,
  worldCount: number
): number {
  if (isColumnReturning) {
    return (worldCount - 1 - worldIndex) * COLUMN_STAGGER_S;
  }
  if (!isEntering || selectedIndex === null) return 0;
  if (worldIndex === selectedIndex) return 0;
  if (worldIndex < selectedIndex) return (selectedIndex - 1 - worldIndex) * COLUMN_STAGGER_S;
  return (worldIndex - selectedIndex - 1) * COLUMN_STAGGER_S;
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
  const [preferMobile, setPreferMobile] = useState(false);
  const [src, setSrc] = useState(desktopSrc);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA);
    const sync = () => {
      const mobile = media.matches;
      setPreferMobile(mobile);
      setSrc(mobile && mobileSrc ? mobileSrc : desktopSrc);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [desktopSrc, mobileSrc]);

  const handleError = () => {
    if (preferMobile && mobileSrc && src !== desktopSrc) {
      setSrc(desktopSrc);
      return;
    }
    onError?.();
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      onError={handleError}
    />
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
  const animatePanels = isEntering || isColumnReturning;
  const landingVisible = !showWorld;
  const panelHeightPct = 100 / worlds.length;

  if (!landingVisible && !isColumnReturning && selectedIndex === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 top-[calc(5.5rem+env(safe-area-inset-top))] z-[15] md:hidden"
      aria-hidden={showWorld}
    >
      <div className="relative h-full overflow-hidden">
        {worlds.map((world, index) => {
          if (showWorld && index !== selectedIndex) return null;

          const locked = world.locked;
          const tone = columnCopyTone(world.atmosphere);
          const bg = bgSourcesForWorld(world);
          const isSelected = selectedIndex === index;
          const fillsViewport =
            isSelected && (isEntering || isImmersed || showWorld);
          const slideY = mobileSlideY(
            index,
            selectedIndex,
            isEntering,
            isImmersed,
            isColumnReturning
          );
          const delay = mobileSlideDelay(
            index,
            selectedIndex,
            isEntering,
            isColumnReturning,
            worlds.length
          );
          const restingTop = index * panelHeightPct;

          return (
            <motion.div
              key={world.id}
              className={`absolute inset-x-0 overflow-hidden ${columnClass[world.color]}`}
              style={{
                backgroundColor: atmosphereFallbackBg(world.atmosphere),
                zIndex: fillsViewport ? 20 : index + 1,
              }}
              initial={false}
              animate={{
                top: fillsViewport ? "0%" : `${restingTop}%`,
                height: fillsViewport ? "100%" : `${panelHeightPct}%`,
                y: animatePanels && !isSelected ? slideY : 0,
              }}
              transition={{
                top: fillsViewport
                  ? { ...EARTH_TRANSITION, type: "tween" }
                  : { duration: 0 },
                height: fillsViewport
                  ? { ...EARTH_TRANSITION, type: "tween" }
                  : { duration: 0 },
                y: animatePanels
                  ? { duration: COLUMN_EXIT_S, delay, ease: COLUMN_EASE }
                  : { duration: 0 },
              }}
            >
              <div className="pointer-events-none absolute inset-0">
                <ColumnBgImage
                  desktopSrc={bg.desktop}
                  mobileSrc={bg.mobile}
                  onError={bg.onError}
                />
                <div
                  className={`landing-column-overlay landing-column-overlay--${world.atmosphere} absolute inset-0`}
                  aria-hidden
                />
              </div>

              {!showWorld && (
                <motion.div
                  className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b ${tone.scrim}`}
                  initial={false}
                  animate={{ opacity: scrimOpacity }}
                  transition={{ opacity: EARTH_TRANSITION }}
                  aria-hidden
                />
              )}

              {!showWorld && (
                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
                  {landingCaptionMode !== "hidden" && (
                    <>
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
                    </>
                  )}
                </div>
              )}

              {!showWorld && landingCaptionMode !== "out" && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onWorldClick(world, index)}
                  className={`pointer-events-auto absolute inset-0 z-20 border-0 bg-transparent ${
                    locked ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  aria-label={`${getLocalized(world.albumTitle, locale)} — ${enterWorldLabel}`}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
