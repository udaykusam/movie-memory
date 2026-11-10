"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="shrink-0 rounded-lg border border-gray-400 px-4 py-2 text-sm font-medium hover:bg-foreground/10"
    >
      Sign out
    </button>
  );
}
