const STORAGE_KEY = "reakton-nfc-pc-code-hidden-session";

export function isPcCodeHiddenForSession(sessionId: string | null | undefined): boolean {
  if (!sessionId || typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === sessionId;
}

export function hidePcCodeForSession(sessionId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, sessionId);
}
