"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { movieFormSchema } from "@/lib/validation";

export type SaveMovieState = { error?: string };

export async function saveMovie(
  _prevState: SaveMovieState,
  formData: FormData,
): Promise<SaveMovieState> {
  // Server actions are public endpoints: re-check the session here, never trust the page that rendered the form.
  const session = await getSession();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  // Server-side validation is the source of truth; the form's maxLength is only a convenience.
  const parsed = movieFormSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid movie title." };
  }

  try {
    // Replace instead of update: the new movie gets a new id, and the cascade removes the old
    // movie's facts, so the 60-second fact cache can never serve a fact about the previous title.
    await prisma.$transaction([
      prisma.movie.deleteMany({ where: { userId } }),
      prisma.movie.create({ data: { userId, title: parsed.data.title } }),
    ]);
  } catch (error) {
    console.error("Failed to save favorite movie", error);
    return { error: "We couldn't save your movie. Please try again." };
  }

  // redirect() throws a special error, so it must stay outside the try/catch above.
  redirect("/dashboard");
}
