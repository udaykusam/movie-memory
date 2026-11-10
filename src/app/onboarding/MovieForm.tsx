"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveMovie } from "./actions";

export default function MovieForm({ currentTitle }: { currentTitle?: string }) {
  // state holds the error returned by saveMovie; pending is true while it runs.
  const [state, formAction, pending] = useActionState(saveMovie, { error: "" });

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3">
      <label htmlFor="title" className="font-medium">
        Your favorite movie
      </label>
      <input
        id="title"
        name="title"
        required
        maxLength={100}
        defaultValue={currentTitle}
        placeholder="e.g. Spirited Away"
        className="rounded-lg border border-gray-400 bg-transparent px-4 py-2 outline-none focus:border-foreground"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-5 py-2 font-medium text-background hover:opacity-85 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {currentTitle && (
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
