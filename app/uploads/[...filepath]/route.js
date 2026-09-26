import { readFile } from "fs/promises";
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
  try {
    data = await readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  return new Response(data, {
    headers: {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": "public, max-age=0",
    },
  });
}
