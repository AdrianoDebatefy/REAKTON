import type { Metadata, Viewport } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NfcPlayPageClient } from "@/components/nfc/NfcPlayPageClient";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/types/content";

/** NFC player uses live session/API — avoid static prerender (prevents next-intl ENVIRONMENT_FALLBACK). */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050508",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nfcAlbum" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/nfc/play",
    title: t("title"),
    description: t("subtitle"),
    noIndex: true,
  });
}

export default async function NfcPlayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NfcPlayPageClient />;
}
