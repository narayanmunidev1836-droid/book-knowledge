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
  await Entry.updateMany(
    { topics: topic._id },
    { $set: { "topicNames.$[el]": name } },
    { arrayFilters: [{ el: topic._id }] }
  );
  return Response.json(toPlain(topic));
}

export async function DELETE(req, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const topic = await Topic.findById(id).catch(() => null);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  await Entry.updateMany({ topics: topic._id }, { $pull: { topics: topic._id, topicNames: topic.name } });

  const affected = await Entry.find({ topic: topic._id }).lean();
  for (const entry of affected) {
    if (entry.topics?.length) {
      const remaining = entry.topics[0];
      const remainingName =
        entry.topicNames?.[0] ||
        (await Topic.findById(remaining).lean())?.name ||
        entry.topicName;
      await Entry.updateOne({ _id: entry._id }, { topic: remaining, topicName: remainingName });
    } else {
      await Entry.deleteOne({ _id: entry._id });
    }
  }

  await topic.deleteOne();
  return Response.json({ ok: true });
}
