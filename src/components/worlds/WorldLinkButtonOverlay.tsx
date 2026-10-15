"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const MOBILE_LINK_CLASS =
  "flex h-[3.25rem] min-w-[6.75rem] max-w-[42vw] touch-manipulation items-center justify-center border border-white/25 px-2 text-center text-[9px] font-semibold uppercase leading-[1.15] tracking-[0.04em] text-black/85 shadow-lg transition hover:brightness-110 sm:h-[3.5rem] sm:min-w-[7.25rem] sm:px-2.5 sm:text-[10px]";

/**
 * Mobile: aligned with album title in the header row. The clickable link is portaled
 * to document.body (fixed, z-[100]) so it sits above the cover scene like the
 * pre-header overlay did — the in-header layer only reserves layout space.
 */
export function WorldLinkButtonMobileHeader({
  linkButton,
  locale,
}: {
  linkButton?: WorldLinkButton | null;
  locale: Locale;
}) {
  const content = useLinkButtonContent(linkButton, locale);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!content) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const measure = () => {
      const rect = anchor.getBoundingClientRect();
      setBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(anchor);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [content]);

  if (!content) return null;

  const { config, url, label } = content;
  const style: CSSProperties = { backgroundColor: config.backgroundColor };
  const isInternal = url.startsWith("/") && !url.startsWith("//");

  const fixedStyle: CSSProperties | undefined = box
    ? {
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        zIndex: 100,
        ...style,
      }
    : undefined;

  const portalLink =
    portalReady && box && fixedStyle
      ? createPortal(
          isInternal ? (
            <Link href={url} className={MOBILE_LINK_CLASS} style={fixedStyle}>
              {label}
            </Link>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={MOBILE_LINK_CLASS}
              style={fixedStyle}
            >
              {label}
            </a>
          ),
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={anchorRef}
        className="h-[3.25rem] min-w-[6.75rem] max-w-[42vw] shrink-0 sm:h-[3.5rem] sm:min-w-[7.25rem]"
        aria-hidden
      />
      {portalLink}
    </>
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
