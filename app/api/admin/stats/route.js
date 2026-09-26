import { connectDB } from "@/lib/mongodb";
import { User, Book, Topic, Entry } from "@/lib/models";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  const [totalSants, totalBooks, totalTopics, totalImages, recent] =
    await Promise.all([
      User.countDocuments({ role: "sant" }),
      Book.countDocuments(),
      Topic.countDocuments(),
      Entry.countDocuments(),
      Entry.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

  return Response.json({
    totalSants,
    totalBooks,
    totalTopics,
    totalImages,
    recent: JSON.parse(JSON.stringify(recent)),
  });
}
