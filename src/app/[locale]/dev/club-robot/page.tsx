import { redirect } from "next/navigation";

/** Legacy locale-prefixed URL → canonical /dev/club-robot */
export default function ClubRobotDevLocaleRedirect() {
  redirect("/dev/club-robot");
}
