import type { SiteContent, World } from "@/types/content";

export async function fetchPublicWorlds(): Promise<World[] | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`/api/content?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as SiteContent;
      if (data.worlds?.length) return data.worlds;
    } catch {
      /* retry */
    }
    if (attempt < 3) {
      await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  return null;
}
