import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  const movie = await prisma.movie.findUnique({
    where: { userId: session.user.id },
    select: { title: true },
  });
  if (!movie) redirect("/onboarding");

  // Google may not send a name or a photo, so every field has a fallback.
  const { name, email, image } = session.user;
  const displayName = name?.trim();
  const greeting = displayName ? `Hi, ${displayName}!` : "Hi there!";
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {image ? (
            // Plain <img>: avatars come from Google's CDN and don't need next/image optimisation.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              width={48}
              height={48}
              referrerPolicy="no-referrer"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-lg font-semibold"
            >
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{greeting}</p>
            {email && <p className="truncate text-sm text-gray-500">{email}</p>}
          </div>
        </div>
        <SignOutButton />
      </header>

      <section className="flex flex-col gap-1">
        <p className="text-sm uppercase tracking-wide text-gray-500">Your favorite movie</p>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="min-w-0 break-words text-3xl font-bold">{movie.title}</h1>
          <Link href="/onboarding" className="shrink-0 text-sm text-gray-500 hover:underline">
            Change
          </Link>
        </div>
      </section>
    </main>
  );
}
