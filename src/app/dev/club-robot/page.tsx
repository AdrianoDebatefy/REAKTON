import { notFound } from "next/navigation";
import { ClubRobotDevClient } from "@/components/worlds/club/ClubRobotDevClient";

export const metadata = {
  title: "Club Robot Dev",
  robots: { index: false, follow: false },
};

/** Direct local test URL — no locale prefix required. */
export default function ClubRobotDevPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_CLUB_ROBOT_PREVIEW !== "true"
  ) {
    notFound();
  }

  return <ClubRobotDevClient />;
}
