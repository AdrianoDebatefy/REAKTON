import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/content";

/** Public site content — press preview audio URLs are excluded. */
export async function GET() {
  const content = getSiteContent();
  const { pressPreview: _pressPreview, ...publicContent } = content;

  return NextResponse.json(publicContent);
}
