import { vi } from "vitest";

// A tiny in-memory database that stands in for Prisma, so the tests need no real Postgres.
// findFirst really filters by its `where`, so a query that forgot userId would fail a test.

type Movie = { id: string; userId: string; title: string };
type Fact = { id: string; userId: string; movieId: string; text: string; createdAt: Date };

export const db = { movies: [] as Movie[], facts: [] as Fact[] };

let nextId = 0;

// Transactions run one after another, like the per-user Postgres lock.
let lastTransaction: Promise<unknown> = Promise.resolve();

export const fakePrisma = {
  movie: {
    findUnique: vi.fn(async ({ where }: { where: { userId: string } }) => {
      return db.movies.find((m) => m.userId === where.userId) ?? null;
    }),
  },
  fact: {
    findFirst: vi.fn(async ({ where }: { where: { userId: string; movieId: string } }) => {
      const matching = db.facts.filter((f) => f.userId === where.userId && f.movieId === where.movieId);
      matching.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest first
      return matching[0] ?? null;
    }),
    create: vi.fn(async ({ data }: { data: { userId: string; movieId: string; text: string } }) => {
      const fact = { id: `fact_${++nextId}`, createdAt: new Date(), ...data };
      db.facts.push(fact);
      return fact;
    }),
  },
  $executeRaw: vi.fn(async () => 1),
  $transaction: vi.fn((work: (tx: unknown) => Promise<unknown>) => {
    const run = lastTransaction.then(() => work(fakePrisma));
    lastTransaction = run.catch(() => {});
    return run;
  }),
};

export function resetDb() {
  db.movies = [];
  db.facts = [];
  nextId = 0;
  lastTransaction = Promise.resolve();
  vi.clearAllMocks();
}

export function addMovie(userId: string, title: string) {
  const id = `movie_${userId}`;
  db.movies.push({ id, userId, title });
  return id;
}

export function addFact(userId: string, movieId: string, text: string, ageMs: number) {
  db.facts.push({ id: `fact_${++nextId}`, userId, movieId, text, createdAt: new Date(Date.now() - ageMs) });
}
