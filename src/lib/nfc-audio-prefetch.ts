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
