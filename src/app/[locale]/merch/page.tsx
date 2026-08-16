import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/types/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "merch" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/merch",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function MerchPage() {
  const content = getSiteContent();
  const t = await getTranslations("merch");
  const shopUrl = content.siteLinks.merchandise.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light tracking-wide">{t("title")}</h1>
      <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
      {shopUrl && (
        <div className="mt-12">
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded border border-white/20 px-8 py-4 text-center text-sm uppercase tracking-widest transition hover:bg-white/10"
          >
            {t("title")}
          </a>
        </div>
      )}
    </div>
  );
}
