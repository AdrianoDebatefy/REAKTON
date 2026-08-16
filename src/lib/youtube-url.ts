/** Demo URLs shipped in seed content — must not show a video button. */
const TEMPLATE_VIDEO_URLS = new Set([
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ",
  "https://www.youtube.com/embed/dQw4w9WgXcQ",
]);

export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&/]+)/,
    /[?&]v=([^?&/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Normalize slot video URL: empty/template values become undefined. */
export function resolveSongVideoUrl(url?: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed || TEMPLATE_VIDEO_URLS.has(trimmed)) return undefined;
  return trimmed;
}

export function hasSongVideoUrl(url?: string): boolean {
  const resolved = resolveSongVideoUrl(url);
  return Boolean(resolved && getYouTubeId(resolved));
}
