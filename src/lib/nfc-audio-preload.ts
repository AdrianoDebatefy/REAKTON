import { nfcCanonicalAudioUrl, nfcResolveAudioUrl } from "@/lib/nfc-audio-playback";
import { nfcPreferNativeAudioPlayback } from "@/lib/nfc-audio-platform";

export type NfcPreloadedTrack = {
  id: string;
  title: string;
  audioUrl: string;
  sourceUrl: string;
  order: number;
};

export type NfcPreloadProgress = {
  completed: number;
  total: number;
  loadedBytes: number;
  totalBytes: number | null;
};

export type NfcPreloadResult = {
  tracks: NfcPreloadedTrack[];
  blobUrls: string[];
};

export type NfcPreloadOptions = {
  signal?: AbortSignal;
};

function preloadConcurrency(): number {
  if (typeof navigator === "undefined") return 2;
  if (nfcPreferNativeAudioPlayback() || /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 1;
  }
  return 2;
}

function resolveFetchUrl(audioUrl: string): { sourceUrl: string; fetchUrl: string } {
  const sourceUrl = nfcCanonicalAudioUrl(audioUrl);
  const fetchUrl = sourceUrl.startsWith("http") ? sourceUrl : nfcResolveAudioUrl(sourceUrl);
  return { sourceUrl, fetchUrl };
}

async function estimateTotalBytes(
  tracks: { audioUrl: string }[],
  signal?: AbortSignal
): Promise<number | null> {
  let sum = 0;
  let found = false;
  for (const track of tracks) {
    if (signal?.aborted) return found ? sum : null;
    const { fetchUrl } = resolveFetchUrl(track.audioUrl);
    try {
      const res = await fetch(fetchUrl, {
        method: "HEAD",
        credentials: "same-origin",
        signal,
      });
      const cl = res.headers.get("content-length");
      if (cl) {
        sum += Number.parseInt(cl, 10);
        found = true;
      }
    } catch {
      /* ignore */
    }
  }
  return found ? sum : null;
}

async function fetchTrackToBlob(
  audioUrl: string,
  onChunk: (deltaBytes: number) => void,
  signal?: AbortSignal
): Promise<{ sourceUrl: string; blobUrl: string; bytes: number }> {
  const { sourceUrl, fetchUrl } = resolveFetchUrl(audioUrl);
  const res = await fetch(fetchUrl, {
    credentials: "same-origin",
    signal,
    cache: "default",
    priority: "high",
  } as RequestInit);
  if (!res.ok) throw new Error("nfc_preload_fetch_failed");

  const reader = res.body?.getReader();
  if (!reader) {
    const blob = await res.blob();
    onChunk(blob.size);
    return {
      sourceUrl,
      blobUrl: URL.createObjectURL(blob),
      bytes: blob.size,
    };
  }

  const parts: BlobPart[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    bytes += value.byteLength;
    onChunk(value.byteLength);
  }

  const blob = new Blob(parts, { type: res.headers.get("content-type") ?? "audio/mpeg" });
  return {
    sourceUrl,
    blobUrl: URL.createObjectURL(blob),
    bytes,
  };
}

/**
 * Download every album MP3 into RAM (blob URLs).
 * Mobile: one file at a time (HTTP/1.1 + Brave throttle parallel downloads badly).
 */
export async function preloadNfcAlbumTracks(
  tracks: { id: string; title: string; audioUrl: string; order: number }[],
  onProgress: (progress: NfcPreloadProgress) => void,
  options?: NfcPreloadOptions
): Promise<NfcPreloadResult> {
  const signal = options?.signal;
  const list = tracks.filter((t) => t.audioUrl?.trim());
  const total = list.length;
  const blobUrls: string[] = [];
  let completed = 0;
  let loadedBytes = 0;
  let totalBytes: number | null = null;

  const report = () => {
    onProgress({ completed, total, loadedBytes, totalBytes });
  };

  report();

  void estimateTotalBytes(list, signal).then((bytes) => {
    if (bytes && !signal?.aborted) {
      totalBytes = bytes;
      report();
    }
  });

  const results: NfcPreloadedTrack[] = [];
  const concurrency = preloadConcurrency();

  if (concurrency <= 1) {
    for (const track of list) {
      if (signal?.aborted) throw new Error("nfc_preload_aborted");
      const { sourceUrl, blobUrl, bytes } = await fetchTrackToBlob(
        track.audioUrl,
        (delta) => {
          loadedBytes += delta;
          report();
        },
        signal
      );
      blobUrls.push(blobUrl);
      results.push({
        id: track.id,
        title: track.title,
        order: track.order,
        audioUrl: blobUrl,
        sourceUrl,
      });
      completed += 1;
      report();
    }
  } else {
    let index = 0;
    async function worker(): Promise<void> {
      while (index < list.length) {
        if (signal?.aborted) return;
        const i = index;
        index += 1;
        const track = list[i];
        const { sourceUrl, blobUrl } = await fetchTrackToBlob(
          track.audioUrl,
          (delta) => {
            loadedBytes += delta;
            report();
          },
          signal
        );
        blobUrls.push(blobUrl);
        results.push({
          id: track.id,
          title: track.title,
          order: track.order,
          audioUrl: blobUrl,
          sourceUrl,
        });
        completed += 1;
        report();
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);
  }

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
