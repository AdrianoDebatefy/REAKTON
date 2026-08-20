import { notFound } from "next/navigation";
import { ClubRobotDevClient } from "@/components/worlds/club/ClubRobotDevClient";

const allowDevPage =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_CLUB_ROBOT_PREVIEW === "true";

export default function ClubRobotDevPage() {
  if (!allowDevPage) notFound();
  return <ClubRobotDevClient />;
}
