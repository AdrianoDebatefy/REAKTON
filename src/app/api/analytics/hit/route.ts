import { NextResponse } from "next/server";
import { recordPageView } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string; referrer?: string };
    const path = typeof body.path === "string" ? body.path : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer : "";
    recordPageView(path, referrer);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
