/** NFC player v2: stream via audio element, light prefetch — no full-file fetch before play. */

const prefetchedHrefs = new Set<string>();

export function nfcResolveAudioUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return new URL(url, window.location.origin).href;
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
      else reject(new Error("nfc_audio_load_timeout"));
    }, 30_000);

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

/**
 * Assign stream URL and wait until playback can start (does not download the full file first).
 */
export async function nfcPrepareAudioPlayback(audio: HTMLAudioElement, url: string): Promise<void> {
  const resolved = nfcResolveAudioUrl(url);
  const alreadyBound = audio.dataset.nfcSourceUrl === resolved;

  if (!alreadyBound) {
    audio.dataset.nfcSourceUrl = resolved;
    audio.preload = "auto";
    audio.src = resolved;
    audio.load();
  } else if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
    audio.load();
  }

  await waitForCanPlay(audio);
}

/** Low-priority hint for the next track — does not block play or images. */
export function nfcPrefetchAudio(url: string): void {
  if (!url.trim() || typeof document === "undefined") return;
  const absolute = nfcResolveAudioUrl(url);
  if (prefetchedHrefs.has(absolute)) return;
  prefetchedHrefs.add(absolute);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "audio";
  link.href = absolute;
  document.head.appendChild(link);
}
