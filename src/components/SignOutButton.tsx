"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signOut({ callbackUrl: "/" });
      }}
      className="shrink-0 rounded-lg border border-gray-400 px-4 py-2 text-sm font-medium transition hover:bg-foreground/10 disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
