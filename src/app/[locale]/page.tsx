import { getSiteContent } from "@/lib/content";
import { WorldColumnsLoader } from "@/components/worlds/WorldColumnsLoader";

export default function HomePage() {
  const content = getSiteContent();

  return <WorldColumnsLoader worlds={content.worlds} clapToyUrl={content.clapToyUrl} />;
}
