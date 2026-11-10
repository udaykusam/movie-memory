import type { Prisma } from "@prisma/client";
import { generateMovieFact, OPENAI_TIMEOUT_MS } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const CACHE_WINDOW_MS = 60_000;

// A request may wait for another request's generation to finish and then run its own
// (if that one failed), so allow two OpenAI calls plus a buffer for the queries.
const TRANSACTION_TIMEOUT_MS = OPENAI_TIMEOUT_MS * 2 + 5_000;

const factSelect = { id: true, text: true, createdAt: true } as const;

export type FactDTO = { id: string; text: string; createdAt: Date };

export type FactResult =
  | { ok: true; fact: FactDTO; source: "cache" | "generated" | "fallback" }
  | { ok: false; status: 404 | 503; error: string };

type FactReader = Pick<Prisma.TransactionClient, "fact">;

function isFresh(fact: FactDTO | null): fact is FactDTO {
  return fact !== null && Date.now() - fact.createdAt.getTime() < CACHE_WINDOW_MS;
}

// Always filtered by userId as well as movieId, so a user can only ever read their own facts.
function findLatestFact(db: FactReader, userId: string, movieId: string) {
  return db.fact.findFirst({
    where: { userId, movieId },
    orderBy: { createdAt: "desc" },
    select: factSelect,
  });
}

/**
 * Returns a fact about the signed-in user's favorite movie.
 *
 * `userId` must come from the server-side session, never from the request.
 *
 * 1. If the newest fact is under 60 seconds old, return it (no OpenAI call).
 * 2. Otherwise take a per-user Postgres advisory lock so only one request generates at a time.
 * 3. Re-check the cache inside the lock: a request that waited usually finds the fact the
 *    previous lock holder just created.
 * 4. Generate, store and return a new fact.
 * 5. If generation fails, fall back to the most recent fact, or return a friendly error.
 */
export async function getFactForUser(userId: string): Promise<FactResult> {
  const movie = await prisma.movie.findUnique({
    where: { userId },
    select: { id: true, title: true },
  });
  if (!movie) {
    return { ok: false, status: 404, error: "Save a favorite movie first." };
  }

  const cached = await findLatestFact(prisma, userId, movie.id);
  if (isFresh(cached)) return { ok: true, fact: cached, source: "cache" };

  try {
    return await prisma.$transaction(
      async (tx): Promise<FactResult> => {
        // Transaction-scoped lock: released automatically on commit, rollback or a dropped
        // connection, so a crash can never leave it stuck.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fact:${userId}`}::text))`;

        const latest = await findLatestFact(tx, userId, movie.id);
        if (isFresh(latest)) return { ok: true, fact: latest, source: "cache" };

        const text = await generateMovieFact(movie.title);
        const fact = await tx.fact.create({
          data: { userId, movieId: movie.id, text },
          select: factSelect,
        });
        return { ok: true, fact, source: "generated" };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  } catch (error) {
    console.error("Fact generation failed", error);

    // Re-read rather than reuse `cached`: another request may have stored a newer fact meanwhile.
    const fallback = await findLatestFact(prisma, userId, movie.id).catch(() => null);
    if (fallback) return { ok: true, fact: fallback, source: "fallback" };

    return {
      ok: false,
      status: 503,
      error: "We couldn't come up with a fact right now. Please try again in a moment.",
    };
  }
}
