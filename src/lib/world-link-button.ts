import type { CSSProperties } from "react";
import type { WorldLinkButton } from "@/types/content";
import type { Locale } from "@/types/content";
import { emptyLocalized } from "@/lib/locale";

/** Design reference canvas (px) for admin position fields. */
export const WORLD_LINK_DESIGN_WIDTH = 1920;
export const WORLD_LINK_DESIGN_HEIGHT = 1080;

export const WORLD_LINK_BUTTON_WIDTH = 600;
export const WORLD_LINK_BUTTON_HEIGHT = 100;

export function defaultWorldLinkButton(): WorldLinkButton {
  return {
    enabled: false,
    label: emptyLocalized(),
    url: "",
    backgroundColor: "#c1e5f9",
    x: 960,
    y: 540,
  };
}

export function normalizeWorldLinkButton(button?: WorldLinkButton | null): WorldLinkButton {
  const defaults = defaultWorldLinkButton();
  return {
    ...defaults,
    ...button,
    label: { ...defaults.label, ...button?.label },
  };
}

/** href for native `<a>` — reliable on mobile (Next.js Link inside layered UI can miss taps). */
export function resolveWorldLinkHref(url: string, locale: Locale): string {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }
  if (!trimmed.startsWith("/")) return trimmed;
  if (/^\/(de|en|ja)(\/|$)/.test(trimmed)) return trimmed;
  return `/${locale}${trimmed === "/" ? "" : trimmed}`;
}

export function isExternalWorldLink(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.startsWith("//") ||
    /^https?:\/\//i.test(trimmed) ||
    (!trimmed.startsWith("/") && trimmed.length > 0)
  );
}

export function worldLinkButtonStyle(button: WorldLinkButton): CSSProperties {
  return {
    left: `${(button.x / WORLD_LINK_DESIGN_WIDTH) * 100}%`,
    top: `${(button.y / WORLD_LINK_DESIGN_HEIGHT) * 100}%`,
    width: `${(WORLD_LINK_BUTTON_WIDTH / WORLD_LINK_DESIGN_WIDTH) * 100}%`,
    height: `${(WORLD_LINK_BUTTON_HEIGHT / WORLD_LINK_DESIGN_HEIGHT) * 100}%`,
    backgroundColor: button.backgroundColor,
  };
}
