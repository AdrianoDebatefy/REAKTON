import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

/** Public site content — press preview audio URLs are excluded. */
export async function GET() {
  const { pressPreview, ...publicContent } = getSiteContent();
  void pressPreview;

  return NextResponse.json(publicContent, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
