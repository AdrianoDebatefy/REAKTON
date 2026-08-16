import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/content";

/** Public site content — press preview audio URLs are excluded. */
export async function GET() {
  const { pressPreview, ...publicContent } = getSiteContent();
  void pressPreview;

  return NextResponse.json(publicContent);
}
