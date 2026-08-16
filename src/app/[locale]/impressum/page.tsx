import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";
import { getLocalized } from "@/lib/locale";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/types/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/impressum",
    title: t("impressumTitle"),
    description: t("impressumDescription"),
  });
}

export default async function ImpressumPage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light">{t("impressumTitle")}</h1>
      <pre className="mt-8 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/70">
        {getLocalized(content.impressum, locale)}
      </pre>
    </div>
  );
}
