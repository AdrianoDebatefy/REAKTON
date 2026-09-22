import { getTranslations } from "next-intl/server";

/** Server-rendered copy for crawlers and screen readers — does not affect the visual hero layout. */
export async function HomeSeoIntro() {
  const t = await getTranslations("meta");

  return (
    <div className="sr-only">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}
