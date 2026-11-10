import { vi } from "vitest";

// A tiny in-memory stand-in for the parts of PrismaClient that facts.ts uses.
// Queries really filter by their `where` clause, so a missing userId filter would show up in tests.

type MovieRow = { id: string; userId: string; title: string };
type FactRow = { id: string; userId: string; movieId: string; text: string; createdAt: Date };

export const db = { movies: [] as MovieRow[], facts: [] as FactRow[] };

let nextId = 0;
// Serialises transactions, standing in for the per-user Postgres advisory lock.
let lockChain: Promise<unknown> = Promise.resolve();

function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function pick<T extends Record<string, unknown>>(row: T, select?: Record<string, boolean>) {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
}

export const fakePrisma = {
  movie: {
    findUnique: vi.fn(async ({ where, select }: { where: { userId: string }; select?: Record<string, boolean> }) => {
      const row = db.movies.find((m) => m.userId === where.userId);
      return row ? pick(row, select) : null;
    }),
  },
  fact: {
    findFirst: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const rows = db.facts
        .filter((f) => matches(f, where))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows[0] ? pick(rows[0], select) : null;
    }),
    create: vi.fn(
      async ({ data, select }: { data: Omit<FactRow, "id" | "createdAt">; select?: Record<string, boolean> }) => {
        const row: FactRow = { id: `fact_${++nextId}`, createdAt: new Date(), ...data };
        db.facts.push(row);
        return pick(row, select);
      },
    ),
  },
  $executeRaw: vi.fn(async () => 1),
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
    const run = lockChain.then(() => fn(fakePrisma));
    lockChain = run.catch(() => undefined);
    return run;
  }),
};

export function resetDb() {
  db.movies = [];
  db.facts = [];
  nextId = 0;
  lockChain = Promise.resolve();
  vi.clearAllMocks();
}

export function addMovie(userId: string, title: string, id = `movie_${userId}`) {
  db.movies.push({ id, userId, title });
  return id;
}

export function addFact(userId: string, movieId: string, text: string, ageMs: number) {
  db.facts.push({
    id: `fact_${++nextId}`,
    userId,
    movieId,
    text,
    createdAt: new Date(Date.now() - ageMs),
  });
}
