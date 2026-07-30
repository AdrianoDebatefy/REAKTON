import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { deleteContactMessage, listContactMessages } from "@/lib/contact-messages";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ messages: listContactMessages() });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id || !deleteContactMessage(id)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
