import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { SiteContent, SiteLinks } from "@/types/content";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "site-content.json");
const LOCAL_PATH = path.join(DATA_DIR, "site-content.local.json");

const DEFAULT_SITE_LINKS: SiteLinks = {
  merchandise: "https://www.outoflineshop.de",
  press: "/press",
  youtube: "https://www.youtube.com",
  instagram: "https://www.instagram.com",
  facebook: "https://www.facebook.com",
};

function normalizeSiteContent(raw: Record<string, unknown>): SiteContent {
  const content = raw as unknown as SiteContent & {
    storeLinks?: { id: string; name: string; url: string }[];
    socialLinks?: { id: string; platform: string; url: string }[];
  };

  if (content.siteLinks) {
    return { ...content, siteLinks: { ...DEFAULT_SITE_LINKS, ...content.siteLinks } };
  }

  const store = content.storeLinks ?? [];
  const social = content.socialLinks ?? [];
  const findSocial = (name: string) =>
    social.find((s) => s.platform.toLowerCase().includes(name))?.url ?? "";

  return {
    ...content,
    siteLinks: {
      merchandise:
        store.find((s) => s.id === "outofline")?.url ??
        store[0]?.url ??
        DEFAULT_SITE_LINKS.merchandise,
      press: DEFAULT_SITE_LINKS.press,
      youtube: findSocial("youtube") || DEFAULT_SITE_LINKS.youtube,
      instagram: findSocial("instagram") || DEFAULT_SITE_LINKS.instagram,
      facebook: findSocial("facebook") || DEFAULT_SITE_LINKS.facebook,
    },
  };
}

export function getSiteContent(): SiteContent {
  const pathToRead = existsSync(LOCAL_PATH) ? LOCAL_PATH : DATA_PATH;
  const raw = readFileSync(pathToRead, "utf-8");
  return normalizeSiteContent(JSON.parse(raw) as Record<string, unknown>);
}

/** Admin saves here so git pulls do not wipe your test slots. */
export function saveSiteContent(content: SiteContent): void {
  writeFileSync(LOCAL_PATH, JSON.stringify(content, null, 2), "utf-8");
}

export function hasLocalSiteContent(): boolean {
  return existsSync(LOCAL_PATH);
}

export function getWorldBySlug(slug: string): SiteContent["worlds"][0] | undefined {
  return getSiteContent().worlds.find((w) => w.slug === slug);
}
