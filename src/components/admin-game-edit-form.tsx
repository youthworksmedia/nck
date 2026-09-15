"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { WysiwygEditor, type WysiwygEditorHandle } from "@/components/wysiwyg-editor";
import { gameCategories, type GamesLibraryGame } from "@/lib/games-library";

type Props = {
  game: GamesLibraryGame;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export function AdminGameEditForm({ game }: Props) {
  const [content, setContent] = useState(game.content ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<WysiwygEditorHandle | null>(null);

  return (
    <form
      className="admin-game-form admin-game-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!game.dbId) {
          setMessage("This fallback game needs to be seeded before it can be edited.");
          return;
        }

        const formData = new FormData(event.currentTarget);
        formData.set("content", editorRef.current?.getHtml() ?? content);
        formData.set("displayOrder", String(game.displayOrder));

        startTransition(async () => {
          const response = await fetch(`/api/admin/leader-games/${game.dbId}`, {
            method: "PUT",
            body: formData
          });
          const payload = await readJson(response);

          if (!response.ok) {
            setMessage(payload.message ?? "Unable to save game.");
            return;
          }

          setMessage(payload.message ?? "Game saved.");
        });
      }}
    >
      <div className="admin-game-add-head">
        <Link href={"/admin?section=leader-games" as Route} className="games-back-link">
          <ArrowLeft size={16} />
          Back to Games
        </Link>
        <h1>Edit game</h1>
        <p>Update the game details and rich content shown in the Games Library.</p>
      </div>
      {message ? <p className="admin-form-status">{message}</p> : null}
      <input name="title" defaultValue={game.title} placeholder="Game title" required />
      <input name="slug" defaultValue={game.id} placeholder="URL slug" required />
      <select name="category" defaultValue={game.category} aria-label="Category">
        {gameCategories.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
      <input name="groupSize" defaultValue={game.groupSize} placeholder="Whole group" />
      <input name="duration" defaultValue={game.duration} placeholder="10 min" />
      <select name="status" defaultValue={game.status} aria-label="Status">
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
      <textarea name="summary" defaultValue={game.summary} placeholder="Summary for cards and list previews" required />
      <WysiwygEditor
        ref={editorRef}
        label="Game content *"
        value={content}
        onChange={setContent}
        placeholder="Add what you'll need and how to play."
      />
      <textarea name="tip" defaultValue={game.tip} placeholder="Tip (optional)" />
      <div className="admin-game-actions">
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Save size={16} />
          <span>{isPending ? "Saving..." : "Save game"}</span>
        </button>
      </div>
    </form>
  );
}
