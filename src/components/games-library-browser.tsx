"use client";

import Link from "next/link";
import { ArrowRight, Gamepad2, Grid3X3, List, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { gameCategories, type GameCategory, type GamesLibraryGame } from "@/lib/games-library";

type Props = {
  games: GamesLibraryGame[];
};

type ViewMode = "tiles" | "list";

function categoryClassName(category: GameCategory) {
  if (category === "Kindergarten-Year 2") return "games-category-orange";
  if (category === "Year 3-6") return "games-category-pink";
  return "games-category-blue";
}

export function GamesLibraryBrowser({ games }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GameCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return games.filter((game) => {
      const matchesCategory = category === "all" || game.category === category;
      const matchesQuery =
        !normalizedQuery ||
        [game.title, game.summary, game.groupSize, game.duration, game.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, games, query]);

  return (
    <section className="games-library-browser">
      <div className="games-library-controls">
        <label className="games-search">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games..."
          />
        </label>
        <div className="games-view-toggle" aria-label="Choose games view">
          <button
            type="button"
            className={viewMode === "tiles" ? "games-view-active" : ""}
            onClick={() => setViewMode("tiles")}
          >
            <Grid3X3 size={14} />
            Tiles
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "games-view-active" : ""}
            onClick={() => setViewMode("list")}
          >
            <List size={14} />
            List
          </button>
        </div>
      </div>

      <div className="games-category-tabs" aria-label="Filter games by category">
        <button
          type="button"
          className={category === "all" ? "games-category-active" : ""}
          onClick={() => setCategory("all")}
        >
          All categories
        </button>
        {gameCategories.map((entry) => (
          <button
            type="button"
            key={entry}
            className={category === entry ? "games-category-active" : ""}
            onClick={() => setCategory(entry)}
          >
            {entry}
          </button>
        ))}
      </div>

      {filteredGames.length ? (
        <div className={viewMode === "tiles" ? "games-tile-grid" : "games-list-panel"}>
          {filteredGames.map((game) =>
            viewMode === "tiles" ? (
              <Link href={`/leaders/games/${game.id}`} className="game-tile-card" key={game.id}>
                <span className={`game-category-pill ${categoryClassName(game.category)}`}>{game.category}</span>
                <strong>{game.title}</strong>
                <p>{game.summary}</p>
                <small>{game.groupSize} · {game.duration}</small>
              </Link>
            ) : (
              <Link href={`/leaders/games/${game.id}`} className="game-list-row" key={game.id}>
                <Gamepad2 className={`game-list-icon ${categoryClassName(game.category)}`} size={21} />
                <span className="game-list-copy">
                  <strong>{game.title}</strong>
                  <p>{game.summary}</p>
                </span>
                <span className={`game-category-pill ${categoryClassName(game.category)}`}>{game.category}</span>
                <small>{game.groupSize}</small>
                <ArrowRight size={18} />
              </Link>
            )
          )}
        </div>
      ) : (
        <p className="games-empty">No games match your search yet.</p>
      )}
    </section>
  );
}
