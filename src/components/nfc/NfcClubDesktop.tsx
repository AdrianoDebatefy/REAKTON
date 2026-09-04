"use client";

import { useTranslations } from "next-intl";

export function NfcClubSessionBadge({ remainingMs }: { remainingMs: number }) {
  const t = useTranslations("nfcAlbum");
  const min = Math.floor(Math.max(0, remainingMs) / 60_000);
  const sec = Math.floor((Math.max(0, remainingMs) / 1000) % 60);
  const label = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  return (
    <div
      data-player-ui
      className="pointer-events-none absolute right-4 top-4 z-[60] rounded border border-red-400/30 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-widest text-red-200/90"
    >
      {t("clubSession")}: <span className="font-mono text-white">{label}</span>
    </div>
  );
}
