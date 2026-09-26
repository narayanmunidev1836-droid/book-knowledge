import { connectDB } from "@/lib/mongodb";
import { Topic, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const topic = await Topic.findById(id).catch(() => null);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  topic.name = name;
  await topic.save();
  await Entry.updateMany({ topic: topic._id }, { topicName: name });
  return Response.json(toPlain(topic));
}

export async function DELETE(req, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const topic = await Topic.findById(id).catch(() => null);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  await Entry.deleteMany({ topic: topic._id });
  await topic.deleteOne();
  return Response.json({ ok: true });
}
