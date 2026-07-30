"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type ConsentLevel = "none" | "essential" | "all";

interface CookieContextValue {
  consent: ConsentLevel;
  hasChosen: boolean;
  acceptAll: () => void;
  acceptEssential: () => void;
  canLoadYouTube: boolean;
}

const CookieContext = createContext<CookieContextValue | null>(null);

const STORAGE_KEY = "reakton-cookie-consent";

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentLevel>("none");
  const [hasChosen, setHasChosen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentLevel | null;
    if (stored) {
      setConsent(stored);
      setHasChosen(true);
    } else {
      setHasChosen(false);
    }
  }, []);

  const persist = useCallback((level: ConsentLevel) => {
    localStorage.setItem(STORAGE_KEY, level);
    setConsent(level);
    setHasChosen(true);
  }, []);

  return (
    <CookieContext.Provider
      value={{
        consent,
        hasChosen,
        acceptAll: () => persist("all"),
        acceptEssential: () => persist("essential"),
        canLoadYouTube: consent === "all",
      }}
    >
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieProvider");
  return ctx;
}
