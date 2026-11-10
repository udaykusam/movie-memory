import { z } from "zod";

// Server-side rule for a movie title. The 100 matches the VarChar(100) column in the schema.
export const movieTitleSchema = z
  .string()
  .trim()
  .min(1, "Please enter a movie title.")
  .max(100, "Movie title must be 100 characters or fewer.");
