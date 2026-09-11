import { NextResponse } from "next/server";
import { getAnyNfcSession } from "@/lib/nfc-album-auth";
import { getNfcSession, getNfcTracks } from "@/lib/nfc-album-sessions";

function normalizeNfcAudioUrl(audioUrl: string): string {
  const trimmed = audioUrl.trim();
  const apiMatch = trimmed.match(/^\/api\/world-asset\/uploads\/(.+)$/);
  if (apiMatch) return `/uploads/${decodeURIComponent(apiMatch[1])}`;
  return trimmed;
}

export async function GET() {
  const auth = await getAnyNfcSession();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const record = getNfcSession(auth.sessionId);
  if (!record) {
    return NextResponse.json({ error: "expired" }, { status: 401 });
  }

  const tracks = getNfcTracks().map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist ?? "",
    audioUrl: normalizeNfcAudioUrl(track.audioUrl),
    coverImage: track.coverImage ?? "",
    order: track.order,
  }));

  return NextResponse.json({ tracks });
}
