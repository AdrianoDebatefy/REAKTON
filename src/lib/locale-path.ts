import type { Locale } from "@/types/content";
import { routing } from "@/i18n/routing";

function isLocaleSegment(segment: string): segment is Locale {
  return (routing.locales as readonly string[]).includes(segment);
}

/** Strip leading locale segment (`/de/press` → `/press`, `/de` → `/`). */
export function stripLocaleFromPathname(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length > 0 && isLocaleSegment(segments[0])) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }

  return normalized || "/";
}

/** Build a public URL path for the given locale (input may include a locale prefix). */
export function buildLocalizedPath(pathname: string, locale: Locale): string {
  const normalized = stripLocaleFromPathname(pathname);

  if (routing.localePrefix === "always") {
    if (normalized === "/") {
      return `/${locale}`;
    }
    return `/${locale}${normalized}`;
  }

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
