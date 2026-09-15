"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import { gameCategories, slugifyGameTitle, type GamesLibraryGame } from "@/lib/games-library";

type Props = {
  games: GamesLibraryGame[];
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function submitGame(url: string, formData: FormData, method = "POST") {
  const response = await fetch(url, { method, body: formData });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to save game.");
  }

  return payload.message ?? "Saved.";
}

async function deleteGame(gameId: string) {
  const response = await fetch(`/api/admin/leader-games/${gameId}`, { method: "DELETE" });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to delete game.");
  }

  return payload.message ?? "Deleted.";
}

async function reorderGames(orderedIds: string[]) {
  const response = await fetch("/api/admin/leader-games/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds })
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to reorder games.");
  }

  return payload.message ?? "Games reordered.";
}

export function AdminGamesLibrary({ games }: Props) {
  const [orderedGames, setOrderedGames] = useState(games);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<WysiwygEditorHandle | null>(null);

  function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage);
    window.location.reload();
  }

  function persistOrder(nextGames: GamesLibraryGame[]) {
    setOrderedGames(nextGames);
    const orderedIds = nextGames.map((game) => game.dbId).filter((id): id is string => Boolean(id));

    if (orderedIds.length !== nextGames.length) {
      setMessage("Fallback games need to be seeded before they can be reordered.");
      return;
    }

    startTransition(async () => {
      try {
        const nextMessage = await reorderGames(orderedIds);
        setMessage(nextMessage);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to reorder games.");
      }
    });
  }

  function moveGame(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= orderedGames.length) {
      return;
    }

    const nextGames = [...orderedGames];
    const [moved] = nextGames.splice(index, 1);
    nextGames.splice(targetIndex, 0, moved);
    persistOrder(nextGames);
  }

  return (
    <div className="admin-games-editor">
      {message ? <p className="admin-form-status">{message}</p> : null}

      <div className="admin-games-list-panel">
        {orderedGames.map((game, index) => (
          <article
            className="admin-game-row"
            key={game.dbId ?? game.id}
            draggable={Boolean(game.dbId)}
            onDragStart={() => setDraggedId(game.dbId ?? null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedId || draggedId === game.dbId) return;

              const fromIndex = orderedGames.findIndex((entry) => entry.dbId === draggedId);
              const toIndex = orderedGames.findIndex((entry) => entry.dbId === game.dbId);

              if (fromIndex < 0 || toIndex < 0) return;

              const nextGames = [...orderedGames];
              const [moved] = nextGames.splice(fromIndex, 1);
              nextGames.splice(toIndex, 0, moved);
              setDraggedId(null);
              persistOrder(nextGames);
            }}
          >
            <span className="admin-game-drag" aria-hidden="true">
              <GripVertical size={18} />
            </span>
            <div className="admin-game-row-main">
              <strong>{game.title}</strong>
              <small>{game.category} · {game.groupSize} · {game.duration} · {game.status === "open" ? "Open" : "Closed"}</small>
            </div>
            <div className="admin-game-row-actions">
              <button
                className="icon-button"
                type="button"
                aria-label={`Move ${game.title} up`}
                disabled={isPending || index === 0}
                onClick={() => moveGame(index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={`Move ${game.title} down`}
                disabled={isPending || index === orderedGames.length - 1}
                onClick={() => moveGame(index, 1)}
              >
                <ArrowDown size={16} />
              </button>
              {game.dbId ? (
                <Link className="button button-secondary" href={`/admin/leader-games/${game.dbId}` as Route}>
                  <Pencil size={16} />
                  <span>Edit</span>
                </Link>
              ) : null}
              <button
                className="button button-secondary danger-button"
                type="button"
                disabled={isPending || !game.dbId}
                onClick={() => {
                  const gameDbId = game.dbId;
                  if (!gameDbId) return;
                  if (!window.confirm(`Delete "${game.title}" from the Games Library? This cannot be undone.`)) return;

                  startTransition(async () => {
                    try {
                      const nextMessage = await deleteGame(gameDbId);
                      refreshWithMessage(nextMessage);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "Unable to delete game.");
                    }
                  });
                }}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      <form
        className="admin-game-form admin-game-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const title = String(formData.get("title") ?? "");
          const slug = String(formData.get("slug") ?? "").trim() || slugifyGameTitle(title);

          formData.set("slug", slug);
          formData.set("content", editorRef.current?.getHtml() ?? content);
          formData.set("displayOrder", String(orderedGames.length + 1));

          startTransition(async () => {
            try {
              const nextMessage = await submitGame("/api/admin/leader-games", formData);
              refreshWithMessage(nextMessage);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Unable to add game.");
            }
          });
        }}
      >
        <div className="admin-game-add-head">
          <h2>Add new game</h2>
          <p>Add a new Games Library entry below the current list.</p>
        </div>
        <input name="title" placeholder="Game title" required />
        <input name="slug" placeholder="URL slug, e.g. musical-statues" />
        <select name="category" defaultValue="Kindergarten-Year 6" aria-label="Category">
          {gameCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <input name="groupSize" placeholder="Whole group" />
        <input name="duration" placeholder="10 min" />
        <select name="status" defaultValue="open" aria-label="Status">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <textarea name="summary" placeholder="Summary for cards and list previews" required />
        <WysiwygEditor
          ref={editorRef}
          label="Game content *"
          value={content}
          onChange={setContent}
          placeholder="Add what you'll need and how to play."
        />
        <textarea name="tip" placeholder="Tip (optional)" />
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Plus size={16} />
          <span>Add game</span>
        </button>
      </form>
    </div>
  );
}
