import dynamic from "next/dynamic";
import { getSiteContent } from "@/lib/content";

const WorldColumns = dynamic(
  () => import("@/components/worlds/WorldColumns").then((m) => m.WorldColumns),
  { ssr: false }
);

export default function HomePage() {
  const content = getSiteContent();

  return <WorldColumns worlds={content.worlds} clapToyUrl={content.clapToyUrl} />;
}
