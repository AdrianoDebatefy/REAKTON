import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";

export default async function PressPage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as "de" | "en";
  const t = await getTranslations("press");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light tracking-wide">{t("title")}</h1>
      <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
      <ul className="mt-12 space-y-8">
        {content.press.map((entry) => (
          <li key={entry.id} className="border-b border-white/10 pb-8">
            <p className="text-[10px] uppercase tracking-widest text-white/40">{entry.outlet}</p>
            <h2 className="mt-2 text-lg font-light">{entry.title[locale]}</h2>
            {entry.excerpt && (
              <p className="mt-2 text-sm text-white/55">{entry.excerpt[locale]}</p>
            )}
            <p className="mt-2 text-xs text-white/35">{entry.date}</p>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs uppercase tracking-widest text-white/70 underline"
            >
              {t("readMore")} →
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
