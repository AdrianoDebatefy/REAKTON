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

/** Set audio src (always HTTP stream). Does not block. */
export function nfcApplyAudioSource(audio: HTMLAudioElement, url: string): string {
  const canonical = nfcCanonicalAudioUrl(url);
  const resolvedSrc = canonical.startsWith("http")
    ? canonical
    : nfcResolveAudioUrl(canonical);

  if (audio.dataset.nfcSourceUrl !== canonical) {
    audio.dataset.nfcSourceUrl = canonical;
    audio.preload = "auto";
    audio.src = resolvedSrc;
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

/** @deprecated No-op — blob prefetch removed for playback stability. */
export function nfcScheduleBuffersAfterPlay(_currentUrl: string, _nextUrl?: string | null): void {
  /* intentionally empty */
}
