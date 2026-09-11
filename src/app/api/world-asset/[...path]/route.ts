import { createReadStream, existsSync, statSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable } from "stream";

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

function parseRangeHeader(range: string | null, size: number): { start: number; end: number } | null {
  if (!range || !range.startsWith("bytes=")) return null;
  const [startStr, endStr] = range.replace(/^bytes=/, "").split("-");
  const start = startStr ? Number.parseInt(startStr, 10) : 0;
  const end = endStr ? Number.parseInt(endStr, 10) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function streamResponse(
  filePath: string,
  contentType: string,
  start: number,
  end: number,
  size: number,
  partial: boolean
): NextResponse {
  const length = end - start + 1;
  const stream = createReadStream(filePath, { start, end });
  const body = Readable.toWeb(stream) as ReadableStream;

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=604800",
  };

  if (partial) {
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    headers["Content-Length"] = String(length);
    return new NextResponse(body, { status: 206, headers });
  }

  headers["Content-Length"] = String(size);
  return new NextResponse(body, { headers });
}

/** Serve world + upload assets from disk (GLB etc.) — reliable on production VPS. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const resolved = resolveAssetFile(segments ?? []);

  if (!resolved || !existsSync(resolved.filePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path.extname(resolved.filePath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const { size } = statSync(resolved.filePath);
  const range = parseRangeHeader(request.headers.get("range"), size);

  if (range) {
    return streamResponse(
      resolved.filePath,
      contentType,
      range.start,
      range.end,
      size,
      true
    );
  }

  return streamResponse(resolved.filePath, contentType, 0, size - 1, size, false);
}
