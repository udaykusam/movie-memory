"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { movieTitleSchema } from "@/lib/validation";

export async function saveMovie(_prevState: { error: string }, formData: FormData) {
  // Anyone can call a server action, so check the session here too.
  const session = await getSession();
  if (!session) redirect("/");
  const userId = session.user.id;

  // Validate on the server. The form's maxLength is only a convenience for the user.
  const parsed = movieTitleSchema.safeParse(formData.get("title"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    // Replace the movie instead of updating it. The new movie gets a new id and the old
    // movie's facts are deleted with it, so the cache never shows a fact about the old title.
    await prisma.$transaction([
      prisma.movie.deleteMany({ where: { userId } }),
      prisma.movie.create({ data: { userId, title: parsed.data } }),
    ]);
  } catch (error) {
    console.error("Failed to save movie", error);
    return { error: "We couldn't save your movie. Please try again." };
  }

  // redirect() works by throwing, so it must stay outside the try/catch.
  redirect("/dashboard");
}
