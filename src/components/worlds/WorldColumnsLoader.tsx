"use client";

import dynamic from "next/dynamic";
import type { World } from "@/types/content";

const WorldColumns = dynamic(
  () => import("./WorldColumns").then((m) => m.WorldColumns),
  { ssr: false }
);

export function WorldColumnsLoader({ worlds }: { worlds: World[] }) {
  return <WorldColumns worlds={worlds} />;
}
