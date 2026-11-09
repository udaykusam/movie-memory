// Shared by server validation and client forms. Kept separate so client bundles don't pull in zod.
// Must match the @db.VarChar(100) column on Movie.title.
export const MOVIE_TITLE_MAX = 100;
