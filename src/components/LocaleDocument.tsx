"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/** Sets document lang + public-site class (desktop font scale). */
export function LocaleDocument() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.add("site-public");
    return () => {
      document.documentElement.classList.remove("site-public");
    };
  }, [locale]);

  return null;
}
