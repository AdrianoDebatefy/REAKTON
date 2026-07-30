"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import type { World, WorldAtmosphere } from "@/types/content";
import { WorldView } from "./WorldView";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import { getInitialWorldUiState, writeWorldSession } from "@/lib/world-session";

interface WorldColumnsProps {
  worlds: World[];
  clapToyUrl: string;
}

const columnClass: Record<World["color"], string> = {
  blue: "world-column-blue",
  silver: "world-column-silver",
  red: "world-column-red",
};

const COLUMN_EXIT_S = 2;
const COLUMN_STAGGER_S = 0.01;
/** Erde startet nach dem Abbau erst, wenn Spalten schon sichtbar zurückfahren */
const EARTH_RETURN_DELAY_S = 0.9;
const COLUMN_EASE = [0.4, 0, 0.2, 1] as const;
const EARTH_TRANSITION = { duration: COLUMN_EXIT_S, ease: COLUMN_EASE };
const WORLD_VIEW_EXIT_S = 0.15;
const CAPTION_DECODE_MS = 720;

function maxColumnStaggerS(columnCount: number) {
  return Math.max(0, columnCount - 2) * COLUMN_STAGGER_S;
}

function columnEnterMs(columnCount: number) {
  return (COLUMN_EXIT_S + maxColumnStaggerS(columnCount)) * 1000;
}

function bgOffscreenX(columnIndex: number, selectedIndex: number) {
  if (columnIndex === selectedIndex) return 0;
  return columnIndex < selectedIndex ? "-100vw" : "100vw";
}

function bgVisible(
  isLanding: boolean,
  isEntering: boolean,
  isColumnReturning: boolean,
  selectedIndex: number | null,
  columnIndex: number,
  active: boolean,
  expandHeld: boolean,
  isImmersed: boolean
) {
  return (
    isLanding ||
    active ||
    expandHeld ||
    isColumnReturning ||
    (isEntering && selectedIndex !== columnIndex) ||
    (isImmersed && selectedIndex !== null && columnIndex !== selectedIndex)
  );
}

function bgSlideX(
  columnIndex: number,
  selectedIndex: number | null,
  isEntering: boolean,
  isImmersed: boolean,
  isColumnReturning: boolean,
  returnBgExpandHold: boolean,
  returnFromIndex: number | null
) {
  if (isColumnReturning) {
    if (
      returnBgExpandHold &&
      returnFromIndex !== null &&
      columnIndex !== returnFromIndex
    ) {
      return bgOffscreenX(columnIndex, returnFromIndex);
    }
    return 0;
  }
  if (selectedIndex !== null && (isEntering || isImmersed)) {
    return bgOffscreenX(columnIndex, selectedIndex);
  }
  return 0;
}

function bgSlideDelay(
  columnIndex: number,
  selectedIndex: number | null,
  isEntering: boolean,
  isColumnReturning: boolean,
  columnCount: number,
  returnAtmosphere: WorldAtmosphere | null,
  cosmosColumnIndex: number
) {
  if (isColumnReturning) {
    if (returnAtmosphere === "cosmos" && columnIndex <= cosmosColumnIndex) {
      return 0;
    }
    return (columnCount - 1 - columnIndex) * COLUMN_STAGGER_S;
  }
  if (!isEntering || selectedIndex === null) return 0;
  if (columnIndex === selectedIndex) return 0;
  if (columnIndex < selectedIndex) return (selectedIndex - 1 - columnIndex) * COLUMN_STAGGER_S;
  return (columnIndex - selectedIndex - 1) * COLUMN_STAGGER_S;
}

function columnClipPath(columnIndex: number, columnWidth: number, expanded: boolean) {
  if (expanded) return "inset(0% 0% 0% 0%)";
  const left = columnIndex * columnWidth;
  const right = 100 - left - columnWidth;
  return `inset(0% ${right}% 0% ${left}%)`;
}

function columnPanLeft(columnIndex: number, columnWidth: number, expanded: boolean) {
  const centerPct = columnIndex * columnWidth + columnWidth / 2;
  return expanded ? "50%" : `${centerPct}%`;
}

