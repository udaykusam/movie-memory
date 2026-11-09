"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        // Land back on "/" so the home page routes the user to onboarding or the dashboard.
        signIn("google", { callbackUrl: "/" });
      }}
      className="rounded-lg bg-foreground px-6 py-3 font-medium text-background transition hover:opacity-85 disabled:opacity-60"
    >
      {loading ? "Redirecting…" : "Sign in with Google"}
    </button>
  );
}
