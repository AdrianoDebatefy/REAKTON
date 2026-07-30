import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import {
  setAdminPassword,
  validateNewPassword,
  verifyAdminPassword,
} from "@/lib/admin-credentials";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const validationError = validateNewPassword(body.newPassword);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const validCurrent = await verifyAdminPassword(body.currentPassword);
    if (!validCurrent) {
      return NextResponse.json({ error: "wrong_password" }, { status: 400 });
    }

    await setAdminPassword(body.newPassword);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
