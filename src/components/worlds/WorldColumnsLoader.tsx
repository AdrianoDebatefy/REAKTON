"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SiteContent, World } from "@/types/content";

const WorldColumns = dynamic(
  () => import("./WorldColumns").then((m) => m.WorldColumns),
  { ssr: false }
);

async function fetchWorlds(): Promise<World[] | null> {
  try {
    const res = await fetch("/api/content", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as SiteContent;
    return data.worlds?.length ? data.worlds : null;
  } catch {
    return null;
  }
}

export function WorldColumnsLoader({ worlds: initialWorlds }: { worlds: World[] }) {
  const [worlds, setWorlds] = useState(initialWorlds);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const next = await fetchWorlds();
      if (!cancelled && next) setWorlds(next);
    }

    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return <WorldColumns worlds={worlds} />;
}
