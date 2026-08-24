"use client";

import type { Locale, WorldLinkButton } from "@/types/content";
import { Link } from "@/i18n/routing";
import { getLocalized } from "@/lib/locale";
import { normalizeWorldLinkButton, worldLinkButtonStyle } from "@/lib/world-link-button";

export function WorldLinkButtonOverlay({
  linkButton,
  locale,
}: {
  linkButton?: WorldLinkButton | null;
  locale: Locale;
}) {
  const config = normalizeWorldLinkButton(linkButton);
  if (!config.enabled) return null;

  const url = config.url.trim();
  const label = getLocalized(config.label, locale).trim();
  if (!url || !label) return null;

  const className =
    "pointer-events-auto absolute z-40 flex items-center justify-center overflow-hidden border border-white/25 px-4 text-center text-[3.5rem] font-medium uppercase leading-none tracking-[0.12em] text-black/85 shadow-lg transition hover:brightness-110 md:text-[4rem]";

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
