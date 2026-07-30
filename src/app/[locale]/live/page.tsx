import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContent } from "@/lib/content";
import { getLocalized } from "@/lib/locale";
import type { Locale } from "@/types/content";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

export default async function LivePage() {
  const content = getSiteContent();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("live");

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light tracking-wide md:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
      <p className="mt-4 text-xs text-white/40">{t("consentRequired")}</p>
      <div className="mt-10 space-y-10">
        {content.liveVideos.map((video) => (
          <section key={video.id}>
            <h2 className="mb-4 text-sm uppercase tracking-widest text-white/60">
              {getLocalized(video.title, locale)}
            </h2>
            <YouTubeEmbed url={video.youtubeUrl} title={getLocalized(video.title, locale)} />
          </section>
        ))}
      </div>
    </div>
  );
}
