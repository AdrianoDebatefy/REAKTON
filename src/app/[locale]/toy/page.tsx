import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function ToyPage() {
  const t = await getTranslations("toy");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 text-center">
      <p className="text-sm uppercase tracking-[0.35em] text-sky-200/50">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl font-light tracking-wide md:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-white/55">{t("subtitle")}</p>

      <div className="mt-10 rounded-md border border-sky-200/20 bg-[rgb(28_42_72/0.45)] px-6 py-8 backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-200/85">{t("comingSoon")}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/45">{t("hint")}</p>
      </div>

      <Link
        href="/"
        className="mt-10 inline-block rounded border border-white/20 px-6 py-3 text-sm uppercase tracking-widest text-white/70 transition hover:border-white/35 hover:bg-white/5"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
