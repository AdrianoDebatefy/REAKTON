"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteContent, World } from "@/types/content";

async function fetchWorldById(worldId: string): Promise<World | null> {
  try {
    const res = await fetch(`/api/content?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SiteContent;
    return data.worlds?.find((w) => w.id === worldId) ?? null;
  } catch {
    return null;
  }
}

/** Always use the latest slot data from site-content.local.json for this world. */
export function useLiveWorld(initial: World): World {
  const [world, setWorld] = useState(initial);

  const refresh = useCallback(async () => {
    const fresh = await fetchWorldById(initial.id);
    if (fresh) setWorld(fresh);
  }, [initial.id]);

  useEffect(() => {
    setWorld(initial);
  }, [initial]);

  useEffect(() => {
    void refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return world;
}
