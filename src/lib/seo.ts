import type { Metadata } from "next";
import type { Locale } from "@/types/content";
import { routing } from "@/i18n/routing";
import { buildLocalizedPath } from "@/lib/locale-path";
import { getSiteUrl } from "@/lib/site-url";

const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  de: "de_DE",
  en: "en_US",
  ja: "ja_JP",
};

export function absoluteLocalizedUrl(path: string, locale: Locale): string {
  const localizedPath = buildLocalizedPath(path, locale);
  const siteUrl = getSiteUrl();
  if (localizedPath === "/") return siteUrl;
  return `${siteUrl}${localizedPath}`;
}

export function buildLanguageAlternates(path: string): NonNullable<Metadata["alternates"]>["languages"] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteLocalizedUrl(path, locale as Locale);
  }
  languages["x-default"] = absoluteLocalizedUrl(path, routing.defaultLocale as Locale);
  return languages;
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  noIndex = false,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
}): Metadata {
  const pageUrl = absoluteLocalizedUrl(path, locale);
  const ogImage = `${getSiteUrl()}/brand/reakton-logo.svg`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: buildLanguageAlternates(path),
    },
    openGraph: {
      title,
      description,
      siteName: "REAKTON",
      url: pageUrl,
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: routing.locales
        .filter((entry) => entry !== locale)
        .map((entry) => OPEN_GRAPH_LOCALE[entry as Locale]),
      type: "website",
      images: [
        {
          url: ogImage,
          alt: "REAKTON",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Public routes included in the sitemap (press player excluded — login-only). */
export const SITEMAP_PATHS = [
  "/",
  "/press",
  "/live",
  "/merch",
  "/toy",
  "/contact",
  "/impressum",
  "/datenschutz",
] as const;
