import type { Locale } from "@/types/content";
import { routing } from "@/i18n/routing";

/** Pathname without locale prefix (e.g. `/press`). */
export function buildLocalizedPath(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const usePrefix = locale !== routing.defaultLocale;

  if (!usePrefix) {
    return normalized;
  }

  if (normalized === "/") {
    return `/${locale}`;
  }

  return `/${locale}${normalized}`;
}

export function setLocaleCookie(locale: Locale): void {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
