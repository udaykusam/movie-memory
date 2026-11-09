import { z } from "zod";
import { MOVIE_TITLE_MAX } from "@/lib/limits";

export const movieTitleSchema = z
  .string({ error: "Please enter a movie title." })
  // Collapse runs of whitespace (including newlines/tabs) so "  The   Matrix " is stored as "The Matrix".
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Please enter a movie title.")
      .max(MOVIE_TITLE_MAX, `Movie title must be ${MOVIE_TITLE_MAX} characters or fewer.`)
      // Reject invisible control characters that could slip past the whitespace cleanup.
      .regex(/^[^\p{Cc}]+$/u, "Movie title contains invalid characters."),
  );

export const movieFormSchema = z.object({
  title: movieTitleSchema,
});
