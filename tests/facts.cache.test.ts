import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addFact, addMovie, db, fakePrisma, resetDb } from "./helpers/fakePrisma";

vi.mock("@/lib/prisma", async () => ({
  prisma: (await import("./helpers/fakePrisma")).fakePrisma,
}));

vi.mock("@/lib/openai", () => ({
  OPENAI_TIMEOUT_MS: 10_000,
  generateMovieFact: vi.fn(),
}));

import { CACHE_WINDOW_MS, getFactForUser } from "@/lib/facts";
import { generateMovieFact } from "@/lib/openai";

const generate = vi.mocked(generateMovieFact);
const USER = "user_a";

describe("getFactForUser – 60 second cache", () => {
  let movieId: string;

  beforeEach(() => {
    resetDb();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    movieId = addMovie(USER, "Spirited Away");
    generate.mockResolvedValue("A brand new fact.");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("generates and stores a fact when none exists", async () => {
    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: true, source: "generated", fact: { text: "A brand new fact." } });
    expect(generate).toHaveBeenCalledWith("Spirited Away");
    expect(db.facts).toHaveLength(1);
  });

  it("returns the cached fact when it is under 60 seconds old", async () => {
    addFact(USER, movieId, "Cached fact.", 30_000);

    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: true, source: "cache", fact: { text: "Cached fact." } });
    expect(generate).not.toHaveBeenCalled();
    expect(fakePrisma.$transaction).not.toHaveBeenCalled();
  });

  it("still uses the cache 1ms before the window closes", async () => {
    addFact(USER, movieId, "Almost stale.", CACHE_WINDOW_MS - 1);

    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: true, source: "cache" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("generates a new fact once the newest fact is exactly 60 seconds old", async () => {
    addFact(USER, movieId, "Stale fact.", CACHE_WINDOW_MS);

    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: true, source: "generated", fact: { text: "A brand new fact." } });
    expect(db.facts).toHaveLength(2);
  });

  it("compares against the newest fact, not an older one", async () => {
    addFact(USER, movieId, "Old fact.", 5 * 60_000);
    addFact(USER, movieId, "Recent fact.", 10_000);

    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: true, source: "cache", fact: { text: "Recent fact." } });
  });

  it("only calls OpenAI once when several requests arrive together", async () => {
    let finish!: (text: string) => void;
    generate.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));

    const requests = Promise.all([getFactForUser(USER), getFactForUser(USER), getFactForUser(USER)]);
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    finish("The only fact.");
    const results = await requests;

    expect(generate).toHaveBeenCalledTimes(1);
    expect(db.facts).toHaveLength(1);
    expect(results.map((r) => r.ok && r.fact.text)).toEqual(["The only fact.", "The only fact.", "The only fact."]);
    expect(results.map((r) => r.ok && r.source).sort()).toEqual(["cache", "cache", "generated"]);
  });

  it("falls back to the most recent fact when OpenAI fails", async () => {
    addFact(USER, movieId, "Older fact.", 5 * 60_000);
    generate.mockRejectedValueOnce(new Error("timeout"));

    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: true, source: "fallback", fact: { text: "Older fact." } });
    expect(db.facts).toHaveLength(1);
  });

  it("returns a friendly 503 when OpenAI fails and there is no fact to fall back on", async () => {
    generate.mockRejectedValueOnce(new Error("timeout"));

    const result = await getFactForUser(USER);

    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(result.ok === false && result.error).toMatch(/try again/i);
  });

  it("returns 404 when the user has no favorite movie", async () => {
    const result = await getFactForUser("user_without_movie");

    expect(result).toMatchObject({ ok: false, status: 404 });
    expect(generate).not.toHaveBeenCalled();
  });
});
