import type { CSSProperties } from "react";

/** Mobile Chrome / Brave often pause audio in display:none — use native playback first. */

export function nfcPreferNativeAudioPlayback(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Visually hidden but still “shown” for the media pipeline (not display:none). */
export const NFC_AUDIO_ELEMENT_STYLE: CSSProperties = {
  position: "fixed",
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
  left: 0,
  bottom: 0,
  zIndex: -1,
};
