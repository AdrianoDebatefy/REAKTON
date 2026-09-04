import { NextResponse } from "next/server";
import {
  clearNfcSessionCookie,
  getNfcDesktopSession,
  getNfcMobileSession,
} from "@/lib/nfc-album-auth";
import { getNfcSession, sessionRemainingMs } from "@/lib/nfc-album-sessions";

export async function GET() {
  const mobile = await getNfcMobileSession();
  const desktop = await getNfcDesktopSession();
  const active = mobile ?? desktop;

  if (!active) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      pcCode: null,
      expiresAt: null,
      remainingMs: 0,
    });
  }

  const record = getNfcSession(active.sessionId);
  if (!record) {
    if (mobile) await clearNfcSessionCookie("mobile");
    if (desktop) await clearNfcSessionCookie("desktop");
    return NextResponse.json({
      authenticated: false,
      role: null,
      pcCode: null,
      expiresAt: null,
      remainingMs: 0,
    });
  }

  return NextResponse.json({
    authenticated: true,
    role: active.role,
    sessionId: record.sessionId,
    cardId: record.cardId,
    pcCode: mobile?.pcCode ?? record.pcCode,
    expiresAt: record.expiresAt,
    remainingMs: sessionRemainingMs(record),
  });
}

export async function DELETE() {
  await clearNfcSessionCookie("mobile");
  await clearNfcSessionCookie("desktop");
  return NextResponse.json({ ok: true });
}
