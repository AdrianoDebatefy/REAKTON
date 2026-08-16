import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.PRESS_PREVIEW_SECRET ||
    process.env.ADMIN_SECRET ||
    "reakton-dev-secret-change-in-production"
);

export const PRESS_PREVIEW_COOKIE = "reakton_press_preview";

export interface PressPreviewSession {
  email: string;
  sessionId: string;
}

export async function getPressPreviewSession(): Promise<PressPreviewSession | null> {
  const token = cookies().get(PRESS_PREVIEW_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const email = typeof payload.email === "string" ? payload.email : "";
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
    if (!email || !sessionId) return null;
    return { email, sessionId };
  } catch {
    return null;
  }
}

export async function isPressPreviewAuthenticated(): Promise<boolean> {
  return (await getPressPreviewSession()) !== null;
}
