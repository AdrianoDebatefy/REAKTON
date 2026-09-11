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
  currentTrackTitle: string | null;
};

export type NfcPreloadResult = {
  tracks: NfcPreloadedTrack[];
  blobUrls: string[];
};

export type NfcPreloadOptions = {
  signal?: AbortSignal;
};

export class NfcPreloadTrackError extends Error {
  readonly trackTitle: string;
  readonly sourceUrl: string;
  readonly completedBeforeFail: number;

  constructor(
    trackTitle: string,
    sourceUrl: string,
    completedBeforeFail: number,
    cause?: unknown
  ) {
    super("nfc_preload_track_failed");
    this.name = "NfcPreloadTrackError";
    this.trackTitle = trackTitle;
    this.sourceUrl = sourceUrl;
    this.completedBeforeFail = completedBeforeFail;
    if (cause instanceof Error && cause.message) {
      this.message = `${this.message}: ${cause.message}`;
    }
  }
}

const TRACK_RETRY_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resolveFetchUrl(audioUrl: string): { sourceUrl: string; fetchUrl: string } {
  const sourceUrl = nfcCanonicalAudioUrl(audioUrl);
  const fetchUrl = sourceUrl.startsWith("http") ? sourceUrl : nfcResolveAudioUrl(sourceUrl);
  return { sourceUrl, fetchUrl };
}

async function estimateTotalBytes(tracks: { audioUrl: string }[]): Promise<number | null> {
  let sum = 0;
  let found = false;
  for (const track of tracks) {
    const { fetchUrl } = resolveFetchUrl(track.audioUrl);
    try {
      const res = await fetch(fetchUrl, { method: "HEAD", credentials: "same-origin" });
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

/** XHR + blob — reliable progress on Android Brave; fewer OOM issues than chunk arrays. */
function fetchTrackToBlob(
  fetchUrl: string,
  onByteProgress: (loadedInTrack: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("nfc_preload_aborted"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("GET", fetchUrl, true);
    xhr.responseType = "blob";
    let lastLoaded = 0;

    const onAbort = () => {
      xhr.abort();
      reject(new Error("nfc_preload_aborted"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const delta = event.loaded - lastLoaded;
        lastLoaded = event.loaded;
        if (delta > 0) onByteProgress(delta);
      }
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof Blob) {
        const blob = xhr.response;
        if (lastLoaded === 0 && blob.size > 0) {
          onByteProgress(blob.size);
        }
        resolve(blob);
        return;
      }
      reject(new Error(`nfc_preload_http_${xhr.status}`));
    };

    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("nfc_preload_network"));
    };

    xhr.send();
  });
}

async function fetchTrackWithRetries(
  track: { title: string; audioUrl: string },
  onByteProgress: (delta: number) => void,
  signal?: AbortSignal
): Promise<{ sourceUrl: string; blobUrl: string }> {
  const { sourceUrl, fetchUrl } = resolveFetchUrl(track.audioUrl);
  let lastError: unknown;

  for (let attempt = 0; attempt < TRACK_RETRY_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw new Error("nfc_preload_aborted");
    try {
      const blob = await fetchTrackToBlob(fetchUrl, onByteProgress, signal);
      return { sourceUrl, blobUrl: URL.createObjectURL(blob) };
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.message === "nfc_preload_aborted") throw err;
      if (attempt < TRACK_RETRY_ATTEMPTS - 1) {
        await sleep(800 * (attempt + 1));
      }
    }
  }

  throw new NfcPreloadTrackError(track.title, sourceUrl, 0, lastError);
}

/**
 * Download every album MP3 into RAM (blob URLs). Mobile: one file at a time.
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
  let currentTrackTitle: string | null = null;
  let bytesAtTrackStart = 0;

  const report = () => {
    onProgress({ completed, total, loadedBytes, totalBytes, currentTrackTitle });
  };

  report();

  void estimateTotalBytes(list).then((bytes) => {
    if (bytes) {
      totalBytes = bytes;
      report();
    }
  });

  const results: NfcPreloadedTrack[] = [];

  for (const track of list) {
    if (signal?.aborted) throw new Error("nfc_preload_aborted");

    currentTrackTitle = track.title;
    bytesAtTrackStart = loadedBytes;
    report();

    try {
      let trackLoaded = 0;
      const { sourceUrl, blobUrl } = await fetchTrackWithRetries(
        track,
        (delta) => {
          trackLoaded += delta;
          loadedBytes = bytesAtTrackStart + trackLoaded;
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
      currentTrackTitle = null;
      report();
    } catch (err) {
      if (err instanceof NfcPreloadTrackError) throw err;
      throw new NfcPreloadTrackError(
        track.title,
        resolveFetchUrl(track.audioUrl).sourceUrl,
        completed,
        err
      );
    }
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
