import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import type { WorldAtmosphere } from "@/types/content";
import { recordPressAccess } from "@/lib/press-access-log";
import {
  getPressPreviewPasswordStatus,
  verifyPressPreviewPassword,
} from "@/lib/press-preview-credentials";
import { PRESS_PREVIEW_COOKIE } from "@/lib/press-preview-auth";

const secret = new TextEncoder().encode(
  process.env.PRESS_PREVIEW_SECRET ||
    process.env.ADMIN_SECRET ||
    "reakton-dev-secret-change-in-production"
);

const WORLDS: WorldAtmosphere[] = ["cosmos", "nano", "club"];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    world?: WorldAtmosphere;
  };

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const world = body.world;

  if (!email || !password || !world || !WORLDS.includes(world)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const status = getPressPreviewPasswordStatus();
  if (!status.configured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (status.expired) {
    return NextResponse.json({ error: "expired" }, { status: 401 });
  }

  if (!(await verifyPressPreviewPassword(password))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessionId = randomUUID();
  recordPressAccess(email, world);

  const token = await new SignJWT({ email, sessionId, role: "press_preview" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);

  (await cookies()).set(PRESS_PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ ok: true, world });
}
