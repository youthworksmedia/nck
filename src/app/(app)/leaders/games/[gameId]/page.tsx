import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Users } from "lucide-react";

import { getGameById, getPublishedGames, type GameCategory } from "@/lib/games-library";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";

type Props = {
  params: Promise<{ gameId: string }>;
};

function categoryClassName(category: GameCategory) {
  if (category === "Kindergarten-Year 2") return "games-category-orange";
  if (category === "Year 3-6") return "games-category-pink";
  return "games-category-blue";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId } = await params;
  const game = await getGameById(gameId);

  return buildPrivateMetadata({
    title: game ? `${game.title} | Games Library` : "Game | Games Library",
    description: game?.summary ?? "Games Library activity instructions."
  });
}

export async function generateStaticParams() {
  const games = await getPublishedGames();

  return games.map((game) => ({ gameId: game.id }));
}

export default async function GameDetailPage({ params }: Props) {
  const [{ gameId }, access] = await Promise.all([params, getMemberAccessSnapshot()]);

  if (!access.user) {
    redirect("/login");
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  const game = await getGameById(gameId);

  if (!game) {
    notFound();
  }

  return (
    <main className="site-shell section account-page game-detail-page">
      <Link className="games-back-link" href="/leaders/games">
        <ArrowLeft size={16} />
        Back to Games Library
      </Link>
      <article className="game-detail-content">
        <span className={`game-category-pill ${categoryClassName(game.category)}`}>{game.category}</span>
        <h1>{game.title}</h1>
        <p className="game-detail-summary">{game.summary}</p>
        <div className="game-detail-meta">
          <span>
            <Users size={18} />
            {game.groupSize}
          </span>
          <span>
            <Clock size={18} />
            {game.duration}
          </span>
        </div>

        <div
          className="game-detail-rich-content"
          dangerouslySetInnerHTML={{ __html: game.content ?? "" }}
        />
        {game.tip ? (
          <aside className="game-tip-card">
            <strong>Tip</strong>
            <p>{game.tip}</p>
          </aside>
        ) : null}
      </article>
    </main>
  );
}
