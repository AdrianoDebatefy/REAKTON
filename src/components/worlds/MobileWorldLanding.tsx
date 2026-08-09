"use client";

import { motion } from "framer-motion";
import type { Locale, World, WorldAtmosphere } from "@/types/content";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import { getLocalized } from "@/lib/locale";

const COLUMN_EXIT_S = 2;
const COLUMN_STAGGER_S = 0.01;
const COLUMN_EASE = [0.4, 0, 0.2, 1] as const;
const CAPTION_DECODE_MS = 720;
const EARTH_TRANSITION = { duration: COLUMN_EXIT_S, ease: COLUMN_EASE };

function columnCopyTone(atmosphere: WorldAtmosphere) {
  if (atmosphere === "nano") {
    return {
      title: "text-white",
      scrim: "from-black/65 via-black/30 to-transparent",
      titleStyle: { color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.9)" } as const,
    };
  }
  if (atmosphere === "club") {
    return {
      title: "text-white",
      scrim: "from-black/75 via-black/35 to-transparent",
      titleStyle: { color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.9)" } as const,
    };
  }
  return {
    title: "text-white",
    scrim: "from-black/60 via-black/20 to-transparent",
    titleStyle: { color: "#ffffff", textShadow: "0 2px 14px rgba(0,0,0,0.85)" } as const,
  };
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
  return (
    <picture className="pointer-events-none block h-full w-full">
      <source media="(max-width: 767px)" srcSet={mobileSrc} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={desktopSrc} alt="" className="h-full w-full object-cover" onError={onError} />
    </picture>
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

  if (!landingVisible && !isColumnReturning) return null;

  const panelHeightPct = 100 / worlds.length;

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[calc(5.5rem+env(safe-area-inset-top))] z-[20] md:hidden"
      aria-hidden={showWorld}
    >
      <div className="relative h-full overflow-hidden">
      {worlds.map((world, index) => {
        const locked = world.locked;
        const tone = columnCopyTone(world.atmosphere);
        const bg = bgSourcesForWorld(world);
        const isSelected = selectedIndex === index;
        const expanded = isSelected && (isEntering || isImmersed);
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
            initial={false}
            animate={{
              y: animatePanels ? slideY : 0,
              top: expanded ? "0%" : `${restingTop}%`,
              height: expanded ? "100%" : `${panelHeightPct}%`,
              opacity: landingVisible || isColumnReturning ? 1 : 0,
            }}
            transition={{
              y: animatePanels
                ? { duration: COLUMN_EXIT_S, delay, ease: COLUMN_EASE }
                : { duration: 0 },
              top: { ...EARTH_TRANSITION, type: "tween" },
              height: { ...EARTH_TRANSITION, type: "tween" },
              opacity: { duration: 0.25 },
            }}
            style={{ zIndex: expanded ? 30 : index + 1 }}
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

            <motion.div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[45%] bg-gradient-to-t ${tone.scrim}`}
              initial={false}
              animate={{ opacity: scrimOpacity }}
              transition={{ opacity: EARTH_TRANSITION }}
              aria-hidden
            />

            <div className="relative z-10 flex h-full flex-col justify-end p-5 pb-6">
              {!showWorld && landingCaptionMode !== "hidden" && (
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

            {!showWorld && landingCaptionMode !== "out" && (
              <button
                type="button"
                disabled={locked}
                onClick={() => onWorldClick(world, index)}
                className={`absolute inset-0 z-20 border-0 bg-transparent ${
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
