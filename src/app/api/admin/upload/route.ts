import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

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

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(path.join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
