import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { User } from "./models";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email / Mobile" },
        password: { label: "Password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier || "").trim();
        const password = String(credentials?.password || "");
        if (!identifier || !password) return null;

        await connectDB();
        const user = await User.findOne({
          $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
        }).lean();

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        const { logActivity } = await import("./logActivity");
        await logActivity({
          user: { id: String(user._id), name: user.name, role: user.role },
          action: "auth.login",
          targetType: "user",
          targetId: user._id,
        });

        return {
          id: String(user._id),
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session?.user) {
        session.user.id = token?.id;
        session.user.role = token?.role;
      }
      return session;
    },
  },
});
