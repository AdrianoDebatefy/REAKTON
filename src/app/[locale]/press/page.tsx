import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";
import { getLocalized } from "@/lib/locale";
import type { Locale } from "@/types/content";

export default async function PressPage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("press");

  const entries = content.press.filter(
    (entry) => entry.url.trim() || entry.image?.trim()
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light tracking-wide">{t("title")}</h1>
      <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
      <ul className="mt-12 space-y-10">
        {entries.map((entry) => {
          const title = getLocalized(entry.title, locale);
          const excerpt = getLocalized(entry.excerpt, locale);
          const hasLink = entry.url.trim().length > 0;

          return (
            <li key={entry.id} className="border-b border-white/10 pb-10">
              {entry.image ? (
                hasLink ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.image}
                      alt={title || entry.outlet || t("title")}
                      className="max-h-64 w-full rounded border border-white/10 object-cover object-center"
                    />
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.image}
                    alt={title || entry.outlet || t("title")}
                    className="max-h-64 w-full rounded border border-white/10 object-cover object-center"
                  />
                )
              ) : null}

              {entry.outlet ? (
                <p className="mt-4 text-[10px] uppercase tracking-widest text-white/40">
                  {entry.outlet}
                </p>
              ) : null}

              {title ? <h2 className="mt-2 text-lg font-light">{title}</h2> : null}

              {excerpt ? (
                <p className="mt-2 text-sm text-white/55">{excerpt}</p>
              ) : null}

              {entry.date ? (
                <p className="mt-2 text-xs text-white/35">{entry.date}</p>
              ) : null}

              {hasLink ? (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs uppercase tracking-widest text-white/70 underline"
                >
                  {t("readMore")} →
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
