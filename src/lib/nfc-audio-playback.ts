/**
 * NFC player v2 audio: direct /uploads URLs, optional background full-file cache
 * (one download at a time — does not compete with initial PNG load).
 */

const MAX_BLOB_TRACKS = 4;

const blobUrlByCanonical = new Map<string, string>();
const blobOrder: string[] = [];
const pendingDownloads = new Set<string>();
const downloadQueue: string[] = [];
let activeDownload: string | null = null;

export function nfcResolveAudioUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return new URL(url, window.location.origin).href;
}

/** Prefer nginx-static /uploads over buffering the whole file through Next API. */
export function nfcCanonicalAudioUrl(url: string): string {
  const resolved = nfcResolveAudioUrl(url);
  try {
    const parsed = new URL(resolved);
    const apiMatch = parsed.pathname.match(/^\/api\/world-asset\/uploads\/(.+)$/);
    if (apiMatch) {
      return `${parsed.origin}/uploads/${decodeURIComponent(apiMatch[1])}`;
    }
  } catch {
    /* keep resolved */
  }
  return resolved;
}

function touchBlobEntry(canonical: string, blobUrl: string): void {
  const idx = blobOrder.indexOf(canonical);
  if (idx >= 0) blobOrder.splice(idx, 1);
  blobOrder.push(canonical);
  blobUrlByCanonical.set(canonical, blobUrl);
  while (blobOrder.length > MAX_BLOB_TRACKS) {
    const evict = blobOrder.shift();
    if (!evict) break;
    const old = blobUrlByCanonical.get(evict);
    if (old) URL.revokeObjectURL(old);
    blobUrlByCanonical.delete(evict);
  }
}

async function fetchFullTrackToBlob(canonical: string): Promise<string> {
  const cached = blobUrlByCanonical.get(canonical);
  if (cached) {
    touchBlobEntry(canonical, cached);
    return cached;
  }

  const res = await fetch(canonical, { credentials: "same-origin" });
  if (!res.ok) throw new Error("nfc_audio_fetch_failed");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  touchBlobEntry(canonical, blobUrl);
  return blobUrl;
}

function pumpDownloadQueue(): void {
  if (activeDownload || downloadQueue.length === 0) return;
  const next = downloadQueue.shift();
  if (!next || blobUrlByCanonical.has(next)) {
    pumpDownloadQueue();
    return;
  }
  activeDownload = next;
  void fetchFullTrackToBlob(next)
    .catch(() => undefined)
    .finally(() => {
      pendingDownloads.delete(next);
      activeDownload = null;
      pumpDownloadQueue();
    });
}

/** Queue a low-priority full download (serialized). Safe to call after UI + play. */
export function nfcQueueBackgroundBuffer(url: string): void {
  if (!url.trim() || typeof window === "undefined") return;
  const canonical = nfcCanonicalAudioUrl(url);
  if (blobUrlByCanonical.has(canonical) || pendingDownloads.has(canonical)) return;
  pendingDownloads.add(canonical);
  downloadQueue.push(canonical);
  pumpDownloadQueue();
}

export function nfcHasBufferedTrack(url: string): boolean {
  return blobUrlByCanonical.has(nfcCanonicalAudioUrl(url));
}

function playbackSrcForUrl(url: string): { canonical: string; src: string } {
  const canonical = nfcCanonicalAudioUrl(url);
  const blob = blobUrlByCanonical.get(canonical);
  return { canonical, src: blob ?? canonical };
}

/** Set audio src (blob if already buffered, else stream). Does not block. */
export function nfcApplyAudioSource(audio: HTMLAudioElement, url: string): string {
  const { canonical, src } = playbackSrcForUrl(url);
  if (audio.dataset.nfcSourceUrl !== canonical || audio.src !== src) {
    audio.dataset.nfcSourceUrl = canonical;
    audio.preload = "auto";
    audio.src = src;
    audio.load();
  }
  return canonical;
}

export async function nfcWaitReadyToPlay(audio: HTMLAudioElement, maxMs = 6_000): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
      else reject(new Error("nfc_audio_load_timeout"));
    }, maxMs);

    const tryResolve = () => {
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        cleanup();
        resolve();
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error("nfc_audio_load_error"));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener("canplay", tryResolve);
      audio.removeEventListener("loadeddata", tryResolve);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("canplay", tryResolve);
    audio.addEventListener("loadeddata", tryResolve);
    audio.addEventListener("error", onError);
    tryResolve();
  });
}

export async function nfcPrepareAudioPlayback(
  audio: HTMLAudioElement,
  url: string,
  maxWaitMs = 6_000
): Promise<void> {
  nfcApplyAudioSource(audio, url);
  await nfcWaitReadyToPlay(audio, maxWaitMs);
}

export function nfcScheduleBuffersAfterPlay(currentUrl: string, nextUrl?: string | null): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    nfcQueueBackgroundBuffer(currentUrl);
    if (nextUrl?.trim()) nfcQueueBackgroundBuffer(nextUrl);
  }, 2_000);
}
