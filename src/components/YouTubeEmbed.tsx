"use client";

import { useCookieConsent } from "@/context/CookieContext";
import { getYouTubeId } from "@/lib/youtube-url";

export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const { canLoadYouTube } = useCookieConsent();
  const id = getYouTubeId(url);

  if (!canLoadYouTube) {
    return (
      <div className="flex aspect-video items-center justify-center rounded border border-white/10 bg-white/5 text-sm text-white/50">
        YouTube — Cookie consent required
      </div>
    );
  }

  if (!id) return null;

  return (
    <iframe
      title={title}
      src={`https://www.youtube-nocookie.com/embed/${id}`}
      className="aspect-video w-full rounded"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}
