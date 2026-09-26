import { connectDB } from "@/lib/mongodb";
import { Setting } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

async function getSettings() {
  await connectDB();
  let doc = await Setting.findOne().lean();
  if (!doc) doc = await Setting.create({}).then((d) => d.toObject());
  return doc;
}

export async function GET() {
  const { error } = await requireRole();
  if (error) return error;

  const doc = await getSettings();
  return Response.json({
    siteName: doc.siteName || "Book Knowledge",
    tagline: doc.tagline || "",
  });
}

export async function PUT(req) {
  const { user, error } = await requireRole("admin");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const siteName = String(body?.siteName || "").trim();
  const tagline = String(body?.tagline || "").trim();
  if (!siteName) {
    return Response.json({ error: "Site name is required" }, { status: 400 });
  }

  await connectDB();
  let doc = await Setting.findOne();
  if (!doc) doc = new Setting();
  doc.siteName = siteName;
  doc.tagline = tagline;
  await doc.save();

  await logActivity({
    user,
    action: "settings.update",
    detail: `Site name: ${siteName}`,
    targetType: "settings",
    targetId: doc._id,
  });

  return Response.json(toPlain(doc));
}
