import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";

const WORLDS_DIR = path.join(process.cwd(), "public", "worlds");

const MIME_BY_EXT: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
};

export const dynamic = "force-dynamic";

/** Serve large world assets (GLB etc.) from disk — Next.js static handler misses some files in production. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments?.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const safeSegments = segments.map((segment) => path.basename(segment));
  const filePath = path.join(WORLDS_DIR, ...safeSegments);
  const normalizedRoot = path.resolve(WORLDS_DIR) + path.sep;
  const normalizedFile = path.resolve(filePath);

  if (!normalizedFile.startsWith(normalizedRoot)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!existsSync(normalizedFile)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path.extname(normalizedFile).toLowerCase();
  const body = readFileSync(normalizedFile);

  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
