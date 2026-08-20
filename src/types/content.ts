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

export interface PressPreviewTrack {
  id: string;
  world: WorldAtmosphere;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string;
  order: number;
}

export interface PressPreviewConfig {
  /** Days until generated press password expires */
  expiryDays: number;
  tracks: PressPreviewTrack[];
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

/** Live tuning for Clip:Clap:Club desktop 3D robot (admin-editable). */
export interface ClubRobotTuning {
  modelX: number;
  modelY: number;
  modelZ: number;
  modelScale: number;
  modelRotY: number;
  cameraDistance: number;
  cameraPosY: number;
  cameraLookAtY: number;
  cameraFov: number;
}

/** Clip:Clap:Club desktop robot scene — stored in site content, edited in admin. */
export interface ClubRobotConfig {
  /** Show 3D robot when club world is open (desktop). */
  enabled: boolean;
  /** Solid backdrop color behind robot (hex). */
  backgroundColor: string;
  /** Optional full-bleed photo behind robot (upload via admin). */
  backgroundImage?: string;
  /** GLB path under public/, e.g. /worlds/reakton_hires_Robot_Modell.glb */
  modelPath?: string;
  /** Seconds for world image fade once club world opens. */
  imageFadeS?: number;
  tuning: ClubRobotTuning;
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
  pressPreview?: PressPreviewConfig;
  clubRobot?: ClubRobotConfig;
}
