"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { World } from "@/types/content";
import { AlbumSlotScene } from "./AlbumSlotScene";
import { MobileAlbumSlotScene } from "./MobileAlbumSlotScene";
import { WorldAmbientAudio } from "./WorldAmbientAudio";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import type { Locale } from "@/types/content";
import { getLocalized } from "@/lib/locale";
import { useIsMobile } from "@/hooks/useIsMobile";
import cosmosLayout from "@/data/cosmos-layout.json";
import nanoLayout from "@/data/nano-layout.json";
import clubLayout from "@/data/club-layout.json";

interface WorldViewProps {
  world: World;
  onBack: () => void;
}

const atmosphereClass: Record<World["atmosphere"], string> = {
  cosmos: "atmosphere-cosmos",
  nano: "atmosphere-nano",
  club: "atmosphere-club",
};

const HEADER_DECODE_MS = 720;

export function WorldView({ world, onBack }: WorldViewProps) {
  const locale = useLocale() as Locale;
  const isMobile = useIsMobile();
  const t = useTranslations("world");
  const tNav = useTranslations("nav");
  const [exiting, setExiting] = useState(false);
  const [headerDecodeMode, setHeaderDecodeMode] = useState<DecodeMode>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? "static"
      : "in"
  );

  const useSlotScene =
    world.atmosphere === "cosmos" || world.atmosphere === "nano" || world.atmosphere === "club";
  const useGlobalBackground = useSlotScene;

  useEffect(() => {
    const timer = window.setTimeout(() => setHeaderDecodeMode("static"), HEADER_DECODE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const handleBackClick = useCallback(() => {
    if (headerDecodeMode === "out") return;
    setHeaderDecodeMode("out");

    const continueBack = () => {
      if (useSlotScene && world.songs.length > 0) {
        setExiting(true);
        return;
      }
      onBack();
    };

    window.setTimeout(continueBack, HEADER_DECODE_MS);
  }, [headerDecodeMode, onBack, useSlotScene, world.songs.length]);

  const handleExitComplete = useCallback(() => {
    setExiting(false);
    onBack();
  }, [onBack]);

  const layout =
    world.atmosphere === "cosmos"
      ? cosmosLayout
      : world.atmosphere === "nano"
        ? nanoLayout
        : clubLayout;

  const borderClass =
    world.atmosphere === "cosmos"
      ? "border-sky-300/25"
      : world.atmosphere === "nano"
        ? "border-slate-300/25"
        : "border-red-400/30";

  const backLabel = `← ${tNav("back")}`;

  return (
    <div
      className={`relative min-h-[100dvh] bg-transparent pt-[calc(5.5rem+env(safe-area-inset-top))] md:min-h-screen md:pt-24 ${atmosphereClass[world.atmosphere]}`}
    >
      <WorldAmbientAudio src={world.backgroundAudio} />
      {!useGlobalBackground && (
        <>
          <div className="halftone-overlay" />
          <div className="grain-overlay" />
        </>
      )}

      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-4 pb-2 pt-2 md:pt-6"
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.35 }}
      >
        <button
          type="button"
          onClick={handleBackClick}
          disabled={exiting}
          className="mb-3 text-lg uppercase tracking-widest text-white/50 transition hover:text-white disabled:pointer-events-none disabled:opacity-30 md:mb-4 md:text-2xl"
        >
          <DecodeText
            as="span"
            text={backLabel}
            mode={headerDecodeMode}
            duration={HEADER_DECODE_MS}
          />
        </button>

        <p className="text-sm lowercase tracking-[0.2em] text-white/50 md:text-[20px] md:tracking-[0.25em]">
          <DecodeText text={t("themeLabel")} mode={headerDecodeMode} duration={HEADER_DECODE_MS} />
        </p>
        <DecodeText
          as="h1"
          text={getLocalized(world.albumTitle, locale)}
          mode={headerDecodeMode}
          duration={HEADER_DECODE_MS}
          className="mt-1 text-[28px] font-light tracking-wide md:mt-2 md:text-[40px] lg:text-[60px]"
        />
        {!useSlotScene && (
          <p className="mt-6 max-w-2xl text-2xl leading-relaxed text-white/45">
            <DecodeText
              as="span"
              text={getLocalized(world.themeDescription, locale)}
              mode={headerDecodeMode}
              duration={HEADER_DECODE_MS}
            />
          </p>
        )}
      </motion.div>

      {useSlotScene && world.songs.length > 0 ? (
        isMobile ? (
          <MobileAlbumSlotScene
            songs={world.songs}
            maxSlots={world.slotCount ?? (world.atmosphere === "cosmos" ? 12 : world.atmosphere === "nano" ? 13 : 14)}
            borderClass={borderClass}
            exiting={exiting}
            onExitComplete={handleExitComplete}
            locale={locale}
          />
        ) : (
          <AlbumSlotScene
            songs={world.songs}
            positions={layout}
            backgroundImage={useGlobalBackground ? undefined : world.backgroundImage}
            hideEarthLayer={useGlobalBackground}
            variant={world.atmosphere}
            maxSlots={world.slotCount ?? (world.atmosphere === "cosmos" ? 12 : world.atmosphere === "nano" ? 13 : 14)}
            borderClass={borderClass}
            exiting={exiting}
            onExitComplete={handleExitComplete}
            locale={locale}
          />
        )
      ) : (
        <p className="relative z-10 mx-auto max-w-6xl px-4 text-sm text-white/40">—</p>
      )}
    </div>
  );
}
