import type { Locale, LocalizedString } from "@/types/content";

export const CONTENT_LOCALES: Locale[] = ["de", "en", "ja"];

export const LOCALE_LABELS: Record<Locale, string> = {
  de: "DE",
  en: "EN",
  ja: "JP",
};

export function getLocalized(text: LocalizedString | undefined, locale: Locale): string {
  if (!text) return "";
  const candidates = [text[locale], text.de, text.en, text.ja];
  for (const value of candidates) {
    if (value?.trim()) return value.trim();
  }
  return "";
}

export function emptyLocalized(): LocalizedString {
  return { de: "", en: "", ja: "" };
}

export function nextLocale(locale: string): Locale {
  const order: Locale[] = ["de", "en", "ja"];
  const idx = order.indexOf(locale as Locale);
  return order[(idx + 1) % order.length];
}

export function localeSwitchLabel(locale: string): string {
  return LOCALE_LABELS[nextLocale(locale)];
}
