import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { requireRole } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { user, error } = await requireRole();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return Response.json(
      { error: "Current and new password are required" },
      { status: 400 }
    );
  }
  if (newPassword.length < 6) {
    return Response.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 }
    );
  }
  if (currentPassword === newPassword) {
    return Response.json(
      { error: "New password must be different from the current one" },
      { status: 400 }
    );
  }

  await connectDB();
  const target = await User.findById(user.id).catch(() => null);
  if (!target) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, target.password);
  if (!valid) {
    return Response.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  target.password = await bcrypt.hash(newPassword, 10);
  await target.save();

  await logActivity({
    user,
    action: "password.change",
    detail: target.name,
    targetType: "user",
    targetId: target._id,
  });

  return Response.json({ ok: true });
}
