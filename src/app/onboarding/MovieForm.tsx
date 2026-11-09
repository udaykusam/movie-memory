"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveMovie, type SaveMovieState } from "./actions";
import { MOVIE_TITLE_MAX } from "@/lib/limits";

const initialState: SaveMovieState = {};

export default function MovieForm({ currentTitle }: { currentTitle?: string }) {
  const [state, formAction, pending] = useActionState(saveMovie, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3">
      <label htmlFor="title" className="font-medium">
        Your favorite movie
      </label>
      <input
        id="title"
        name="title"
        type="text"
        required
        maxLength={MOVIE_TITLE_MAX}
        defaultValue={currentTitle}
        placeholder="e.g. Spirited Away"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "title-error" : undefined}
        className="rounded-lg border border-gray-400 bg-transparent px-4 py-2 outline-none focus:border-foreground"
      />
      {state.error && (
        <p id="title-error" role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-5 py-2 font-medium text-background transition hover:opacity-85 disabled:opacity-60"
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
