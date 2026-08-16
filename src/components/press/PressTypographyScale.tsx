"use client";

import { useEffect } from "react";

/** Press routes use 200% root font-size (see globals.css `.site-press`). */
export function PressTypographyScale() {
  useEffect(() => {
    document.documentElement.classList.add("site-press");
    return () => {
      document.documentElement.classList.remove("site-press");
    };
  }, []);

  return null;
}
