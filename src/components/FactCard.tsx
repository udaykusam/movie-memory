"use client";

import { useEffect, useState } from "react";

export default function FactCard() {
  const [fact, setFact] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadFact() {
    setLoading(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/fact", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setFact(data.text);
        if (data.source === "cache") {
          setNote("New facts are available once a minute. This one is from the last 60 seconds.");
        }
        if (data.source === "fallback") {
          setNote("We couldn't get a new fact just now, so here's your most recent one.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  // Load a fact once, when the card first appears.
  useEffect(() => {
    loadFact();
  }, []);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-gray-400/40 p-6">
      <h2 className="text-lg font-semibold">Fun fact</h2>

      {loading && <p className="text-gray-500">Finding a fun fact…</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div>
          <p className="text-lg leading-relaxed">{fact}</p>
          {note && <p className="mt-2 text-sm text-gray-500">{note}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={loadFact}
        disabled={loading}
        className="self-start rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-60"
      >
        Get another fact
      </button>
    </section>
  );
}
