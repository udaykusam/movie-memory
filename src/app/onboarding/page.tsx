import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MovieForm from "./MovieForm";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  // A user who already has a movie can come here to change it; the form is prefilled.
  const movie = await prisma.movie.findUnique({
    where: { userId: session.user.id },
    select: { title: true },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold">
        {movie ? "Change your favorite movie" : "What's your favorite movie?"}
      </h1>
      <MovieForm currentTitle={movie?.title} />
    </main>
  );
}
