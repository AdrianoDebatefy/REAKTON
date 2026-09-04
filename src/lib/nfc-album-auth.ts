import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NfcSessionRecord } from "@/lib/nfc-album-sessions";

const secret = new TextEncoder().encode(
  process.env.NFC_ALBUM_SECRET ||
    process.env.PRESS_PREVIEW_SECRET ||
    process.env.ADMIN_SECRET ||
    "reakton-dev-secret-change-in-production"
);

export const NFC_MOBILE_COOKIE = "reakton_nfc_mobile";
export const NFC_DESKTOP_COOKIE = "reakton_nfc_desktop";

export type NfcAuthRole = "mobile" | "desktop";

export interface NfcAuthSession {
  sessionId: string;
  cardId: string;
  role: NfcAuthRole;
  pcCode?: string;
  expiresAt: number;
}

function cookieNameForRole(role: NfcAuthRole): string {
  return role === "mobile" ? NFC_MOBILE_COOKIE : NFC_DESKTOP_COOKIE;
}

export async function signNfcSessionToken(
  session: NfcSessionRecord,
  role: NfcAuthRole
): Promise<string> {
  const expiresAtSec = Math.floor(session.expiresAt / 1000);
  return new SignJWT({
    sessionId: session.sessionId,
    cardId: session.cardId,
    role,
    pcCode: role === "mobile" ? session.pcCode : undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAtSec)
    .sign(secret);
}

export async function setNfcSessionCookie(
  session: NfcSessionRecord,
  role: NfcAuthRole
): Promise<void> {
  const token = await signNfcSessionToken(session, role);
  (await cookies()).set(cookieNameForRole(role), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function clearNfcSessionCookie(role: NfcAuthRole): Promise<void> {
  (await cookies()).delete(cookieNameForRole(role));
}

async function readNfcSessionFromCookie(role: NfcAuthRole): Promise<NfcAuthSession | null> {
  const token = (await cookies()).get(cookieNameForRole(role))?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
    const cardId = typeof payload.cardId === "string" ? payload.cardId : "";
    const tokenRole = payload.role === "desktop" ? "desktop" : "mobile";
    const pcCode = typeof payload.pcCode === "string" ? payload.pcCode : undefined;
    const exp = typeof payload.exp === "number" ? payload.exp * 1000 : 0;
    if (!sessionId || !cardId || tokenRole !== role) return null;
    return { sessionId, cardId, role: tokenRole, pcCode, expiresAt: exp };
  } catch {
    return null;
  }
}

export async function getNfcMobileSession(): Promise<NfcAuthSession | null> {
  return readNfcSessionFromCookie("mobile");
}

export async function getNfcDesktopSession(): Promise<NfcAuthSession | null> {
  return readNfcSessionFromCookie("desktop");
}

export async function getAnyNfcSession(): Promise<NfcAuthSession | null> {
  const mobile = await getNfcMobileSession();
  if (mobile) return mobile;
  return getNfcDesktopSession();
}
