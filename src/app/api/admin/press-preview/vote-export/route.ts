import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { formatPressVoteLogTxt } from "@/lib/press-vote-log";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = formatPressVoteLogTxt();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="press-votes.txt"',
    },
  });
}
