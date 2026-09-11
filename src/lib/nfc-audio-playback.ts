/** In-memory MP3 cache (blob URLs) + prepare/wait helpers for NFC player v2. */

const MAX_CACHED_TRACKS = 6;

type CacheEntry = { blobUrl: string };

const blobCache = new Map<string, CacheEntry>();
const inflightFetches = new Map<string, Promise<string>>();

export function nfcResolveAudioUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return new URL(url, window.location.origin).href;
}

function touchCacheKey(key: string, entry: CacheEntry): void {
  blobCache.delete(key);
  blobCache.set(key, entry);
}

function evictOldestIfNeeded(): void {
  while (blobCache.size >= MAX_CACHED_TRACKS) {
    const oldest = blobCache.keys().next().value as string | undefined;
    if (!oldest) break;
    const entry = blobCache.get(oldest);
    if (entry) URL.revokeObjectURL(entry.blobUrl);
    blobCache.delete(oldest);
  }
}

async function fetchToBlobUrl(absoluteUrl: string): Promise<string> {
  const existing = blobCache.get(absoluteUrl);
  if (existing) {
    touchCacheKey(absoluteUrl, existing);
    return existing.blobUrl;
  }

  let pending = inflightFetches.get(absoluteUrl);
  if (!pending) {
    pending = fetch(absoluteUrl, { credentials: "same-origin", cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error("nfc_audio_fetch_failed");
        return res.blob();
      })
      .then((blob) => {
        evictOldestIfNeeded();
        const blobUrl = URL.createObjectURL(blob);
        blobCache.set(absoluteUrl, { blobUrl });
        inflightFetches.delete(absoluteUrl);
        return blobUrl;
      })
      .catch((err) => {
        inflightFetches.delete(absoluteUrl);
        throw err;
      });
    inflightFetches.set(absoluteUrl, pending);
  }

  return pending;
}

/** Warm the cache without touching the audio element. */
export function nfcPrefetchAudio(url: string): void {
  if (!url.trim() || typeof window === "undefined") return;
  const absolute = nfcResolveAudioUrl(url);
  void fetchToBlobUrl(absolute).catch(() => {
    /* direct URL fallback at play time */
  });
}

function audioBoundSource(audio: HTMLAudioElement): string | null {
  return audio.dataset.nfcSourceUrl ?? null;
}

function waitForMediaReady(audio: HTMLAudioElement, preferFullBuffer: boolean): Promise<void> {
  const minReady = HTMLMediaElement.HAVE_FUTURE_DATA;
  const fullReady = HTMLMediaElement.HAVE_ENOUGH_DATA;

  if (preferFullBuffer && audio.readyState >= fullReady) return Promise.resolve();
  if (!preferFullBuffer && audio.readyState >= minReady) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutMs = preferFullBuffer ? 60_000 : 20_000;
    const timeout = window.setTimeout(() => {
      cleanup();
      if (audio.readyState >= minReady) resolve();
      else reject(new Error("nfc_audio_load_timeout"));
    }, timeoutMs);

    const tryResolve = () => {
      if (preferFullBuffer && audio.readyState < fullReady) return;
      if (!preferFullBuffer && audio.readyState < minReady) return;
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("nfc_audio_load_error"));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener("canplaythrough", tryResolve);
      audio.removeEventListener("canplay", tryResolve);
      audio.removeEventListener("loadeddata", tryResolve);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("canplaythrough", tryResolve);
    audio.addEventListener("canplay", tryResolve);
    audio.addEventListener("loadeddata", tryResolve);
    audio.addEventListener("error", onError);
    tryResolve();
  });
}

export type NfcPrepareAudioOptions = {
  /** Wait for HAVE_ENOUGH_DATA when true (default). */
  preferFullBuffer?: boolean;
};

/**
 * Fetch (or reuse cache), assign src, and wait until the element can play without stalling.
 */
export async function nfcPrepareAudioPlayback(
  audio: HTMLAudioElement,
  url: string,
  options?: NfcPrepareAudioOptions
): Promise<void> {
  const preferFullBuffer = options?.preferFullBuffer ?? true;
  const resolved = nfcResolveAudioUrl(url);

  let playbackSrc = resolved;
  try {
    playbackSrc = await fetchToBlobUrl(resolved);
  } catch {
    playbackSrc = resolved;
  }

  const alreadyBound = audioBoundSource(audio) === resolved;
  if (!alreadyBound || audio.src !== playbackSrc) {
    audio.dataset.nfcSourceUrl = resolved;
    audio.preload = "auto";
    audio.src = playbackSrc;
    audio.load();
  }

  await waitForMediaReady(audio, preferFullBuffer);
}
