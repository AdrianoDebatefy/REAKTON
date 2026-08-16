import { notFound } from "next/navigation";
import { PressPlayerPageClient } from "@/components/press/PressPlayerPageClient";
import { isPlayerSlugReady } from "@/lib/press-player-layout";
import { routing } from "@/i18n/routing";

const PRESS_PLAYER_SLUGS = ["wem", "mmn", "ccc"] as const;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PRESS_PLAYER_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export default async function PressPlayerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  if (!isPlayerSlugReady(slug)) notFound();

  return <PressPlayerPageClient slug={slug} />;
}
