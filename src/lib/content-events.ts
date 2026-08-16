const STORAGE_KEY = "reakton-content-updated";
const CHANNEL_NAME = "reakton-content-updated";

export function notifyContentUpdated(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
  try {
    new BroadcastChannel(CHANNEL_NAME).postMessage("updated");
  } catch {
    /* BroadcastChannel unavailable */
  }
}

export function onContentUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => callback();
  } catch {
    /* BroadcastChannel unavailable */
  }

  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
