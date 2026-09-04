import { NextResponse } from "next/server";
import { setNfcSessionCookie } from "@/lib/nfc-album-auth";
import { pairNfcSessionByCode } from "@/lib/nfc-album-sessions";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const session = pairNfcSessionByCode(code);
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await setNfcSessionCookie(session, "desktop");

  return NextResponse.json({
    ok: true,
    expiresAt: session.expiresAt,
    cardId: session.cardId,
  });
}
