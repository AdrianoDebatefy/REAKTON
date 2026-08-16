import { notFound } from "next/navigation";
import { PressPlayerPageClient } from "@/components/press/PressPlayerPageClient";
import { isPlayerSlugReady } from "@/lib/press-player-layout";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    [{ locale, slug: "wem" }]
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
