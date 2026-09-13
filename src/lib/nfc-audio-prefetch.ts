import { nfcCanonicalAudioUrl, nfcResolveAudioUrl } from "@/lib/nfc-audio-playback";

const MAX_WARM = 3;
const warmByKey = new Map<string, HTMLAudioElement>();

function streamSrc(playbackUrl: string): string {
  if (playbackUrl.startsWith("blob:")) return playbackUrl;
  if (playbackUrl.startsWith("http")) return nfcCanonicalAudioUrl(playbackUrl);
  return nfcResolveAudioUrl(nfcCanonicalAudioUrl(playbackUrl));
}

/** Warm browser cache for the next/prev MP3 (streaming only). */
export function nfcPrefetchStreamTrack(playbackUrl: string, sourceUrl?: string): void {
  if (typeof window === "undefined") return;
  if (!playbackUrl?.trim() || playbackUrl.startsWith("blob:")) return;

  const key = sourceUrl ?? nfcCanonicalAudioUrl(playbackUrl);
  if (warmByKey.has(key)) return;

  while (warmByKey.size >= MAX_WARM) {
    const first = warmByKey.keys().next().value;
    if (!first) break;
    const el = warmByKey.get(first);
    el?.removeAttribute("src");
    warmByKey.delete(first);
  }

  const audio = new Audio();
  audio.preload = "auto";
  audio.src = streamSrc(playbackUrl);
  warmByKey.set(key, audio);
}

export function nfcPrefetchAdjacentStreamTracks(
  tracks: { audioUrl: string; sourceUrl?: string }[],
  currentIndex: number
): void {
  if (tracks.length < 2) return;
  const n = tracks.length;
  const next = tracks[(currentIndex + 1) % n];
  const prev = tracks[(currentIndex - 1 + n) % n];
  if (next?.audioUrl) nfcPrefetchStreamTrack(next.audioUrl, next.sourceUrl);
  if (prev?.audioUrl) nfcPrefetchStreamTrack(prev.audioUrl, prev.sourceUrl);
}

const albumHttpCacheWarmKeys = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * After playback starts: download remaining MP3s sequentially into the browser HTTP cache
 * (not RAM blobs). Next NFC visit reuses cache when still valid (nginx Cache-Control).
 */
export function nfcWarmAlbumHttpCacheInBackground(
  tracks: { audioUrl: string; sourceUrl?: string }[],
  options?: { signal?: AbortSignal; startDelayMs?: number }
): void {
  if (typeof window === "undefined") return;

  const list = tracks.filter((t) => t.audioUrl?.trim() && !t.audioUrl.startsWith("blob:"));
  if (list.length === 0) return;

  void (async () => {
    const delay = options?.startDelayMs ?? 3_000;
    if (delay > 0) {
      await sleep(delay);
      if (options?.signal?.aborted) return;
    }

    for (const track of list) {
      if (options?.signal?.aborted) return;

      const key = track.sourceUrl ?? nfcCanonicalAudioUrl(track.audioUrl);
      if (albumHttpCacheWarmKeys.has(key)) continue;

      const url = streamSrc(track.audioUrl);
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) continue;
        await res.blob();
        albumHttpCacheWarmKeys.add(key);
      } catch {
        /* network or abort — skip */
      }
    }
  })();
}
