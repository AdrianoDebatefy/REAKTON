import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";

export default async function ImpressumPage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as "de" | "en";
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light">{t("impressumTitle")}</h1>
      <pre className="mt-8 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/70">
        {content.impressum[locale]}
      </pre>
    </div>
  );
}
