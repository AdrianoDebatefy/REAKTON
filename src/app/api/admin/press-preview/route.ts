import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { readPressAccessLog } from "@/lib/press-access-log";
import {
  generateRandomPressPassword,
  getPressPreviewPasswordStatus,
  setPressPreviewPassword,
} from "@/lib/press-preview-credentials";
import { readPressVotes } from "@/lib/press-votes";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    password: getPressPreviewPasswordStatus(),
    accessLog: readPressAccessLog(50),
    votes: readPressVotes().byTrack,
  });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { expiryDays?: number; regenerate?: boolean };
  const expiryDays = Math.min(365, Math.max(1, Math.round(body.expiryDays ?? 14)));
  const password = generateRandomPressPassword();
  const creds = await setPressPreviewPassword(password, expiryDays);

  return NextResponse.json({
    ok: true,
    password,
    expiresAt: creds.expiresAt,
    expiryDays: creds.expiryDays,
  });
}
