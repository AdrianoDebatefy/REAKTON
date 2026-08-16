import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PressPlayerPageClient } from "@/components/press/PressPlayerPageClient";
import {
  atmosphereFromPlayerSlug,
  isPlayerSlugReady,
} from "@/lib/press-player-layout";
import { pressWorldLabel } from "@/lib/press-preview-theme";
import { buildPageMetadata } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/types/content";

const PRESS_PLAYER_SLUGS = ["wem", "mmn", "ccc"] as const;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PRESS_PLAYER_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const atmosphere = atmosphereFromPlayerSlug(slug);
  const t = await getTranslations({ locale, namespace: "pressPreview" });

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/press/player/${slug}`,
    title: atmosphere ? pressWorldLabel(atmosphere, locale) : t("playerLabel"),
    description: t("loginHint"),
    noIndex: true,
  });
}

export default async function PressPlayerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  if (!isPlayerSlugReady(slug)) notFound();

  return <PressPlayerPageClient slug={slug} />;
}
