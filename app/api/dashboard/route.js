import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Book, Topic, Entry } from "@/lib/models";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

function toOid(value) {
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

// Same shape as /api/admin/analytics, but scoped to the logged-in user.
export async function GET() {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const uid = toOid(user.id);
  if (!uid) {
    return Response.json({
      totals: { totalRecords: 0, totalPhotos: 0, totalBooks: 0, totalTopics: 0 },
      daily: [],
      topBooks: [],
      topTopics: [],
    });
  }

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const match = { uploadedBy: uid };

  const [totalRecords, photoAgg, totalBooks, totalTopics, dailyAgg, topBooks, topTopics] =
    await Promise.all([
      Entry.countDocuments(match),
      // Photos = images[] when present, else the single legacy `image`.
      Entry.aggregate([
        { $match: match },
        {
          $project: {
            n: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
                { $size: "$images" },
                {
                  $cond: [
                    { $gt: [{ $strLenCP: { $ifNull: ["$image", ""] } }, 0] },
                    1,
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $group: { _id: null, photos: { $sum: "$n" } } },
      ]),
      Book.countDocuments({ createdBy: uid }),
      Topic.countDocuments({ createdBy: uid }),
      Entry.aggregate([
        { $match: { ...match, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Entry.aggregate([
        { $match: match },
        { $group: { _id: "$bookName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Entry.aggregate([
        { $match: match },
        { $unwind: { path: "$topicNames", includeArrayIndex: "i" } },
        { $group: { _id: "$topicNames", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

  const byDate = Object.fromEntries(dailyAgg.map((r) => [r._id, r.count]));
  const daily = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ date: key, count: byDate[key] || 0 });
  }

  return Response.json({
    totals: {
      totalRecords,
      totalPhotos: photoAgg[0]?.photos || 0,
      totalBooks,
      totalTopics,
    },
    daily,
    topBooks: topBooks.map((r) => ({ name: r._id, count: r.count })),
    topTopics: topTopics.map((r) => ({ name: r._id, count: r.count })),
  });
}
