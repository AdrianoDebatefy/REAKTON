import type { CSSProperties } from "react";
import type { WorldLinkButton } from "@/types/content";
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

export function worldLinkButtonStyle(button: WorldLinkButton): CSSProperties {
  return {
    left: `${(button.x / WORLD_LINK_DESIGN_WIDTH) * 100}%`,
    top: `${(button.y / WORLD_LINK_DESIGN_HEIGHT) * 100}%`,
    width: `${(WORLD_LINK_BUTTON_WIDTH / WORLD_LINK_DESIGN_WIDTH) * 100}%`,
    height: `${(WORLD_LINK_BUTTON_HEIGHT / WORLD_LINK_DESIGN_HEIGHT) * 100}%`,
    backgroundColor: button.backgroundColor,
  };
}
