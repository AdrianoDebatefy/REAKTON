/**
 * NFC player v2: stream MP3 from /uploads only (no in-memory blob cache).
 */

export function nfcResolveAudioUrl(url: string): string {
  if (typeof window === "undefined") return url.trim();
  if (url.startsWith("http")) return url;
  return new URL(url, window.location.origin).href;
}

/** Prefer nginx-static /uploads over buffering the whole file through Next API. */
export function nfcCanonicalAudioUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const apiPath = trimmed.match(/^\/api\/world-asset\/uploads\/(.+)$/);
  if (apiPath) return `/uploads/${decodeURIComponent(apiPath[1])}`;

  if (trimmed.startsWith("http")) {
    try {
      const parsed = new URL(trimmed);
      const apiMatch = parsed.pathname.match(/^\/api\/world-asset\/uploads\/(.+)$/);
      if (apiMatch) {
        return `${parsed.origin}/uploads/${decodeURIComponent(apiMatch[1])}`;
      }
      return parsed.href;
    } catch {
      return trimmed;
    }
  }

  if (typeof window !== "undefined") {
    return nfcResolveAudioUrl(trimmed);
  }

  return trimmed;
}

/** Set playback src (blob URL after preload, or HTTP stream). */
export function nfcApplyAudioSource(
  audio: HTMLAudioElement,
  playbackUrl: string,
  canonicalKey?: string
): string {
  const key = canonicalKey ?? nfcCanonicalAudioUrl(playbackUrl);
  const src = playbackUrl.startsWith("blob:")
    ? playbackUrl
    : playbackUrl.startsWith("http")
      ? nfcCanonicalAudioUrl(playbackUrl)
      : nfcResolveAudioUrl(nfcCanonicalAudioUrl(playbackUrl));

  if (audio.dataset.nfcSourceUrl !== key || audio.src !== src) {
    audio.dataset.nfcSourceUrl = key;
    audio.preload = "auto";
    audio.src = src;
    audio.load();
  }
  return key;
}

export async function nfcWaitReadyToPlay(
  audio: HTMLMediaElement,
  maxMs = 6_000,
  options?: { preferBuffered?: boolean }
): Promise<void> {
  const minReady = options?.preferBuffered
    ? HTMLMediaElement.HAVE_ENOUGH_DATA
    : HTMLMediaElement.HAVE_FUTURE_DATA;
  if (audio.readyState >= minReady) return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
      else reject(new Error("nfc_audio_load_timeout"));
    }, maxMs);

    const tryResolve = () => {
      if (audio.readyState >= minReady) {
        cleanup();
        resolve();
        return;
      }
      if (!options?.preferBuffered && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
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
