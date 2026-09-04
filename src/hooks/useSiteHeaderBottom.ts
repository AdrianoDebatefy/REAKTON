"use client";

import { useEffect, useState } from "react";

export function useSiteHeaderBottom(fallbackPx = 80): number {
  const [bottom, setBottom] = useState(fallbackPx);

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      if (!header) return;
      const next = Math.ceil(header.getBoundingClientRect().bottom);
      if (next > 0) setBottom(next);
    };

    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    const header = document.querySelector("header");
    if (header) observer.observe(header);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [fallbackPx]);

  return bottom;
}
