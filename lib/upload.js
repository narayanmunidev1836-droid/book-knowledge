import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { put, del } from "@vercel/blob";

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

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

  // Vercel (serverless) — filesystem is read-only, store in Vercel Blob.
  if (blobEnabled()) {
    try {
      const blob = await put(`uploads/${sub}/${fileName}`, output, {
        access: "public",
        contentType: "image/webp",
      });
      return blob.url;
    } catch (e) {
      throw new Error(`Image upload failed: ${e?.message || "storage error"}`);
    }
  }

  // Local dev — keep saving into ./uploads
  const dir = path.join(UPLOAD_ROOT, sub);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), output);
  return `/uploads/${sub}/${fileName}`;
}

export async function removeUpload(publicPath) {
  if (!publicPath) return;

  // Vercel Blob URL
  if (/^https?:\/\//.test(publicPath)) {
    try {
      await del(publicPath);
    } catch {}
    return;
  }

  if (!publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, publicPath.slice("/uploads/".length));
  if (!filePath.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(filePath);
  } catch {}
}
