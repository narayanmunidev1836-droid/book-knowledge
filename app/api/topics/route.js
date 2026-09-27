import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Topic, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

// Records per topic — an entry can carry a topic in `topic` or in `topics`.
async function topicRecordCounts(userId) {
  let oid;
  try {
    oid = new mongoose.Types.ObjectId(String(userId));
  } catch {
    return [];
  }
  return Entry.aggregate([
    { $match: { uploadedBy: oid } },
    {
      $project: {
        ids: { $setUnion: [["$topic"], { $ifNull: ["$topics", []] }] },
      },
    },
    { $unwind: "$ids" },
    { $match: { ids: { $ne: null } } },
    { $group: { _id: "$ids", count: { $sum: 1 } } },
  ]);
}

export async function GET(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const [topics, counts] = await Promise.all([
    Topic.find({ createdBy: user.id })
      .sort({ name: 1 })
      .lean(),
    topicRecordCounts(user.id),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const plain = toPlain(topics).map((t) => ({
    ...t,
    entryCount: countMap.get(String(t._id)) || 0,
  }));

  // ?sort=count → busiest topic first (count itself comes from the DB).
  const sortByCount = new URL(req.url).searchParams.get("sort") === "count";
  if (sortByCount) {
    plain.sort(
      (a, b) =>
        b.entryCount - a.entryCount || String(a.name).localeCompare(String(b.name))
    );
  }
  return Response.json(plain);
}

export async function POST(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const body = await req.json().catch(() => ({}));
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
