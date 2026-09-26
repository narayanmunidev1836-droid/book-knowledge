import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

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

  const input = Buffer.from(await file.arrayBuffer());

  let output;
  try {
    output = await sharp(input, { animated: true })
      .rotate()
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error("This image could not be processed — please upload a JPG or PNG");
  }

  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.webp`;
  const dir = path.join(UPLOAD_ROOT, sub);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), output);
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
