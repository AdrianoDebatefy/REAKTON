"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  PRESS_WORLD_ORDER,
  PRESS_WORLD_THEME,
  pressWorldLabel,
} from "@/lib/press-preview-theme";
import {
  isPressPlayerAssetsReady,
  playerSlugFromAtmosphere,
} from "@/lib/press-player-layout";

/** World picker on /press — links open dedicated player pages. */
export function PressPreviewSection() {
  const locale = useLocale();
  const t = useTranslations("pressPreview");

  return (
    <section className="mb-14 border-b border-white/10 pb-12">
      <h2 className="text-sm uppercase tracking-[0.35em] text-white/45">{t("sectionTitle")}</h2>
      <p className="mt-2 text-sm text-white/50">{t("sectionSubtitle")}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {PRESS_WORLD_ORDER.map((world) => {
          const worldTheme = PRESS_WORLD_THEME[world];
          const slug = playerSlugFromAtmosphere(world);
          const playerReady = isPressPlayerAssetsReady(world);

          if (playerReady && slug) {
            return (
              <Link
                key={world}
                href={`/press/player/${slug}`}
                className={`block w-full border px-4 py-5 text-center text-xs uppercase tracking-[0.25em] text-white transition ${worldTheme.button} ${worldTheme.glow}`}
              >
                {pressWorldLabel(world, locale)}
              </Link>
            );
          }

          return (
            <div
              key={world}
              className={`w-full cursor-not-allowed border px-4 py-5 text-center text-xs uppercase tracking-[0.25em] text-white opacity-40 ${worldTheme.button}`}
            >
              {pressWorldLabel(world, locale)}
              <span className="mt-1 block text-xs normal-case tracking-normal text-white/50">
                {t("playerWorldSoon")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
