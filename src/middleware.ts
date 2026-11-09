import { NextResponse } from "next/server";

// Placeholder: lets every request through. Route protection is added in the dashboard step.
export function middleware() {
  return NextResponse.next();
}

export const config = { matcher: [] };
