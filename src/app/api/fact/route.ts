import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFactForUser } from "@/lib/facts";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// POST rather than GET: it can create a fact (and spend an OpenAI call), and the session
// cookie is SameSite=Lax, so cross-site pages can't trigger it on the user's behalf.
export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  // The user id comes only from the session; the request body is ignored entirely.
  const result = await getFactForUser(session.user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(
    {
      fact: { text: result.fact.text, createdAt: result.fact.createdAt.toISOString() },
      source: result.source,
    },
    { headers: NO_STORE },
  );
}
