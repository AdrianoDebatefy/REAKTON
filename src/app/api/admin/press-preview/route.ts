import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { readPressAccessLog } from "@/lib/press-access-log";
import {
  addPressPreviewAccess,
  generateRandomPressPassword,
  getPressPreviewAccessSummary,
  listPressPreviewAccesses,
} from "@/lib/press-preview-credentials";
import { readPressVotes } from "@/lib/press-votes";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    summary: getPressPreviewAccessSummary(),
    accesses: listPressPreviewAccesses(),
    accessLog: readPressAccessLog(50),
    votes: readPressVotes().byTrack,
  });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { expiryDays?: number };
  const expiryDays = Math.min(365, Math.max(1, Math.round(body.expiryDays ?? 14)));
  const password = generateRandomPressPassword();
  const entry = await addPressPreviewAccess(password, expiryDays);

  return NextResponse.json({
    ok: true,
    id: entry.id,
    password,
    expiresAt: entry.expiresAt,
    expiryDays: entry.expiryDays,
    createdAt: entry.createdAt,
  });
}
