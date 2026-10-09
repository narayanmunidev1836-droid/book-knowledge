import crypto from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const ENDPOINT = process.env.R2_ENDPOINT || "";
const BUCKET = process.env.R2_BUCKET || "";

let client = null;

export const r2Configured = Boolean(ENDPOINT && BUCKET);

function getClient() {
  if (!r2Configured) {
    throw new Error("R2 is not configured (R2_ENDPOINT / R2_BUCKET missing)");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return client;
}

/**
 * Object keys are stored in MongoDB (short strings, never derived again):
 *   entries/<entryId>/<index>[-<token>]/full.webp   (+ thumb.webp)
 *   covers/<bookId>.webp
 * `token` makes freshly uploaded objects collision-free — removing image 0
 * shifts the array, so index-only keys could overwrite a surviving image.
 * The migration script passes no token (deterministic, idempotent).
 */
export function entryImageKey(entryId, index, kind, token = "") {
  const dir = token ? `${index}-${token}` : String(index);
  return `entries/${entryId}/${dir}/${kind === "thumb" ? "thumb" : "full"}.webp`;
}

export function newImageToken() {
  return crypto.randomBytes(4).toString("hex");
}

export function coverKey(bookId) {
  return `covers/${bookId}.webp`;
}

/** True when the stored value is an R2 object key (vs legacy data-URI /uploads path). */
export function isR2Key(src) {
  return (
    typeof src === "string" &&
    (src.startsWith("entries/") ||
      src.startsWith("covers/") ||
      src.startsWith("pdfs/"))
  );
}

/** Optional public bucket / custom domain base (no signing, no proxy hop). */
export function publicR2Url(key) {
  const base = process.env.R2_PUBLIC_BASE;
  if (!base || !isR2Key(key)) return "";
  return `${base.replace(/\/+$/, "")}/${key}`;
}

export async function putObject(key, body, contentType = "image/webp") {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return key;
}

export async function getObject(key) {
  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    if (!res?.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return {
      buffer: Buffer.from(bytes),
      contentType: res.ContentType || "image/webp",
      etag: res.ETag || "",
      contentLength: res.ContentLength ?? bytes.length,
    };
  } catch (e) {
    if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

export async function deleteObject(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Book PDF: `pdfs/<bookId>-<token>.pdf` (token changes on every replace). */
export function pdfKey(bookId, token = newImageToken()) {
  return `pdfs/${bookId}-${token}.pdf`;
}
