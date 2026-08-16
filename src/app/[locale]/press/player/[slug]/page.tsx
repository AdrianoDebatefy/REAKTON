import { notFound } from "next/navigation";
import { PressPlayerPageClient } from "@/components/press/PressPlayerPageClient";
import { isPlayerSlugReady } from "@/lib/press-player-layout";

export default async function PressPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isPlayerSlugReady(slug)) notFound();

  return <PressPlayerPageClient slug={slug} />;
}
