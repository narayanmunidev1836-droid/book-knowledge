import { connectDB } from "@/lib/mongodb";
import { Topic, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";
import { removeEntryImages } from "@/lib/upload";

export const dynamic = "force-dynamic";

async function loadOwnTopic(id, userId) {
  await connectDB();
  try {
    return await Topic.findOne({ _id: id, createdBy: userId });
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const topic = await loadOwnTopic(id, user.id);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  const entryCount = await Entry.countDocuments({
    $or: [{ topic: topic._id }, { topics: topic._id }],
    uploadedBy: user.id,
  });
  return Response.json({ ...toPlain(topic), entryCount });
}

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const topic = await loadOwnTopic(id, user.id);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const rx = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const dup = await Topic.findOne({
    createdBy: user.id,
    name: rx,
    _id: { $ne: topic._id },
  });
  if (dup) {
    return Response.json({ error: "You already have this topic" }, { status: 409 });
  }

  topic.name = name;
  await topic.save();
  await logActivity({
    user,
    action: "topic.update",
    detail: name,
    targetType: "topic",
    targetId: topic._id,
  });
  await Entry.updateMany(
    { topic: topic._id, uploadedBy: user.id },
    { topicName: name }
  );
  await Entry.updateMany(
    { topics: topic._id, uploadedBy: user.id },
    { $set: { "topicNames.$[el]": name } },
    { arrayFilters: [{ el: topic._id }] }
  );
  return Response.json(toPlain(topic));
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const topic = await loadOwnTopic(id, user.id);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  await Entry.updateMany(
    { topics: topic._id, uploadedBy: user.id },
    { $pull: { topics: topic._id, topicNames: topic.name } }
  );

  const affected = await Entry.find({ topic: topic._id, uploadedBy: user.id }).lean();
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
      await removeEntryImages(entry);
    }
  }

  await topic.deleteOne();
  await logActivity({
    user,
    action: "topic.delete",
    detail: topic.name,
    targetType: "topic",
    targetId: topic._id,
  });
  return Response.json({ ok: true });
}
