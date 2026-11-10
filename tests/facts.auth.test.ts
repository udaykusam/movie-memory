import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addFact, addMovie, fakePrisma, resetDb } from "./helpers/fakePrisma";

vi.mock("@/lib/prisma", async () => ({
  prisma: (await import("./helpers/fakePrisma")).fakePrisma,
}));

vi.mock("@/lib/openai", () => ({ generateMovieFact: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

import { POST } from "@/app/api/fact/route";
import { getSession } from "@/lib/auth";
import { getFactForUser } from "@/lib/facts";
import { generateMovieFact } from "@/lib/openai";

const mockedSession = vi.mocked(getSession);
const generate = vi.mocked(generateMovieFact);

function signInAs(userId: string | null) {
  mockedSession.mockResolvedValue(
    userId ? ({ user: { id: userId }, expires: "2099-01-01T00:00:00Z" } as never) : null,
  );
}

describe("fact authorization", () => {
  beforeEach(() => {
    resetDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    generate.mockResolvedValue("A fact for user B.");

    const movieA = addMovie("user_a", "Alien");
    addFact("user_a", movieA, "User A's private fact.", 10_000);
    addMovie("user_b", "Babe");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never returns another user's facts, even when theirs is fresh", async () => {
    const result = await getFactForUser("user_b");

    expect(result).toMatchObject({ ok: true, source: "generated", fact: { text: "A fact for user B." } });
    expect(generate).toHaveBeenCalledWith("Babe");
  });

  it("scopes every fact query to the requesting user", async () => {
    await getFactForUser("user_b");

    const wheres = fakePrisma.fact.findFirst.mock.calls.map(([args]) => args.where);
    expect(wheres.length).toBeGreaterThan(0);
    for (const where of wheres) expect(where).toMatchObject({ userId: "user_b", movieId: "movie_user_b" });
  });

  it("does not fall back to another user's fact when OpenAI fails", async () => {
    generate.mockRejectedValueOnce(new Error("OpenAI is down"));

    const result = await getFactForUser("user_b");

    expect(result).toMatchObject({ ok: false, status: 503 });
  });

  it("returns 401 from the API when there is no session", async () => {
    signInAs(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(fakePrisma.movie.findUnique).not.toHaveBeenCalled();
  });

  it("serves the fact for the session's user only", async () => {
    signInAs("user_b");

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.text).toBe("A fact for user B.");
  });
});
