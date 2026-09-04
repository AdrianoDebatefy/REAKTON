"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

interface NfcTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
  order: number;
}

interface NfcClubContextValue {
  clubDesktopActive: boolean;
  setClubDesktopActive: (active: boolean) => void;
  entryVisible: boolean;
  authenticated: boolean;
  remainingMs: number;
  tracks: NfcTrack[];
  activeTrackIndex: number;
  playing: boolean;
  pairCode: (code: string) => Promise<boolean>;
  togglePlayAtIndex: (index: number) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  fadingOut: boolean;
  setFadingOut: (value: boolean) => void;
}

const NfcClubContext = createContext<NfcClubContextValue | null>(null);

export function NfcClubProvider({ children }: { children: ReactNode }) {
  const [clubDesktopActive, setClubDesktopActive] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [tracks, setTracks] = useState<NfcTrack[]>([]);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [entryVisible, setEntryVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const activeTrackIndexRef = useRef(activeTrackIndex);

  tracksRef.current = tracks;
  activeTrackIndexRef.current = activeTrackIndex;

  const checkPairingStatus = useCallback(async () => {
    const res = await fetch("/api/nfc/pairing-status", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { available: boolean };
    if (data.available) setEntryVisible(true);
    return data.available;
  }, []);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/nfc/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated: boolean;
      role: "mobile" | "desktop" | null;
      remainingMs: number;
    };
    const isDesktop = data.authenticated && data.role === "desktop";
    setAuthenticated(isDesktop);
    setRemainingMs(data.remainingMs ?? 0);
    if (isDesktop) {
      setEntryVisible(false);
      setFadingOut(false);
    } else {
      setTracks([]);
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
    return data;
  }, []);

  const loadTracks = useCallback(async () => {
    const res = await fetch("/api/nfc/tracks");
    if (!res.ok) {
      setTracks([]);
      return;
    }
    const data = (await res.json()) as { tracks: NfcTrack[] };
    setTracks(data.tracks);
    setActiveTrackIndex(0);
  }, []);

  useEffect(() => {
    if (!clubDesktopActive) {
      setEntryVisible(false);
      setFadingOut(false);
      return;
    }

    const run = async () => {
      const session = await refreshSession();
      const available = await checkPairingStatus();
      if (!available && !session?.authenticated) {
        setEntryVisible(false);
      }
      if (session?.authenticated && session.role === "desktop") {
        await loadTracks();
      }
    };

    void run();

    const interval = window.setInterval(() => {
      void run();
    }, 2500);

    const onWake = () => {
      void run();
    };

    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onWake();
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onWake);
    };
  }, [checkPairingStatus, clubDesktopActive, loadTracks, refreshSession]);

  useEffect(() => {
    if (!clubDesktopActive || !authenticated || remainingMs <= 0) return;
    const started = Date.now();
    const initial = remainingMs;
    const timer = window.setInterval(() => {
      const next = Math.max(0, initial - (Date.now() - started));
      setRemainingMs(next);
      if (next <= 0) {
        setAuthenticated(false);
        setPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [authenticated, clubDesktopActive, remainingMs]);

  const playTrackAtIndex = useCallback(async (index: number) => {
    const list = tracksRef.current;
    const track = list[index];
    if (!track?.audioUrl?.trim()) return;

    setActiveTrackIndex(index);
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const playNext = useCallback(() => {
    const list = tracksRef.current;
    if (list.length === 0) return;
    const next = (activeTrackIndexRef.current + 1) % list.length;
    void playTrackAtIndex(next);
  }, [playTrackAtIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => playNext();
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [playNext]);

  const togglePlayAtIndex = useCallback(
    (index: number) => {
      if (index === activeTrackIndex && playing) {
        audioRef.current?.pause();
        return;
      }
      void playTrackAtIndex(index);
    },
    [activeTrackIndex, playTrackAtIndex, playing]
  );

  const pairCode = useCallback(
    async (code: string) => {
      const res = await fetch("/api/nfc/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return false;
      await refreshSession();
      await loadTracks();
      return true;
    },
    [loadTracks, refreshSession]
  );

  const value = useMemo(
    () => ({
      clubDesktopActive,
      setClubDesktopActive,
      entryVisible,
      authenticated,
      remainingMs,
      tracks,
      activeTrackIndex,
      playing,
      pairCode,
      togglePlayAtIndex,
      audioRef,
      fadingOut,
      setFadingOut,
    }),
    [
      activeTrackIndex,
      authenticated,
      clubDesktopActive,
      entryVisible,
      fadingOut,
      pairCode,
      playing,
      remainingMs,
      tracks,
      togglePlayAtIndex,
    ]
  );

  return (
    <NfcClubContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" className="hidden" />
    </NfcClubContext.Provider>
  );
}

export function useNfcClub() {
  const ctx = useContext(NfcClubContext);
  if (!ctx) {
    throw new Error("useNfcClub must be used within NfcClubProvider");
  }
  return ctx;
}

export function useNfcClubOptional() {
  return useContext(NfcClubContext);
}
