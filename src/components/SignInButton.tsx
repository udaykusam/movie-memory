"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      type="button"
      // After Google, come back to "/", which sends the user to onboarding or the dashboard.
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="rounded-lg bg-foreground px-6 py-3 font-medium text-background hover:opacity-85"
    >
      Sign in with Google
    </button>
  );
}
