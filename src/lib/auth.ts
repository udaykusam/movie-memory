import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  // Sessions are stored in Postgres (Session table) so they can be revoked server-side.
  session: { strategy: "database" },
  pages: { signIn: "/" },
  callbacks: {
    // Expose the database user id to the app. Every data query is scoped by this id.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};

export const getSession = () => getServerSession(authOptions);
