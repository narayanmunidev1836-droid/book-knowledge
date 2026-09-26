import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function saveUpload(file, sub = "entries") {
  if (!file || typeof file === "string") return null;
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only image files are allowed (jpg, png, webp)");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image size must be less than 15MB");
  }

  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".jpg").toLowerCase();
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_ROOT, sub);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${sub}/${fileName}`;
}

export async function removeUpload(publicPath) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, publicPath.slice("/uploads/".length));
  if (!filePath.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(filePath);
  } catch {}
}
