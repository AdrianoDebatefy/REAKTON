"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCookieConsent } from "@/context/CookieContext";

export function CookieBanner() {
  const t = useTranslations("cookie");
  const { hasChosen, acceptAll, acceptEssential } = useCookieConsent();

  if (hasChosen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-black/90 p-4 backdrop-blur-md md:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="cookie-title" className="text-sm font-medium tracking-wide">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs text-white/70 md:text-sm">{t("description")}</p>
          <Link href="/datenschutz" className="mt-1 inline-block text-xs text-white/50 underline">
            {t("privacy")}
          </Link>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={acceptEssential}
            className="rounded border border-white/20 px-4 py-2 text-xs uppercase tracking-wider transition hover:bg-white/10"
          >
            {t("essential")}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded bg-white px-4 py-2 text-xs font-medium uppercase tracking-wider text-black transition hover:bg-white/90"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
