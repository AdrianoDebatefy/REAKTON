import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSiteContent, saveSiteContent } from "@/lib/content";
import type { SiteContent } from "@/types/content";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getSiteContent());
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as SiteContent;
  saveSiteContent(body);
  return NextResponse.json({ ok: true });
}
