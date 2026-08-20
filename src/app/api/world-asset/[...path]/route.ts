import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";

const MIME_BY_EXT: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
};

const ASSET_ROOTS: Record<string, string> = {
  worlds: path.join(process.cwd(), "public", "worlds"),
  uploads: path.join(process.cwd(), "public", "uploads"),
};

export const dynamic = "force-dynamic";

function resolveAssetFile(segments: string[]): { root: string; filePath: string } | null {
  if (!segments.length) return null;

  let rootKey = "worlds";
  let relativeSegments = segments;

  if (segments[0] === "worlds" || segments[0] === "uploads") {
    rootKey = segments[0];
    relativeSegments = segments.slice(1);
  }

  if (!relativeSegments.length) return null;

  const root = ASSET_ROOTS[rootKey];
  const safeSegments = relativeSegments.map((segment) => path.basename(segment));
  const filePath = path.join(root, ...safeSegments);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedFile = path.resolve(filePath);

  if (!normalizedFile.startsWith(normalizedRoot)) return null;

  return { root, filePath: normalizedFile };
}

/** Serve world + upload assets from disk (GLB etc.) — reliable on production VPS. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const resolved = resolveAssetFile(segments ?? []);

  if (!resolved || !existsSync(resolved.filePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path.extname(resolved.filePath).toLowerCase();
  const body = readFileSync(resolved.filePath);

  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
