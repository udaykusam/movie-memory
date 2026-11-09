import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await getSession();

  if (session) {
    const movie = await prisma.movie.findUnique({ where: { userId: session.user.id } });
    redirect(movie ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Movie Memory</h1>
      <p className="text-gray-500">Save your favorite movie and discover fun facts.</p>
      <SignInButton />
    </main>
  );
}