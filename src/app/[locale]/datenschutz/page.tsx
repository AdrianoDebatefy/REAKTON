import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";
import { getLocalized } from "@/lib/locale";
import type { Locale } from "@/types/content";

export default async function DatenschutzPage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light">{t("datenschutzTitle")}</h1>
      <pre className="mt-8 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/70">
        {getLocalized(content.datenschutz, locale)}
      </pre>
    </div>
  );
}
