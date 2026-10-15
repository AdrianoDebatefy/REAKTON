"use client";

import type { CSSProperties } from "react";
import type { Locale, WorldLinkButton } from "@/types/content";
import { Link } from "@/i18n/routing";
import { getLocalized } from "@/lib/locale";
import { normalizeWorldLinkButton, worldLinkButtonStyle } from "@/lib/world-link-button";

function useLinkButtonContent(linkButton: WorldLinkButton | null | undefined, locale: Locale) {
  const config = normalizeWorldLinkButton(linkButton);
  if (!config.enabled) return null;

  const url = config.url.trim();
  const label = getLocalized(config.label, locale).trim();
  if (!url || !label) return null;

  return { config, url, label };
}

/** Mobile: top-right in the world header row, aligned with album title (e.g. Clip:Clap:Club). */
export function WorldLinkButtonMobileHeader({
  linkButton,
  locale,
}: {
  linkButton?: WorldLinkButton | null;
  locale: Locale;
}) {
  const content = useLinkButtonContent(linkButton, locale);
  if (!content) return null;

  const { config, url, label } = content;
  const className =
    "shrink-0 max-w-[46vw] border border-white/25 px-2.5 py-2 text-center text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-black/85 shadow-lg transition hover:brightness-110 sm:max-w-[40vw] sm:px-3 sm:text-[11px]";
  const style: CSSProperties = { backgroundColor: config.backgroundColor };
  const isInternal = url.startsWith("/") && !url.startsWith("//");

  if (isInternal) {
    return (
      <Link href={url} className={className} style={style}>
        {label}
      </Link>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {label}
    </a>
  );
}

/** Desktop: positioned via admin canvas (1920×1080). Hidden on mobile — use WorldLinkButtonMobileHeader. */
export function WorldLinkButtonOverlay({
  linkButton,
  locale,
}: {
  linkButton?: WorldLinkButton | null;
  locale: Locale;
}) {
  const content = useLinkButtonContent(linkButton, locale);
  if (!content) return null;

  const { config, url, label } = content;

  const className =
    "pointer-events-auto absolute z-40 flex items-center justify-center overflow-hidden border border-white/25 px-4 text-center text-[3.5rem] font-medium uppercase leading-none tracking-[0.12em] text-black/85 shadow-lg transition hover:brightness-110 lg:text-[4rem]";

  const style = worldLinkButtonStyle(config);
  const isInternal = url.startsWith("/") && !url.startsWith("//");

  if (isInternal) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
        <Link href={url} className={className} style={style}>
          {label}
        </Link>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {label}
      </a>
    </div>
  );
}
