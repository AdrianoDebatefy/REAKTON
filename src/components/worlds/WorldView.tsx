"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { World } from "@/types/content";
import { AlbumSlotScene } from "./AlbumSlotScene";
import { WorldAmbientAudio } from "./WorldAmbientAudio";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import type { Locale } from "@/types/content";
import { getLocalized } from "@/lib/locale";
import { consumeLocaleSwitch } from "@/lib/world-session";
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
  const t = useTranslations("world");
  const tNav = useTranslations("nav");
  const localeSwitchOnMount = useRef(consumeLocaleSwitch());
  const [exiting, setExiting] = useState(false);
  const [headerDecodeMode, setHeaderDecodeMode] = useState<DecodeMode>(
    () => (localeSwitchOnMount.current ? "static" : "in")
  );
  const localeReady = useRef(false);

  const useSlotScene =
    world.atmosphere === "cosmos" || world.atmosphere === "nano" || world.atmosphere === "club";
  const useGlobalBackground = useSlotScene;

  useEffect(() => {
    if (!localeSwitchOnMount.current) return;
    setHeaderDecodeMode("out");
    const timer = window.setTimeout(() => {
      setHeaderDecodeMode("in");
      window.setTimeout(() => setHeaderDecodeMode("static"), HEADER_DECODE_MS);
    }, HEADER_DECODE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localeReady.current) {
      localeReady.current = true;
      return;
    }
    setHeaderDecodeMode("out");
    const timer = window.setTimeout(() => {
      setHeaderDecodeMode("in");
      window.setTimeout(() => setHeaderDecodeMode("static"), HEADER_DECODE_MS);
    }, HEADER_DECODE_MS);
    return () => window.clearTimeout(timer);
  }, [locale]);

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
    <div className={`relative min-h-screen bg-transparent pt-24 ${atmosphereClass[world.atmosphere]}`}>
      <WorldAmbientAudio src={world.backgroundAudio} />
      {!useGlobalBackground && (
        <>
          <div className="halftone-overlay" />
          <div className="grain-overlay" />
        </>
      )}

      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-4 pb-2 pt-4 md:pt-6"
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.35 }}
      >
        <button
          type="button"
          onClick={handleBackClick}
          disabled={exiting}
          className="mb-4 text-2xl uppercase tracking-widest text-white/50 transition hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          <DecodeText
            as="span"
            text={backLabel}
            mode={headerDecodeMode}
            duration={HEADER_DECODE_MS}
          />
        </button>

        <p className="text-[20px] lowercase tracking-[0.25em] text-white/50">
          <DecodeText text={t("themeLabel")} mode={headerDecodeMode} duration={HEADER_DECODE_MS} />
        </p>
        <DecodeText
          as="h1"
          text={getLocalized(world.albumTitle, locale)}
          mode={headerDecodeMode}
          duration={HEADER_DECODE_MS}
          className="mt-2 text-[40px] font-light tracking-wide md:text-[60px]"
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
        <AlbumSlotScene
          songs={world.songs}
          positions={layout}
          backgroundImage={useGlobalBackground ? undefined : world.backgroundImage}
          hideEarthLayer={useGlobalBackground}
          variant={world.atmosphere}
          maxSlots={world.slotCount ?? (world.atmosphere === "cosmos" ? 12 : world.atmosphere === "nano" ? 13 : 14)}
          borderClass={borderClass}
          exiting={exiting}
          skipIntro={localeSwitchOnMount.current}
          onExitComplete={handleExitComplete}
          locale={locale}
        />
      ) : (
        <p className="relative z-10 mx-auto max-w-6xl px-4 text-sm text-white/40">—</p>
      )}
    </div>
  );
}
