import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PRESS_PREVIEW_COOKIE, getPressPreviewSession } from "@/lib/press-preview-auth";
import { getPressPreviewPasswordStatus } from "@/lib/press-preview-credentials";

export async function GET() {
  const session = await getPressPreviewSession();
  const status = getPressPreviewPasswordStatus();
  return NextResponse.json({
    authenticated: Boolean(session),
    email: session?.email ?? null,
    passwordConfigured: status.configured,
    passwordExpired: status.configured ? status.expired : false,
    expiresAt: status.configured ? status.expiresAt : null,
  });
}

export async function DELETE() {
  cookies().delete(PRESS_PREVIEW_COOKIE);
  return NextResponse.json({ ok: true });
}
