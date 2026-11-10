import type { Fact, Prisma } from "@prisma/client";
import { generateMovieFact } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const CACHE_WINDOW_MS = 60_000;

export type FactResult =
  | { ok: true; fact: Fact; source: "cache" | "generated" | "fallback" }
  | { ok: false; status: 404 | 503; error: string };

function isFresh(fact: Fact) {
  return Date.now() - fact.createdAt.getTime() < CACHE_WINDOW_MS;
}

// Newest fact for this user's movie. Filtering by userId means a user only ever reads their own facts.
function findLatestFact(db: Prisma.TransactionClient, userId: string, movieId: string) {
  return db.fact.findFirst({
    where: { userId, movieId },
    orderBy: { createdAt: "desc" },
  });
}

// userId must come from the session, never from the request.
export async function getFactForUser(userId: string): Promise<FactResult> {
  const movie = await prisma.movie.findUnique({ where: { userId } });
  if (!movie) {
    return { ok: false, status: 404, error: "Save a favorite movie first." };
  }

  // 1. Fact from the last 60 seconds? Return it without calling OpenAI.
  const cached = await findLatestFact(prisma, userId, movie.id);
  if (cached && isFresh(cached)) {
    return { ok: true, fact: cached, source: "cache" };
  }

  try {
    return await prisma.$transaction(
      async (tx): Promise<FactResult> => {
        // 2. Per-user Postgres lock. Other requests for this user wait here until we finish.
        //    It is released automatically when the transaction ends, even if the server crashes.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}::text))`;

        // 3. Check again: a request that waited usually finds the fact the first one just made.
        const latest = await findLatestFact(tx, userId, movie.id);
        if (latest && isFresh(latest)) {
          return { ok: true, fact: latest, source: "cache" };
        }

        // 4. Generate a new fact and save it.
        const text = await generateMovieFact(movie.title);
        const fact = await tx.fact.create({ data: { userId, movieId: movie.id, text } });
        return { ok: true, fact, source: "generated" };
      },
      // Prisma's default is 5 seconds. Allow time to wait for one OpenAI call (10s) and make our own (10s).
      { timeout: 25_000 },
    );
  } catch (error) {
    console.error("Fact generation failed", error);

    // 5. OpenAI failed: return the most recent fact if there is one, otherwise a friendly error.
    const fallback = await findLatestFact(prisma, userId, movie.id);
    if (fallback) {
      return { ok: true, fact: fallback, source: "fallback" };
    }
    return {
      ok: false,
      status: 503,
      error: "We couldn't come up with a fact right now. Please try again in a moment.",
    };
  }
}
