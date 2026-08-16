/** Canonical production URL — override via NEXT_PUBLIC_SITE_URL in hosting. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://reakton.de").replace(/\/$/, "");
}
