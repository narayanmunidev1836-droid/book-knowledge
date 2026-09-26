import { connectDB } from "./mongodb";
import { Activity } from "./models";

export async function logActivity({ user, action, detail, targetType, targetId }) {
  try {
    await connectDB();
    await Activity.create({
      actorId: user?.id || "",
      actorName: user?.name || "System",
      role: user?.role || "",
      action,
      detail: detail ? String(detail).slice(0, 300) : undefined,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
    });
  } catch {
    // Logging must never break the main request.
  }
}
