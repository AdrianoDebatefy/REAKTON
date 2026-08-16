"use client";

import dynamic from "next/dynamic";
import type { World } from "@/types/content";

const WorldColumns = dynamic(
  () => import("./WorldColumns").then((m) => m.WorldColumns),
  { ssr: false }
);

export function WorldColumnsLoader({
  worlds,
  clapToyUrl,
}: {
  worlds: World[];
  clapToyUrl?: string;
}) {
  return <WorldColumns worlds={worlds} clapToyUrl={clapToyUrl ?? ""} />;
}
