import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteLocalizedUrl, SITEMAP_PATHS } from "@/lib/seo";
import type { Locale } from "@/types/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SITEMAP_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteLocalizedUrl(path, locale as Locale),
      lastModified,
      changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.7,
    }))
  );
}
