import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { gujaratiPattern } from "@/lib/translit";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const q = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 30);

  const filter = {};
  if (action && action !== "all") filter.action = action;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    let phonetic = null;
    try {
      const src = gujaratiPattern(q);
      if (src) phonetic = new RegExp(src);
    } catch {}
    filter.$or = ["actorName", "detail"].flatMap((f) =>
      phonetic ? [{ [f]: rx }, { [f]: phonetic }] : [{ [f]: rx }]
    );
  }

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Activity.countDocuments(filter),
  ]);

  return Response.json({
    items: toPlain(items),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
