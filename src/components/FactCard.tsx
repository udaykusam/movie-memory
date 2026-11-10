"use client";

import { useCallback, useEffect, useState } from "react";

type FactResponse = {
  fact: { text: string; createdAt: string };
  source: "cache" | "generated" | "fallback";
};

type State =
  | { status: "loading" }
  | { status: "ready"; data: FactResponse }
  | { status: "error"; message: string };

const SOURCE_NOTE: Record<FactResponse["source"], string | null> = {
  generated: null,
  cache: "New facts are available once a minute. This one is from the last 60 seconds.",
  fallback: "We couldn't get a new fact just now, so here's your most recent one.",
};

export default function FactCard() {
  const [state, setState] = useState<State>({ status: "loading" });

  const loadFact = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/fact", { method: "POST", cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (res.status === 404) {
        window.location.href = "/onboarding";
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.fact) {
        setState({ status: "error", message: body?.error ?? "Something went wrong. Please try again." });
        return;
      }
      setState({ status: "ready", data: body as FactResponse });
    } catch {
      setState({ status: "error", message: "Network error. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    void loadFact();
  }, [loadFact]);

  const note = state.status === "ready" ? SOURCE_NOTE[state.data.source] : null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-gray-400/40 p-6">
      <h2 className="text-lg font-semibold">Fun fact</h2>

      <div aria-live="polite" className="min-h-16">
        {state.status === "loading" && <p className="animate-pulse text-gray-500">Finding a fun fact…</p>}
        {state.status === "error" && (
          <p role="alert" className="text-red-600">
            {state.message}
          </p>
        )}
        {state.status === "ready" && (
          <>
            <p className="text-lg leading-relaxed">{state.data.fact.text}</p>
            {note && <p className="mt-2 text-sm text-gray-500">{note}</p>}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => void loadFact()}
        disabled={state.status === "loading"}
        className="self-start rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-85 disabled:opacity-60"
      >
        Get another fact
      </button>
    </section>
  );
}
