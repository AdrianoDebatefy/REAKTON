import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/types/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/contact",
    title: t("title"),
    description: t("metaDescription"),
  });
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
