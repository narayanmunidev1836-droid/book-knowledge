import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { requireRole } from "@/lib/session";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

export async function PUT(req, { params }) {
  const { user: admin, error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const target = await User.findById(id).catch(() => null);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();

  if (typeof body.active === "boolean") {
    if (String(target._id) === admin.id && body.active === false) {
      return Response.json({ error: "You cannot deactivate yourself" }, { status: 400 });
    }
    target.active = body.active;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    target.name = body.name.trim();
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    target.password = await bcrypt.hash(body.password, 10);
  }

  await target.save();
  await logActivity({
    user: admin,
    action: "user.update",
    detail: target.name,
    targetType: "user",
    targetId: target._id,
  });
  return Response.json({
    id: String(target._id),
    name: target.name,
    active: target.active,
  });
}

export async function DELETE(req, { params }) {
  const { user: admin, error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  if (id === admin.id) {
    return Response.json({ error: "You cannot delete yourself" }, { status: 400 });
  }

  await connectDB();
  const target = await User.findById(id).catch(() => null);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  await target.deleteOne();
  await logActivity({
    user: admin,
    action: "user.delete",
    detail: target.name,
    targetType: "user",
    targetId: target._id,
  });
  return Response.json({ ok: true });
}
