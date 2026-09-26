import { connectDB } from "@/lib/mongodb";
import { Topic } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const topics = await Topic.find().sort({ name: 1 }).lean();
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

  const exists = await Topic.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (exists) {
    return Response.json({ error: "This topic already exists" }, { status: 409 });
  }

  const topic = await Topic.create({ name, createdBy: user.id });
  return Response.json(toPlain(topic), { status: 201 });
}
