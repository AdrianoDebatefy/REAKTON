import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSiteContent, saveSiteContent } from "@/lib/content";
import type { SiteContent } from "@/types/content";

const secret = new TextEncoder().encode(
  process.env.ADMIN_SECRET || "reakton-dev-secret-change-in-production"
);

async function isAdmin(): Promise<boolean> {
  const token = cookies().get("reakton_admin")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

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
