"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteContent, World } from "@/types/content";
import { onContentUpdated } from "@/lib/content-events";
import { fetchPublicWorlds } from "@/lib/fetch-public-content";

async function fetchWorldById(worldId: string): Promise<World | null> {
  const worlds = await fetchPublicWorlds();
  return worlds?.find((world) => world.id === worldId) ?? null;
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
    const stopContentListener = onContentUpdated(refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      stopContentListener();
    };
  }, [refresh]);

  return world;
}
