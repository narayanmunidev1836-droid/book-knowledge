import { connectDB } from "@/lib/mongodb";
import { User, Book, Topic, Entry } from "@/lib/models";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [totalSants, totalBooks, totalTopics, totalEntries, dailyAgg, topBooks, topTopics, perSant] =
    await Promise.all([
      User.countDocuments({ role: "sant" }),
      Book.countDocuments(),
      Topic.countDocuments(),
      Entry.countDocuments(),
      Entry.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Entry.aggregate([
        { $group: { _id: "$bookName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Entry.aggregate([
        { $unwind: { path: "$topicNames", includeArrayIndex: "i" } },
        { $group: { _id: "$topicNames", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Entry.aggregate([
        { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
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

  const santNames = await User.find(
    { _id: { $in: perSant.map((r) => r._id) } },
    { name: 1 }
  )
    .lean()
    .catch(() => []);
  const nameMap = Object.fromEntries(santNames.map((u) => [String(u._id), u.name]));

  return Response.json({
    totals: { totalSants, totalBooks, totalTopics, totalEntries },
    daily,
    topBooks: topBooks.map((r) => ({ name: r._id, count: r.count })),
    topTopics: topTopics.map((r) => ({ name: r._id, count: r.count })),
    perSant: perSant.map((r) => ({
      name: nameMap[String(r._id)] || "Unknown",
      count: r.count,
    })),
  });
}
