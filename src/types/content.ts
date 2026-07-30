export type Locale = "de" | "en" | "ja";

export interface LocalizedString {
  de: string;
  en: string;
  ja?: string;
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
  /** Optional: Infotext für Cover-Sidepanel (pro Sprache) */
  infoText?: LocalizedString;
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
  /** Optional: Ambient-Soundloop (MP3) für diese Welt */
  backgroundAudio?: string;
  ogImage: string;
  songs: Song[];
  /** Max. Anzahl Cover-Slots in dieser Welt */
  slotCount?: number;
}

export interface PressEntry {
  id: string;
  /** Link zum Artikel / externe Seite */
  url: string;
  /** Presse-Bild (JPG/PNG/WebP) */
  image?: string;
  outlet?: string;
  title?: LocalizedString;
  excerpt?: LocalizedString;
  date?: string;
}

export interface LiveVideo {
  id: string;
  youtubeUrl: string;
  /** Optional — wenn leer, nur Embed ohne Titel */
  title?: LocalizedString;
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
