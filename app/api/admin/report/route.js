import { connectDB } from "@/lib/mongodb";
import { User, Book, Topic, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();

  const sants = await User.find({ role: "sant" })
    .sort({ name: 1 })
    .lean();

  const [bookAgg, topicAgg, entryAgg, lastAgg] = await Promise.all([
    Book.aggregate([{ $group: { _id: "$createdBy", count: { $sum: 1 } } }]),
    Topic.aggregate([{ $group: { _id: "$createdBy", count: { $sum: 1 } } }]),
    Entry.aggregate([{ $group: { _id: "$uploadedBy", count: { $sum: 1 } } }]),
    Entry.aggregate([
      { $group: { _id: "$uploadedBy", lastUpload: { $max: "$createdAt" } } },
    ]),
  ]);

  const map = (agg) => Object.fromEntries(agg.map((r) => [String(r._id), r]));
  const books = map(bookAgg);
  const topics = map(topicAgg);
  const entries = map(entryAgg);
  const lasts = map(lastAgg);

  const rows = sants.map((s) => {
    const id = String(s._id);
    return {
      id,
      name: s.name,
      email: s.email || "",
      mobile: s.mobile || "",
      active: s.active,
      books: books[id]?.count || 0,
      topics: topics[id]?.count || 0,
      entries: entries[id]?.count || 0,
      lastUpload: lasts[id]?.lastUpload || null,
      createdAt: s.createdAt,
    };
  });

  rows.sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name));

  const totals = rows.reduce(
    (acc, r) => ({
      books: acc.books + r.books,
      topics: acc.topics + r.topics,
      entries: acc.entries + r.entries,
    }),
    { books: 0, topics: 0, entries: 0 }
  );

  return Response.json({ rows, totals, sants: rows.length, inactive: rows.filter((r) => !r.active).length });
}
