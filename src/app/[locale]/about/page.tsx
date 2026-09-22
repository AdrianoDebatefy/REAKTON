import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";
import { getLocalized } from "@/lib/locale";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/types/content";

const SIDE_LINE_INTERVIEW_URL =
  "https://www.side-line.com/click-interview-with-reakton-how-would-it-sound-if-kraftwerk-continued-to-write-music/";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/about",
    title: t("title"),
    description: t("metaDescription"),
  });
}

export default async function AboutPage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light tracking-wide md:text-3xl">{t("title")}</h1>
      <p className="mt-6 text-sm leading-relaxed text-white/70 md:text-base">{t("intro")}</p>
      <figure className="my-8 border-l-2 border-white/25 pl-5">
        <blockquote className="text-base font-light italic leading-relaxed text-white/85 md:text-lg">
          &ldquo;{t("quote")}&rdquo;
        </blockquote>
        <figcaption className="mt-3 text-xs text-white/45">{t("quoteAttribution")}</figcaption>
      </figure>
      <p className="text-sm leading-relaxed text-white/70 md:text-base">{t("body")}</p>
      <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">{t("body2")}</p>
      <p className="mt-8">
        <a
          href={SIDE_LINE_INTERVIEW_URL}
          className="text-sm uppercase tracking-widest text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white/80"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("sideLineLink")}
        </a>
      </p>
      <h2 className="mt-12 text-lg font-light tracking-wide text-white/90">{t("albumsHeading")}</h2>
      <ul className="mt-4 space-y-3 text-sm text-white/65">
        {content.worlds.map((world) => (
          <li key={world.id}>
            <span className="text-white/85">{getLocalized(world.albumTitle, locale)}</span>
            <span className="text-white/40"> — {getLocalized(world.themeDescription, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
