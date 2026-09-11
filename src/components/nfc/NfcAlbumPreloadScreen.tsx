"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  formatPreloadMegabytes,
  preloadNfcAlbumTracks,
  type NfcPreloadedTrack,
  type NfcPreloadProgress,
} from "@/lib/nfc-audio-preload";

interface NfcAlbumPreloadScreenProps {
  tracks: { id: string; title: string; audioUrl: string; order: number }[];
  onReady: (tracks: NfcPreloadedTrack[], blobUrls: string[]) => void;
  onError: () => void;
}

export function NfcAlbumPreloadScreen({ tracks, onReady, onError }: NfcAlbumPreloadScreenProps) {
  const t = useTranslations("nfcAlbum");
  const [progress, setProgress] = useState<NfcPreloadProgress>({
    completed: 0,
    total: tracks.length,
    loadedBytes: 0,
  });
  const trackKey = tracks.map((t) => t.id).join("|");

  useEffect(() => {
    let cancelled = false;

    void preloadNfcAlbumTracks(tracks, setProgress)
      .then((result) => {
        if (cancelled) return;
        onReady(result.tracks, result.blobUrls);
      })
      .catch(() => {
        if (!cancelled) onError();
      });

    return () => {
      cancelled = true;
    };
  }, [trackKey, tracks, onReady, onError]);

  const ratio = progress.total > 0 ? progress.completed / progress.total : 0;
  const percent = Math.min(100, Math.round(ratio * 100));

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-[#050508] px-8">
      <p className="text-center text-sm uppercase tracking-[0.35em] text-white/50">{t("title")}</p>
      <h1 className="mt-4 text-center text-xl font-light tracking-wide text-white">{t("preloadTitle")}</h1>
      <p className="mt-2 text-center text-sm text-white/45">{t("preloadHint")}</p>

      <div className="mt-10 w-full max-w-xs">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/85 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-white/50">
          <span>{t("preloadTracks", { done: progress.completed, total: progress.total })}</span>
          <span>{formatPreloadMegabytes(progress.loadedBytes)}</span>
        </div>
      </div>
    </div>
  );
}
