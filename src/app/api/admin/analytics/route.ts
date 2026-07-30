import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { readAnalytics } from "@/lib/analytics";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(readAnalytics());
}
