import { NextResponse } from "next/server";
import { getPressPreviewSession } from "@/lib/press-preview-auth";
import { getSiteContent } from "@/lib/content";
import { recordPressVote } from "@/lib/press-votes";

export async function POST(request: Request) {
  const session = await getPressPreviewSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { trackId?: string; stars?: number; trackTitle?: string };
  const trackId = body.trackId?.trim() ?? "";
  const stars = body.stars ?? 0;
  let trackTitle = body.trackTitle?.trim() ?? "";

  if (!trackTitle) {
    const content = getSiteContent();
    trackTitle =
      content.pressPreview?.tracks.find((track) => track.id === trackId)?.title ?? trackId;
  }

  if (!trackId || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const summary = recordPressVote(session.sessionId, trackId, stars, {
    email: session.email,
    trackTitle,
  });
  return NextResponse.json({ ok: true, votes: summary, userStars: stars });
}
