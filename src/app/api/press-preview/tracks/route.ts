import { NextResponse } from "next/server";
import type { WorldAtmosphere } from "@/types/content";
import { getSiteContent } from "@/lib/content";
import { getPressPreviewSession } from "@/lib/press-preview-auth";
import { getPressVoteForSession, readPressVotes } from "@/lib/press-votes";

const WORLDS: WorldAtmosphere[] = ["cosmos", "nano", "club"];

export async function GET(request: Request) {
  const session = await getPressPreviewSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const world = searchParams.get("world") as WorldAtmosphere | null;
  if (!world || !WORLDS.includes(world)) {
    return NextResponse.json({ error: "invalid_world" }, { status: 400 });
  }

  const content = getSiteContent();
  const tracks = (content.pressPreview?.tracks ?? [])
    .filter((track) => track.world === world && track.audioUrl.trim())
    .sort((a, b) => a.order - b.order);

  const votes = readPressVotes();
  const payload = tracks.map((track) => ({
    ...track,
    votes: votes.byTrack[track.id] ?? { totalStars: 0, voteCount: 0, average: 0 },
    userStars: getPressVoteForSession(session.sessionId, track.id),
  }));

  return NextResponse.json({ tracks: payload });
}
