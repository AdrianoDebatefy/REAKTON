"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { World } from "@/types/content";
import { AlbumSlotScene } from "./AlbumSlotScene";
import { MobileAlbumSlotScene } from "./MobileAlbumSlotScene";
import { WorldAmbientAudio } from "./WorldAmbientAudio";
import { WorldLinkButtonOverlay } from "./WorldLinkButtonOverlay";
import { DecodeText, type DecodeMode } from "@/components/DecodeText";
import type { Locale } from "@/types/content";
import { getLocalized } from "@/lib/locale";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLiveWorld } from "@/hooks/useLiveWorld";
import {
  NfcClubCodeEntry,
  NfcClubSessionBadge,
  useNfcClubSession,
} from "@/components/nfc/NfcClubDesktop";
import {
  MOBILE_BACK_TEXT_MS,
} from "@/lib/mobile-world-timing";
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

export function WorldView({ world: initialWorld, onBack }: WorldViewProps) {
  const world = useLiveWorld(initialWorld);
  const locale = useLocale() as Locale;
  const isMobile = useIsMobile();
  const t = useTranslations("world");
  const tNav = useTranslations("nav");
  const tNfc = useTranslations("nfcAlbum");
  const [exiting, setExiting] = useState(false);
  const [headerDecodeMode, setHeaderDecodeMode] = useState<DecodeMode>("in");
  const [pairBusy, setPairBusy] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [codeEntryFading, setCodeEntryFading] = useState(false);

  const isClubDesktop = world.atmosphere === "club" && !isMobile;
  const nfcClub = useNfcClubSession(isClubDesktop);

  const useSlotScene =
    world.atmosphere === "cosmos" || world.atmosphere === "nano" || world.atmosphere === "club";
  const useGlobalBackground = useSlotScene;

  useEffect(() => {
    setHeaderDecodeMode("in");
    const timer = window.setTimeout(() => setHeaderDecodeMode("static"), HEADER_DECODE_MS);
    return () => window.clearTimeout(timer);
  }, [world.id]);

  const headerDecodeMs =
    headerDecodeMode === "out" && isMobile ? MOBILE_BACK_TEXT_MS : HEADER_DECODE_MS;

  const handleBackClick = useCallback(() => {
    if (headerDecodeMode === "out") return;
    setHeaderDecodeMode("out");

    if (isMobile) {
      if (useSlotScene && world.songs.length > 0) {
        setExiting(true);
      } else {
        window.setTimeout(() => onBack(), MOBILE_BACK_TEXT_MS);
      }
      return;
    }

    const continueBack = () => {
      if (useSlotScene && world.songs.length > 0) {
        setExiting(true);
        return;
      }
      onBack();
    };

    window.setTimeout(continueBack, HEADER_DECODE_MS);
  }, [headerDecodeMode, isMobile, onBack, useSlotScene, world.songs.length]);

  const handleExitComplete = useCallback(() => {
    if (isMobile) {
      onBack();
      return;
    }
    setExiting(false);
    onBack();
  }, [isMobile, onBack]);

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

  const handlePairCode = useCallback(
    async (code: string) => {
      setPairBusy(true);
      setPairError(null);
      const ok = await nfcClub.pairCode(code);
      if (ok) {
        setCodeEntryFading(true);
      } else {
        setPairError(tNfc("pairFailed"));
      }
      setPairBusy(false);
      return ok;
    },
    [nfcClub, tNfc]
  );

  const showCodeEntry =
    isClubDesktop &&
    (nfcClub.entryVisible || codeEntryFading) &&
    (!nfcClub.authenticated || codeEntryFading);

  useEffect(() => {
    if (!isClubDesktop) {
      setCodeEntryFading(false);
      setPairError(null);
    }
  }, [isClubDesktop, world.id]);

  return (
    <div
      className={`relative min-h-[100dvh] bg-transparent pt-[calc(5.5rem+env(safe-area-inset-top))] md:min-h-screen md:pt-24 ${atmosphereClass[world.atmosphere]}`}
    >
      {showCodeEntry ? (
        <NfcClubCodeEntry
          onSubmit={handlePairCode}
          busy={pairBusy}
          error={pairError}
          fadingOut={codeEntryFading}
          onFadeComplete={() => setCodeEntryFading(false)}
        />
      ) : null}
      <WorldAmbientAudio src={world.backgroundAudio} />
      {!useGlobalBackground && (
        <>
          <div className="halftone-overlay" />
          <div className="grain-overlay" />
        </>
      )}

      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-4 pb-2 pt-2 md:pt-6"
        animate={{ opacity: exiting && !isMobile ? 0 : 1 }}
        transition={{ duration: isMobile ? 0.25 : 0.35 }}
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
            duration={headerDecodeMs}
          />
        </button>

        <p className="text-sm lowercase tracking-[0.2em] text-white/50 md:text-[14px] md:tracking-[0.25em]">
          <DecodeText text={t("themeLabel")} mode={headerDecodeMode} duration={headerDecodeMs} />
        </p>
        <DecodeText
          as="h1"
          text={getLocalized(world.albumTitle, locale)}
          mode={headerDecodeMode}
          duration={headerDecodeMs}
          className="mt-1 text-[28px] font-light tracking-wide md:mt-2 md:text-[28px] lg:text-[42px]"
        />
        {!useSlotScene && (
          <p className="mt-6 max-w-2xl text-2xl leading-relaxed text-white/45">
            <DecodeText
              as="span"
              text={getLocalized(world.themeDescription, locale)}
              mode={headerDecodeMode}
              duration={headerDecodeMs}
            />
          </p>
        )}
      </motion.div>

      <div className="relative">
        {useSlotScene && world.songs.length > 0 ? (
          isMobile ? (
            <div className="relative z-20 isolate">
              <MobileAlbumSlotScene
                key={`${world.id}-${world.songs.map((s) => `${s.id}:${s.coverImage}`).join("|")}`}
                songs={world.songs}
                maxSlots={world.slotCount ?? (world.atmosphere === "cosmos" ? 12 : world.atmosphere === "nano" ? 13 : 14)}
                borderClass={borderClass}
                exiting={exiting}
                onExitComplete={handleExitComplete}
                locale={locale}
              />
            </div>
          ) : (
            <div className="relative">
              <AlbumSlotScene
                key={`${world.id}-${world.songs.map((s) => `${s.id}:${s.coverImage}`).join("|")}`}
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
                nfcQueue={
                  nfcClub.authenticated && nfcClub.tracks.length > 0
                    ? {
                        trackCount: nfcClub.tracks.length,
                        activeIndex: nfcClub.activeTrackIndex,
                        playing: nfcClub.playing,
                        onSelectIndex: nfcClub.togglePlayAtIndex,
                      }
                    : undefined
                }
              />
              {isClubDesktop && nfcClub.authenticated ? (
                <NfcClubSessionBadge remainingMs={nfcClub.remainingMs} />
              ) : null}
              <audio ref={nfcClub.audioRef} preload="auto" className="hidden" />
            </div>
          )
        ) : (
          <p className="relative z-10 mx-auto max-w-6xl px-4 text-sm text-white/40">—</p>
        )}
        {!isMobile && <WorldLinkButtonOverlay linkButton={world.linkButton} locale={locale} />}
      </div>
    </div>
  );
}
