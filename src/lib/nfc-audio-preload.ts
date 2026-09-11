import { nfcCanonicalAudioUrl, nfcResolveAudioUrl } from "@/lib/nfc-audio-playback";

export type NfcPreloadedTrack = {
  id: string;
  title: string;
  audioUrl: string;
  sourceUrl: string;
  order: number;
};

const PRELOAD_CONCURRENCY = 2;

export type NfcPreloadProgress = {
  completed: number;
  total: number;
  loadedBytes: number;
};

export type NfcPreloadResult = {
  tracks: NfcPreloadedTrack[];
  blobUrls: string[];
};

async function fetchTrackToBlob(audioUrl: string): Promise<{ sourceUrl: string; blobUrl: string; bytes: number }> {
  const sourceUrl = nfcCanonicalAudioUrl(audioUrl);
  const fetchUrl = sourceUrl.startsWith("http") ? sourceUrl : nfcResolveAudioUrl(sourceUrl);
  const res = await fetch(fetchUrl, { credentials: "same-origin" });
  if (!res.ok) throw new Error("nfc_preload_fetch_failed");
  const blob = await res.blob();
  return {
    sourceUrl,
    blobUrl: URL.createObjectURL(blob),
    bytes: blob.size,
  };
}

/**
 * Download every album MP3 into RAM (blob URLs). Serialized in small batches
 * so progress stays smooth and the radio stack is not overwhelmed.
 */
export async function preloadNfcAlbumTracks(
  tracks: { id: string; title: string; audioUrl: string; order: number }[],
  onProgress: (progress: NfcPreloadProgress) => void
): Promise<NfcPreloadResult> {
  const list = tracks.filter((t) => t.audioUrl?.trim());
  const total = list.length;
  const blobUrls: string[] = [];
  let completed = 0;
  let loadedBytes = 0;

  onProgress({ completed: 0, total, loadedBytes: 0 });

  const results: NfcPreloadedTrack[] = [];

  let index = 0;
  async function worker(): Promise<void> {
    while (index < list.length) {
      const i = index;
      index += 1;
      const track = list[i];
      const { sourceUrl, blobUrl, bytes } = await fetchTrackToBlob(track.audioUrl);
      blobUrls.push(blobUrl);
      results.push({
        id: track.id,
        title: track.title,
        order: track.order,
        audioUrl: blobUrl,
        sourceUrl,
      });
      completed += 1;
      loadedBytes += bytes;
      onProgress({ completed, total, loadedBytes });
    }
  }

  const workers = Array.from({ length: Math.min(PRELOAD_CONCURRENCY, total) }, () => worker());
  await Promise.all(workers);

  results.sort((a, b) => a.order - b.order);

  return { tracks: results, blobUrls };
}

export function revokeNfcPreloadBlobs(blobUrls: string[]): void {
  for (const url of blobUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

export function formatPreloadMegabytes(bytes: number): string {
  if (bytes < 1_024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
