"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Save } from "lucide-react";

import type { PhotoLibraryImage } from "@/lib/photo-library";

type Props = {
  photo: PhotoLibraryImage;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export function AdminPhotoEditForm({ photo }: Props) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="admin-game-form admin-game-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!photo.dbId) {
          setMessage("This fallback photo needs to be seeded before it can be edited.");
          return;
        }

        const formData = new FormData(event.currentTarget);
        formData.set("displayOrder", String(photo.displayOrder));

        startTransition(async () => {
          const response = await fetch(`/api/admin/leader-photos/${photo.dbId}`, {
            method: "PUT",
            body: formData
          });
          const payload = await readJson(response);

          setMessage(response.ok ? payload.message ?? "Photo saved." : payload.message ?? "Unable to save photo.");
        });
      }}
    >
      <div className="admin-game-add-head">
        <Link href={"/admin?section=leader-photos" as Route} className="games-back-link">
          <ArrowLeft size={16} />
          Back to Image Library
        </Link>
        <h1>Edit photo</h1>
        <p>Update the title, description, public image path, and status shown in the Image Library.</p>
      </div>
      {message ? <p className="admin-form-status">{message}</p> : null}
      <input name="title" defaultValue={photo.title} placeholder="Photo title" required />
      <input name="slug" defaultValue={photo.id} placeholder="URL slug" required />
      <input name="imagePath" defaultValue={photo.imagePath} placeholder="/bible-photos/Capernaum.jpeg" required />
      <input name="fileName" defaultValue={photo.fileName} placeholder="Download filename" />
      <select name="status" defaultValue={photo.status} aria-label="Status">
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
      <textarea name="description" defaultValue={photo.description} placeholder="Short description" required />
      <div className="admin-game-actions">
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Save size={16} />
          <span>{isPending ? "Saving..." : "Save photo"}</span>
        </button>
      </div>
    </form>
  );
}
