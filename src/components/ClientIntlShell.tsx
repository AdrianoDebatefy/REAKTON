"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import type { Locale } from "@/types/content";
import { buildLocalizedPath, setLocaleCookie } from "@/lib/locale-path";

type ClientIntlContextValue = {
  switchLocaleClient: (locale: Locale) => Promise<void>;
};

const ClientIntlContext = createContext<ClientIntlContextValue | null>(null);

export function useClientIntl() {
  const ctx = useContext(ClientIntlContext);
  if (!ctx) {
    throw new Error("useClientIntl must be used within ClientIntlShell");
  }
  return ctx;
}

export function ClientIntlShell({
  initialLocale,
  initialMessages,
  children,
}: {
  initialLocale: Locale;
  initialMessages: AbstractIntlMessages;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<AbstractIntlMessages>(initialMessages);

  const switchLocaleClient = useCallback(async (next: Locale) => {
    if (next === locale) return;

    const nextMessages = (await import(`../../messages/${next}.json`)).default as AbstractIntlMessages;
    setMessages(nextMessages);
    setLocale(next);
    setLocaleCookie(next);
    document.documentElement.lang = next;

    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const maybeLocale = segments[0];
    const hasLocalePrefix =
      maybeLocale === "en" || maybeLocale === "ja" || maybeLocale === "de";
    const pathWithoutLocale = hasLocalePrefix
      ? `/${segments.slice(1).join("/")}`.replace(/\/$/, "") || "/"
      : pathname;

    const localizedPath = buildLocalizedPath(pathWithoutLocale, next);
    window.history.replaceState(window.history.state, "", localizedPath);
  }, [locale]);

  const contextValue = useMemo(() => ({ switchLocaleClient }), [switchLocaleClient]);

  return (
    <ClientIntlContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClientIntlContext.Provider>
  );
}
