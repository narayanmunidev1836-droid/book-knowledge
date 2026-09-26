import { auth } from "./auth";

export async function requireRole(...roles) {
  const session = await auth();
  if (!session?.user) {
    return {
      error: Response.json({ error: "Not logged in" }, { status: 401 }),
    };
  }
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    return {
      error: Response.json({ error: "You don't have permission for this" }, { status: 403 }),
    };
  }
  return { user: session.user };
}

export function toPlain(doc) {
  return JSON.parse(JSON.stringify(doc));
}
