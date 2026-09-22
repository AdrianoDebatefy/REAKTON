import { getSiteContent } from "@/lib/content";
import { HomeSeoIntro } from "@/components/seo/HomeSeoIntro";
import { WorldColumnsLoader } from "@/components/worlds/WorldColumnsLoader";

export default async function HomePage() {
  const content = getSiteContent();

  return (
    <>
      <HomeSeoIntro />
      <WorldColumnsLoader worlds={content.worlds} clubRobot={content.clubRobot} />
    </>
  );
}
