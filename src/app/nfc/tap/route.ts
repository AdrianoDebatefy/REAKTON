import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { findRegisteredNfcCard, createNfcSession } from "@/lib/nfc-album-sessions";
import { setNfcSessionCookie } from "@/lib/nfc-album-auth";

function detectLocale(request: NextRequest): string {
  const accept = request.headers.get("accept-language") ?? "";
  if (/\bja\b/i.test(accept)) return "ja";
  if (/\ben\b/i.test(accept)) return "en";
  return routing.defaultLocale;
}

function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const hostname = host.split(":")[0];
  return `${proto}://${hostname}`;
}

export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("card")?.trim() ?? "";
  if (!cardId) {
    return NextResponse.json({ error: "missing_card" }, { status: 400 });
  }

  const card = findRegisteredNfcCard(cardId);
  if (!card) {
    return NextResponse.json({ error: "invalid_card" }, { status: 404 });
  }

  const session = createNfcSession(card.id);
  await setNfcSessionCookie(session, "mobile");

  const locale = detectLocale(request);
  const redirectUrl = `${publicOrigin(request)}/${locale}/nfc/play`;
  const response = NextResponse.redirect(redirectUrl, 302);
  return response;
}
