import { NextResponse } from "next/server";
import { getActivePairingSession, sessionRemainingMs } from "@/lib/nfc-album-sessions";

export async function GET() {
  const session = getActivePairingSession();
  if (!session) {
    return NextResponse.json({ available: false, expiresAt: null, remainingMs: 0 });
  }

  return NextResponse.json({
    available: true,
    expiresAt: session.expiresAt,
    remainingMs: sessionRemainingMs(session),
  });
}
