export type Locale = "de" | "en";

export interface LocalizedString {
  de: string;
  en: string;
}

export interface Song {
  id: string;
  title: string;
  /** Cover-Bild (JPG/PNG/WebP) — Slot 1 */
  coverImage: string;
  /** Optional: MP4-Animation — Slot 2. Wenn gesetzt, wird beim Klick Video statt nur Bild gezeigt */
  videoSnippet?: string;
  /** Optional: Audio-Loop (MP3) */
  audioSnippet?: string;
  /** Optional: YouTube-Link für Vollvideo */
  videoUrl?: string;
}

export type WorldAtmosphere = "cosmos" | "nano" | "club";

export interface World {
  id: string;
  slug: string;
  albumTitle: LocalizedString;
  columnLabel: LocalizedString;
  themeDescription: LocalizedString;
  atmosphere: WorldAtmosphere;
  color: "blue" | "silver" | "red";
  locked: boolean;
  /** Hintergrund / monumentale Erde — Bild-Slot (Desktop, z. B. 16:9) */
  backgroundImage: string;
  /** Optional: Mobile-Hintergrund (9:16), z. B. Erde-mobile.jpg */
  backgroundImageMobile?: string;
  /** Optional: Hintergrund-Animation (MP4), z. B. animierte Erde */
  backgroundVideo?: string;
  ogImage: string;
  songs: Song[];
  /** Max. Anzahl Cover-Slots in dieser Welt */
  slotCount?: number;
}

export interface PressEntry {
  id: string;
  outlet: string;
  title: LocalizedString;
  excerpt?: LocalizedString;
  date: string;
  url: string;
}

export interface LiveVideo {
  id: string;
  title: LocalizedString;
  youtubeUrl: string;
}

export interface SiteLinks {
  merchandise: string;
  press: string;
  youtube: string;
  instagram: string;
  facebook: string;
}

export interface SiteContent {
  /** Header logo (WebP/PNG/SVG), default /brand/reakton-logo.webp */
  brandLogo?: string;
  siteLinks: SiteLinks;
  worlds: World[];
  press: PressEntry[];
  liveVideos: LiveVideo[];
  clapToyUrl: string;
  impressum: LocalizedString;
  datenschutz: LocalizedString;
}
