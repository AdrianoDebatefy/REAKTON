"use client";

import { useEffect, useState } from "react";

const MOBILE_WIDTH_QUERY = "(max-width: 767px)";
/** Phones in landscape exceed 767px width — keep NFC player on coarse-touch devices. */
const COARSE_TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(MOBILE_WIDTH_QUERY).matches ||
    window.matchMedia(COARSE_TOUCH_QUERY).matches
  );
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    const widthMedia = window.matchMedia(MOBILE_WIDTH_QUERY);
    const touchMedia = window.matchMedia(COARSE_TOUCH_QUERY);
    const update = () => setIsMobile(widthMedia.matches || touchMedia.matches);
    update();
    widthMedia.addEventListener("change", update);
    touchMedia.addEventListener("change", update);
    return () => {
      widthMedia.removeEventListener("change", update);
      touchMedia.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}
