const WORLD_SESSION_KEY = "reakton-active-world";

export interface WorldSession {
  activeId: string;
  selectedIndex: number;
  showWorld: boolean;
  localeSwitch?: boolean;
}

export function getInitialWorldUiState(): {
  activeId: string | null;
  selectedIndex: number | null;
  showWorld: boolean;
  landingCaptionMode: "static" | "hidden";
} {
  const saved = readWorldSession();
  if (!saved) {
    return {
      activeId: null,
      selectedIndex: null,
      showWorld: false,
      landingCaptionMode: "static",
    };
  }
  return {
    activeId: saved.activeId,
    selectedIndex: saved.selectedIndex,
    showWorld: saved.showWorld,
    landingCaptionMode: "hidden",
  };
}

export function markLocaleSwitch(): void {
  const session = readWorldSession();
  if (session?.showWorld) {
    writeWorldSession({ ...session, localeSwitch: true });
  }
}

export function consumeLocaleSwitch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(WORLD_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as WorldSession;
    if (!parsed.localeSwitch) return false;
    writeWorldSession({ ...parsed, localeSwitch: false });
    return true;
  } catch {
    return false;
  }
}

export function readWorldSession(): WorldSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WORLD_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorldSession;
    if (!parsed.activeId || !parsed.showWorld) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWorldSession(session: WorldSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    sessionStorage.removeItem(WORLD_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(WORLD_SESSION_KEY, JSON.stringify(session));
}
