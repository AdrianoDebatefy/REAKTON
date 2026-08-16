import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSiteContent, saveSiteContent } from "@/lib/content";
import { mergeSiteContent } from "@/lib/merge-content";
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
  const merged = mergeSiteContent(getSiteContent(), body);
  saveSiteContent(merged);
  return NextResponse.json({ ok: true, content: merged });
}
