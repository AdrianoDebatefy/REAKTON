import { NextResponse } from "next/server";
import { z } from "zod";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().max(300).optional(),
  message: z.string().min(1).max(5000),
  gdpr: z.literal(true),
  captchaAnswer: z.number(),
  captchaExpected: z.number(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (data.captchaAnswer !== data.captchaExpected) {
      return NextResponse.json({ error: "captcha" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "data", "messages");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          name: data.name,
          email: data.email,
          subject: data.subject ?? "",
          message: data.message,
          at: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
