import { readFile, stat } from "fs/promises";
import path from "path";
import { UPLOAD_ROOT } from "@/lib/upload";

export const dynamic = "force-dynamic";

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

const CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function GET(req, { params }) {
  const { filepath } = await params;
  const parts = Array.isArray(filepath) ? filepath : [filepath];
  if (parts.some((p) => p.includes("..") || p.includes("/"))) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_ROOT, ...parts);
  if (!filePath.startsWith(UPLOAD_ROOT)) {
    return new Response("Not found", { status: 404 });
  }

  let data;
  let meta;
  try {
    [data, meta] = await Promise.all([readFile(filePath), stat(filePath)]);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const etag = `"${meta.size.toString(36)}-${Math.floor(meta.mtimeMs).toString(36)}"`;
  const inm = req.headers.get("if-none-match") || "";
  const fresh = inm
    .split(",")
    .some((tag) => tag.trim() === etag || tag.trim() === `W/${etag}`);
  if (fresh) {
    return new Response(null, {
      status: 304,
      headers: { etag, "cache-control": CACHE_CONTROL },
    });
  }

  return new Response(data, {
    headers: {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": CACHE_CONTROL,
      etag,
    },
  });
}
