import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { requireRole } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

function sanitize(users) {
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email || "",
    mobile: u.mobile || "",
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
  }));
}

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return Response.json(sanitize(users));
}

export async function POST(req) {
  const { user: admin, error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  const body = await req.json();
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const mobile = String(body?.mobile || "").trim();
  const password = String(body?.password || "");

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!email && !mobile) {
    return Response.json({ error: "Email or mobile is required" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const exists = await User.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(mobile ? [{ mobile }] : []),
    ],
  });
  if (exists) {
    return Response.json({ error: "This email/mobile is already registered" }, { status: 409 });
  }

  const user = await User.create({
    name,
    email: email || undefined,
    mobile: mobile || undefined,
    password: await bcrypt.hash(password, 10),
    role: "sant",
    active: true,
  });

  await logActivity({
    user: admin,
    action: "user.create",
    detail: `${name} (${email || mobile})`,
    targetType: "user",
    targetId: user._id,
  });

  return Response.json(
    sanitize([{ ...user.toObject(), _id: user._id }])[0],
    { status: 201 }
  );
}
