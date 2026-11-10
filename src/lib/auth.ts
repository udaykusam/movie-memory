import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // The adapter saves users, Google accounts and sessions in Postgres.
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Sessions live in the Session table, so signing out deletes them on the server.
  session: { strategy: "database" },
  pages: { signIn: "/" },
  callbacks: {
    // Put the user's database id on the session. Every query uses this id.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
};

// Reads the signed-in user's session on the server (null when signed out).
export const getSession = () => getServerSession(authOptions);
