import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

import { GamesLibraryBrowser } from "@/components/games-library-browser";
import { getPublishedGames } from "@/lib/games-library";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Games Library",
  description: "Recommended games to fill time, settle a group, or reinforce a lesson."
});

export default async function GamesLibraryPage() {
  const [access, games] = await Promise.all([getMemberAccessSnapshot(), getPublishedGames()]);

  if (!access.user) {
    redirect("/login");
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  return (
    <main className="site-shell section account-page games-library-page">
      <Link className="games-back-link" href="/leaders">
        <ArrowLeft size={16} />
        Back to Leader Resources
      </Link>
      <section className="games-library-head">
        <span className="eyebrow">
          <Home size={18} />
          Leaders · Games Library
        </span>
        <h1>Games Library</h1>
        <p>Recommended games to fill time, settle a group, or reinforce a lesson - organised by age group.</p>
      </section>
      <GamesLibraryBrowser games={games} />
    </main>
  );
}