function overlayExitX(
  columnIndex: number,
  selectedIndex: number | null,
  isEntering: boolean,
  isImmersed: boolean,
  columnCount: number
): number | string {
  if (selectedIndex === null || (!isEntering && !isImmersed)) return 0;
  if (columnIndex !== selectedIndex) return 0;
  if (selectedIndex === 0) return "-100%";
  if (selectedIndex === columnCount - 1) return "100%";
  return "100%";
}

function ColumnCaption({
  world,
  locale,
  locked,
  lockedLabel,
  decodeMode,
  onDecodeComplete,
}: {
  world: World;
  locale: "de" | "en";
  locked: boolean;
  lockedLabel: string;
  decodeMode: DecodeMode;
  onDecodeComplete?: () => void;
}) {
  const tone = columnCopyTone(world.atmosphere);
  const title = world.albumTitle[locale];
  return (
    <div className={`landing-column-caption ${columnClass[world.color]}`}>
      <div
        className={`landing-column-caption__scrim bg-gradient-to-t ${tone.scrim}`}
        aria-hidden
      />
      <div className="landing-column-caption__content">
        <DecodeText
          as="h2"
          text={title}
          mode={decodeMode}
          className={`text-[30px] font-light leading-snug tracking-wide ${tone.title}`}
          style={tone.titleStyle}
          duration={CAPTION_DECODE_MS}
          onComplete={() => {
            if (decodeMode === "in") onDecodeComplete?.();
          }}
        />
        {locked && (
          <p className="mt-3 text-[30px] uppercase tracking-widest text-white/40">{lockedLabel}</p>
        )}
      </div>
    </div>
  );
}
function WorldBgLayer({
  desktopSrc,
  expanded,
  columnIndex,
  columnWidth,
  columnCount,
  selectedIndex,
  isEntering,
  isImmersed,
  isColumnReturning,
  visible,
  slideX,
  slideDelay = 0,
  animateSlide,
  atmosphere,
  className,
  inWorld,
  onError,
}: {
  desktopSrc: string;
  expanded: boolean;
  columnIndex: number;
  columnWidth: number;
  columnCount: number;
  selectedIndex: number | null;
  isEntering: boolean;
  isImmersed: boolean;
  isColumnReturning: boolean;
  visible: boolean;
  slideX: number | string;
  slideDelay?: number;
  animateSlide: boolean;
  atmosphere: WorldAtmosphere;
  className: string;
  inWorld?: boolean;
  onError?: () => void;
}) {
  const clipPath = columnClipPath(columnIndex, columnWidth, expanded);
  const panLeft = columnPanLeft(columnIndex, columnWidth, expanded);
  const isSelected = selectedIndex === columnIndex;
  const overlaySlide = overlayExitX(
    columnIndex,
    selectedIndex,
    isEntering,
    isImmersed,
    columnCount
  );
  const overlayVisible =
    !inWorld &&
    (!expanded || isEntering || isColumnReturning || overlaySlide !== 0);

  return (
    <motion.div
      className={`${className}${inWorld ? " landing-earth--in-world" : ""}${expanded ? " landing-earth--expanded" : ""}`}
      style={{
        pointerEvents: "none",
        zIndex: expanded ? 12 : columnIndex + 1,
      }}
      initial={false}
      animate={{
        clipPath,
        opacity: visible ? 1 : 0,
        x: slideX,
      }}
      transition={{
        clipPath: { ...EARTH_TRANSITION, type: "tween" },
        opacity: { duration: 0 },
        x: animateSlide ? columnSlideTransition(slideDelay) : { duration: 0 },
      }}
    >
      <motion.div
        className="landing-earth-pan"
        initial={false}
        animate={{ left: panLeft, x: "-50%" }}
        transition={{
          left: { ...EARTH_TRANSITION, type: "tween" },
          x: { duration: 0 },
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={desktopSrc}
          alt=""
          className="column-bg-image--full-bleed"
          onError={onError}
        />
      </motion.div>
      <motion.div
        className={`landing-column-overlay landing-column-overlay--${atmosphere}`}
        initial={false}
        animate={{
          x: isSelected && (isEntering || isImmersed) && !isColumnReturning ? overlaySlide : 0,
          opacity: overlayVisible ? 1 : 0,
        }}
        transition={{
          x: { ...EARTH_TRANSITION, type: "tween" },
          opacity: { duration: 0.15 },
        }}
        aria-hidden
      />
    </motion.div>
  );
}

function ColumnBgImage({
  desktopSrc,
  mobileSrc,
  onError,
  className = "column-bg-image",
}: {
  desktopSrc: string;
  mobileSrc: string;
  onError?: () => void;
  className?: string;
}) {
  return (
    <picture className="pointer-events-none block h-full w-full">
      <source media="(max-width: 767px)" srcSet={mobileSrc} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={desktopSrc} alt="" className={className} onError={onError} />
    </picture>
  );
}

function worldBgSources(
  world: World,
  earthDesktop: string,
  earthMobile: string,
  nanoDesktop: string,
  nanoMobile: string
) {
  if (world.atmosphere === "cosmos") {
    return { desktop: earthDesktop, mobile: earthMobile };
  }
  if (world.atmosphere === "nano") {
    return { desktop: nanoDesktop, mobile: nanoMobile };
  }
  return {
    desktop: world.backgroundImage,
    mobile: world.backgroundImageMobile || world.backgroundImage,
  };
}

function columnSlideTransition(delay: number) {
  return {
    type: "tween" as const,
    duration: COLUMN_EXIT_S,
    delay,
    ease: COLUMN_EASE,
  };
}

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

export function WorldColumns({ worlds, clapToyUrl }: WorldColumnsProps) {
  const locale = useLocale() as "de" | "en";
  const t = useTranslations("home");
  const initialUi = getInitialWorldUiState();
  const [activeId, setActiveId] = useState<string | null>(initialUi.activeId);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(initialUi.selectedIndex);
  const [showWorld, setShowWorld] = useState(initialUi.showWorld);
  const [columnReturning, setColumnReturning] = useState(false);
  const [returnAtmosphere, setReturnAtmosphere] = useState<WorldAtmosphere | null>(null);
  const [returnBgExpandHold, setReturnBgExpandHold] = useState(false);
  const [returnFromIndex, setReturnFromIndex] = useState<number | null>(null);
  const [landingCaptionMode, setLandingCaptionMode] = useState<DecodeMode | "hidden">(
    initialUi.landingCaptionMode
  );
  const prevLocale = useRef(locale);

  useEffect(() => {
    if (prevLocale.current === locale) return;
    prevLocale.current = locale;
    if (showWorld) return;
    setLandingCaptionMode("out");
    const timer = window.setTimeout(() => setLandingCaptionMode("in"), CAPTION_DECODE_MS);
    return () => window.clearTimeout(timer);
  }, [locale, showWorld]);

  const handleCaptionDecodeComplete = useCallback(() => {
    setLandingCaptionMode((mode) => (mode === "in" ? "static" : mode));
  }, []);

  useEffect(() => {
    if (activeId && showWorld && selectedIndex !== null) {
      writeWorldSession({ activeId, selectedIndex, showWorld: true });
      return;
    }
    if (!activeId && !showWorld && !columnReturning) {
      writeWorldSession(null);
    }
  }, [activeId, showWorld, selectedIndex, columnReturning]);

  const activeWorld = worlds.find((w) => w.id === activeId);
  const columnWidth = 100 / worlds.length;
  const cosmosWorld = worlds.find((w) => w.atmosphere === "cosmos");
  const nanoWorld = worlds.find((w) => w.atmosphere === "nano");
  const clubWorld = worlds.find((w) => w.atmosphere === "club");
  const cosmosColumnIndex = Math.max(0, worlds.findIndex((w) => w.atmosphere === "cosmos"));
  const nanoColumnIndex = Math.max(0, worlds.findIndex((w) => w.atmosphere === "nano"));
  const clubColumnIndex = Math.max(0, worlds.findIndex((w) => w.atmosphere === "club"));
  const isCosmosActive = activeWorld?.atmosphere === "cosmos";
  const isNanoActive = activeWorld?.atmosphere === "nano";

  const handleColumnClick = useCallback((world: World, index: number) => {
    if (world.locked || landingCaptionMode === "out") return;
    setLandingCaptionMode("out");
    window.setTimeout(() => {
      setLandingCaptionMode("hidden");
      setSelectedIndex(index);
      setActiveId(world.id);
      setShowWorld(false);
      setColumnReturning(false);
      setReturnAtmosphere(null);
      setReturnBgExpandHold(false);
      setReturnFromIndex(null);
      window.setTimeout(() => setShowWorld(true), columnEnterMs(worlds.length));
    }, CAPTION_DECODE_MS);
  }, [worlds.length, landingCaptionMode]);

  const handleBackFromWorld = useCallback(() => {
    writeWorldSession(null);
    const atmosphere = worlds.find((w) => w.id === activeId)?.atmosphere ?? null;
    const fromIndex = selectedIndex;
    const returnMs = columnEnterMs(worlds.length);
    setShowWorld(false);
    setColumnReturning(true);
    setReturnAtmosphere(atmosphere);
    setReturnBgExpandHold(true);
    setReturnFromIndex(fromIndex);
    setActiveId(null);
    setSelectedIndex(null);
    setLandingCaptionMode("hidden");
    window.setTimeout(() => setReturnBgExpandHold(false), EARTH_RETURN_DELAY_S * 1000);
    window.setTimeout(() => {
      setColumnReturning(false);
      setReturnAtmosphere(null);
      setReturnFromIndex(null);
      setLandingCaptionMode("in");
    }, returnMs);
  }, [activeId, selectedIndex, worlds]);

  const [earthDesktopSrc, setEarthDesktopSrc] = useState(
    () => cosmosWorld?.backgroundImage || "/worlds/earth-night.svg"
  );
  const [nanoDesktopSrc, setNanoDesktopSrc] = useState(
    () => nanoWorld?.backgroundImage || "/worlds/nano.jpg"
  );
  const [clubDesktopSrc, setClubDesktopSrc] = useState(
    () => clubWorld?.backgroundImage || "/worlds/club-bg.jpg"
  );

  const earthMobileSrc = cosmosWorld?.backgroundImageMobile || earthDesktopSrc;
  const nanoMobileSrc = nanoWorld?.backgroundImageMobile || nanoDesktopSrc;
  const clubMobileSrc = clubWorld?.backgroundImageMobile || clubDesktopSrc;

  const handleEarthError = useCallback(() => {
    const fallbacks = ["/worlds/Erde.jpg", "/worlds/earth-night.jpg", "/worlds/earth-night.svg"];
    const idx = fallbacks.indexOf(earthDesktopSrc);
    const next = fallbacks[idx + 1];
    if (next) setEarthDesktopSrc(next);
  }, [earthDesktopSrc]);

  const handleNanoError = useCallback(() => {
    const fallbacks = ["/worlds/nano.jpg", "/worlds/nano-bg.jpg"];
    const idx = fallbacks.indexOf(nanoDesktopSrc);
    const next = fallbacks[idx + 1];
    if (next) setNanoDesktopSrc(next);
  }, [nanoDesktopSrc]);

  const handleClubError = useCallback(() => {
    const fallbacks = ["/worlds/club-bg.jpg"];
    const idx = fallbacks.indexOf(clubDesktopSrc);
    const next = fallbacks[idx + 1];
    if (next) setClubDesktopSrc(next);
  }, [clubDesktopSrc]);

  const isEntering = selectedIndex !== null && !showWorld;
  const isImmersed = selectedIndex !== null;
  const isColumnReturning = columnReturning;
  const isLanding = !isImmersed && !isColumnReturning;
  const earthAtPageCenter =
    (isImmersed && isCosmosActive) ||
    (returnBgExpandHold && returnAtmosphere === "cosmos");
  const nanoBgFull =
    (isImmersed && isNanoActive) || (returnBgExpandHold && returnAtmosphere === "nano");
  const clubBgFull =
    (isImmersed && activeWorld?.atmosphere === "club") ||
    (returnBgExpandHold && returnAtmosphere === "club");
  const showCosmosBg = bgVisible(
    isLanding,
    isEntering,
    isColumnReturning,
    selectedIndex,
    cosmosColumnIndex,
    Boolean(isImmersed && isCosmosActive),
    returnBgExpandHold && returnAtmosphere === "cosmos",
    isImmersed
  );
  const showNanoBg = bgVisible(
    isLanding,
    isEntering,
    isColumnReturning,
    selectedIndex,
    nanoColumnIndex,
    Boolean(isImmersed && isNanoActive),
    returnBgExpandHold && returnAtmosphere === "nano",
    isImmersed
  );
  const showClubBg = bgVisible(
    isLanding,
    isEntering,
    isColumnReturning,
    selectedIndex,
    clubColumnIndex,
    Boolean(isImmersed && activeWorld?.atmosphere === "club"),
    returnBgExpandHold && returnAtmosphere === "club",
    isImmersed
  );

  const bgSlideAnimate = isEntering || isColumnReturning;
  const cosmosSlideX = bgSlideX(
    cosmosColumnIndex,
    selectedIndex,
    isEntering,
    isImmersed,
    isColumnReturning,
    returnBgExpandHold,
    returnFromIndex
  );
  const nanoSlideX = bgSlideX(
    nanoColumnIndex,
    selectedIndex,
    isEntering,
    isImmersed,
    isColumnReturning,
    returnBgExpandHold,
    returnFromIndex
  );
  const clubSlideX = bgSlideX(
    clubColumnIndex,
    selectedIndex,
    isEntering,
    isImmersed,
    isColumnReturning,
    returnBgExpandHold,
    returnFromIndex
  );
  const hidePageGrain = Boolean(cosmosWorld) && (earthAtPageCenter || showWorld || isLanding);
  const lockedHintLabel = `${t("locked")} — ${t("lockedHint")}`;
  const captionDecodeMode: DecodeMode =
    landingCaptionMode === "hidden" ? "static" : landingCaptionMode;

  return (
    <div className="relative min-h-screen pt-24">
      {!hidePageGrain && (
        <>
          <div className="halftone-overlay fixed inset-0 z-0" />
          <div className="grain-overlay fixed inset-0 z-0" />
        </>
      )}

      <div className="landing-bg-stack pointer-events-none fixed inset-0 z-[1] hidden md:block">
        {cosmosWorld && (
          <WorldBgLayer
            desktopSrc={earthDesktopSrc}
            columnIndex={cosmosColumnIndex}
            columnWidth={columnWidth}
            columnCount={worlds.length}
            selectedIndex={selectedIndex}
            isEntering={isEntering}
            isImmersed={isImmersed}
            isColumnReturning={isColumnReturning}
            expanded={earthAtPageCenter}
            visible={showCosmosBg}
            slideX={cosmosSlideX}
            slideDelay={bgSlideDelay(
              cosmosColumnIndex,
              selectedIndex,
              isEntering,
              isColumnReturning,
              worlds.length,
              returnAtmosphere,
              cosmosColumnIndex
            )}
            animateSlide={bgSlideAnimate}
            atmosphere="cosmos"
            className="landing-earth"
            inWorld={showWorld && isCosmosActive}
            onError={handleEarthError}
          />
        )}

        {nanoWorld && (
          <WorldBgLayer
            desktopSrc={nanoDesktopSrc}
            columnIndex={nanoColumnIndex}
            columnWidth={columnWidth}
            columnCount={worlds.length}
            selectedIndex={selectedIndex}
            isEntering={isEntering}
            isImmersed={isImmersed}
            isColumnReturning={isColumnReturning}
            expanded={nanoBgFull}
            visible={showNanoBg}
            slideX={nanoSlideX}
            slideDelay={bgSlideDelay(
              nanoColumnIndex,
              selectedIndex,
              isEntering,
              isColumnReturning,
              worlds.length,
              returnAtmosphere,
              cosmosColumnIndex
            )}
            animateSlide={bgSlideAnimate}
            atmosphere="nano"
            className="landing-earth landing-nano"
            inWorld={showWorld && isNanoActive}
            onError={handleNanoError}
          />
        )}

        {clubWorld && (
          <WorldBgLayer
            desktopSrc={clubDesktopSrc}
            columnIndex={clubColumnIndex}
            columnWidth={columnWidth}
            columnCount={worlds.length}
            selectedIndex={selectedIndex}
            isEntering={isEntering}
            isImmersed={isImmersed}
            isColumnReturning={isColumnReturning}
            expanded={clubBgFull}
            visible={showClubBg}
            slideX={clubSlideX}
            slideDelay={bgSlideDelay(
              clubColumnIndex,
              selectedIndex,
              isEntering,
              isColumnReturning,
              worlds.length,
              returnAtmosphere,
              cosmosColumnIndex
            )}
            animateSlide={bgSlideAnimate}
            atmosphere="club"
            className="landing-earth landing-club"
            inWorld={showWorld && activeWorld?.atmosphere === "club"}
            onError={handleClubError}
          />
        )}
      </div>

      <AnimatePresence>
        {showWorld && activeWorld && (
          <motion.div
            key="world-view"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: WORLD_VIEW_EXIT_S }}
            className="fixed inset-0 z-30 bg-transparent"
          >
            <WorldView world={activeWorld} onBack={handleBackFromWorld} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden h-[calc(100vh-6rem)] md:block" aria-hidden />

      {!showWorld && landingCaptionMode !== "hidden" && (
        <div className="pointer-events-none fixed inset-x-0 top-24 bottom-0 z-[90] hidden md:grid md:grid-cols-3">
          {worlds.map((world) => (
            <div key={`column-caption-${world.id}`} className="relative flex h-full min-w-0 flex-col justify-end">
              <ColumnCaption
                world={world}
                locale={locale}
                locked={world.locked}
                lockedLabel={lockedHintLabel}
                decodeMode={captionDecodeMode}
                onDecodeComplete={handleCaptionDecodeComplete}
              />
            </div>
          ))}
        </div>
      )}

      {isLanding && !showWorld && landingCaptionMode !== "out" && (
        <div className="fixed inset-x-0 top-24 bottom-0 z-[95] hidden grid-cols-3 md:grid">
          {worlds.map((world, index) => (
            <button
              key={`column-hit-${world.id}`}
              type="button"
              disabled={world.locked}
              onClick={() => handleColumnClick(world, index)}
              className={`h-full w-full border-0 bg-transparent p-0 ${
                world.locked ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              aria-label={`${world.albumTitle[locale]} — ${t("enterWorld")}`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-1 md:hidden">
        {worlds.map((world, index) => {
          const locked = world.locked;
          const showColumnBg = isLanding && Boolean(world.backgroundImage);
          const bgSources =
            world.atmosphere === "club"
              ? { desktop: clubDesktopSrc, mobile: clubMobileSrc }
              : worldBgSources(
                  world,
                  earthDesktopSrc,
                  earthMobileSrc,
                  nanoDesktopSrc,
                  nanoMobileSrc
                );
          const bgOnError =
            world.atmosphere === "cosmos"
              ? handleEarthError
              : world.atmosphere === "nano"
                ? handleNanoError
                : world.atmosphere === "club"
                  ? handleClubError
                  : undefined;

          const tone = columnCopyTone(world.atmosphere);

          return (
            <button
              key={world.id}
              type="button"
              disabled={locked || isEntering || landingCaptionMode === "out"}
              onClick={() => handleColumnClick(world, index)}
              className={`group relative flex min-h-[28vh] w-full flex-col justify-end overflow-hidden p-6 text-left ${columnClass[world.color]} ${
                locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"
              }`}
            >
              {showColumnBg && (
                <motion.div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                  <ColumnBgImage
                    desktopSrc={bgSources.desktop}
                    mobileSrc={bgSources.mobile}
                    onError={bgOnError}
                  />
                  <motion.div
                    className={`landing-column-overlay landing-column-overlay--${world.atmosphere}`}
                    aria-hidden
                  />
                </motion.div>
              )}
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-36 bg-gradient-to-t ${tone.scrim}`}
                aria-hidden
              />
              <div className="relative z-20">
                <DecodeText
                  as="h2"
                  text={world.albumTitle[locale]}
                  mode={landingCaptionMode === "hidden" ? "out" : captionDecodeMode}
                  className={`text-[30px] font-light ${tone.title}`}
                  style={tone.titleStyle}
                  duration={CAPTION_DECODE_MS}
                />
                {locked && (
                  <p className="mt-2 text-xs uppercase tracking-widest text-white/40">{t("locked")}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!showWorld && (
        <section className="relative z-10 border-t border-white/10 bg-black/50 px-4 py-16 text-center">
          <h2 className="text-sm uppercase tracking-[0.3em] text-white/50">{t("toyTitle")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/45">{t("toyDescription")}</p>
          <a
            href={clapToyUrl}
            className="mt-6 inline-block rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest transition hover:bg-white/10"
          >
            {t("toyCta")}
          </a>
        </section>
      )}
    </div>
  );
}
