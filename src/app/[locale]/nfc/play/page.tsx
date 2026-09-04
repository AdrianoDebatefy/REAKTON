import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NfcPlayPageClient } from "@/components/nfc/NfcPlayPageClient";
import { buildPageMetadata } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/types/content";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

export default function NfcPlayPage() {
  return <NfcPlayPageClient />;
}
