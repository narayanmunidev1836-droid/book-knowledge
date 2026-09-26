import { connectDB } from "@/lib/mongodb";
import { Topic } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const topics = await Topic.find({ createdBy: user.id })
    .sort({ name: 1 })
    .lean();
  return Response.json(toPlain(topics));
}

export async function POST(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) {
    return Response.json({ error: "Topic name is required" }, { status: 400 });
  }

  const rx = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const exists = await Topic.findOne({ createdBy: user.id, name: rx });
  if (exists) {
    return Response.json({ error: "You already have this topic" }, { status: 409 });
  }

  const topic = await Topic.create({ name, createdBy: user.id });
  await logActivity({
    user,
    action: "topic.create",
    detail: name,
    targetType: "topic",
    targetId: topic._id,
  });
  return Response.json(toPlain(topic), { status: 201 });
}
