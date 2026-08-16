"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { World } from "@/types/content";
import { onContentUpdated } from "@/lib/content-events";
import { fetchPublicWorlds } from "@/lib/fetch-public-content";

const WorldColumns = dynamic(
  () => import("./WorldColumns").then((m) => m.WorldColumns),
  { ssr: false }
);

export function WorldColumnsLoader({ worlds: _initialWorlds }: { worlds: World[] }) {
  void _initialWorlds;
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchPublicWorlds();
    if (next) {
      setWorlds(next);
      setLoadFailed(false);
      return;
    }
    setLoadFailed(true);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onPageShow = () => void refresh();

    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    const stopContentListener = onContentUpdated(refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      stopContentListener();
    };
  }, [refresh]);

  if (!worlds) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-center text-sm text-white/55">
        {loadFailed ? (
          <div>
            <p>Inhalte konnten nicht geladen werden.</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 rounded border border-white/25 px-5 py-2 text-xs uppercase tracking-widest text-white/75 hover:border-white/45"
            >
              Erneut laden
            </button>
          </div>
        ) : (
          <span aria-hidden />
        )}
      </div>
    );
  }

  return <WorldColumns worlds={worlds} />;
}
