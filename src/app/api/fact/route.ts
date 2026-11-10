import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFactForUser } from "@/lib/facts";

// POST, not GET, because it can create a fact (and spend an OpenAI call).
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The user id comes only from the session. Nothing from the request is used.
  const result = await getFactForUser(session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ text: result.fact.text, source: result.source });
}
