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
    "shrink-0 flex h-[3.25rem] min-w-[6.75rem] max-w-[42vw] items-center justify-center border border-white/25 px-2 text-center text-[9px] font-semibold uppercase leading-[1.15] tracking-[0.04em] text-black/85 shadow-lg transition hover:brightness-110 sm:h-[3.5rem] sm:min-w-[7.25rem] sm:px-2.5 sm:text-[10px]";
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
