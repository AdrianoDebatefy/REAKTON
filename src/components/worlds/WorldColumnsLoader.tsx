"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SiteContent, World } from "@/types/content";

const WorldColumns = dynamic(
  () => import("./WorldColumns").then((m) => m.WorldColumns),
  { ssr: false }
);

async function fetchWorlds(): Promise<World[] | null> {
  try {
    const res = await fetch(`/api/content?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SiteContent;
    return data.worlds?.length ? data.worlds : null;
  } catch {
    return null;
  }
}

export function WorldColumnsLoader({ worlds: initialWorlds }: { worlds: World[] }) {
  const [worlds, setWorlds] = useState<World[] | null>(null);

  const refresh = useCallback(async () => {
    const next = await fetchWorlds();
    setWorlds(next ?? initialWorlds);
  }, [initialWorlds]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  if (!worlds) {
    return <div className="min-h-[100dvh] bg-black" aria-hidden />;
  }

  return <WorldColumns worlds={worlds} />;
}
