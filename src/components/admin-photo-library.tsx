"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { slugifyPhotoTitle, type PhotoLibraryImage } from "@/lib/photo-library";

type Props = {
  photos: PhotoLibraryImage[];
};

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

async function submitPhoto(url: string, formData: FormData, method = "POST") {
  const response = await fetch(url, { method, body: formData });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to save photo.");
  }

  return payload.message ?? "Saved.";
}

async function deletePhoto(photoId: string) {
  const response = await fetch(`/api/admin/leader-photos/${photoId}`, { method: "DELETE" });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to delete photo.");
  }

  return payload.message ?? "Deleted.";
}

async function reorderPhotos(orderedIds: string[]) {
  const response = await fetch("/api/admin/leader-photos/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds })
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to reorder photos.");
  }

  return payload.message ?? "Photos reordered.";
}

export function AdminPhotoLibrary({ photos }: Props) {
  const [orderedPhotos, setOrderedPhotos] = useState(photos);
  const [message, setMessage] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage);
    window.location.reload();
  }

  function persistOrder(nextPhotos: PhotoLibraryImage[]) {
    setOrderedPhotos(nextPhotos);
    const orderedIds = nextPhotos.map((photo) => photo.dbId).filter((id): id is string => Boolean(id));

    if (orderedIds.length !== nextPhotos.length) {
      setMessage("Fallback photos need to be seeded before they can be reordered.");
      return;
    }

    startTransition(async () => {
      try {
        const nextMessage = await reorderPhotos(orderedIds);
        setMessage(nextMessage);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to reorder photos.");
      }
    });
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= orderedPhotos.length) {
      return;
    }

    const nextPhotos = [...orderedPhotos];
    const [moved] = nextPhotos.splice(index, 1);
    nextPhotos.splice(targetIndex, 0, moved);
    persistOrder(nextPhotos);
  }

  return (
    <div className="admin-games-editor">
      {message ? <p className="admin-form-status">{message}</p> : null}

      <div className="admin-games-list-panel">
        {orderedPhotos.map((photo, index) => (
          <article
            className="admin-game-row"
            key={photo.dbId ?? photo.id}
            draggable={Boolean(photo.dbId)}
            onDragStart={() => setDraggedId(photo.dbId ?? null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedId || draggedId === photo.dbId) return;

              const fromIndex = orderedPhotos.findIndex((entry) => entry.dbId === draggedId);
              const toIndex = orderedPhotos.findIndex((entry) => entry.dbId === photo.dbId);

              if (fromIndex < 0 || toIndex < 0) return;

              const nextPhotos = [...orderedPhotos];
              const [moved] = nextPhotos.splice(fromIndex, 1);
              nextPhotos.splice(toIndex, 0, moved);
              setDraggedId(null);
              persistOrder(nextPhotos);
            }}
          >
            <span className="admin-game-drag" aria-hidden="true">
              <GripVertical size={18} />
            </span>
            <div className="admin-game-row-main">
              <strong>{photo.title}</strong>
              <small>{photo.fileName} · {photo.status === "open" ? "Open" : "Closed"}</small>
            </div>
            <div className="admin-game-row-actions">
              <button className="icon-button" type="button" aria-label={`Move ${photo.title} up`} disabled={isPending || index === 0} onClick={() => movePhoto(index, -1)}>
                <ArrowUp size={16} />
              </button>
              <button className="icon-button" type="button" aria-label={`Move ${photo.title} down`} disabled={isPending || index === orderedPhotos.length - 1} onClick={() => movePhoto(index, 1)}>
                <ArrowDown size={16} />
              </button>
              {photo.dbId ? (
                <Link className="button button-secondary" href={`/admin/leader-photos/${photo.dbId}` as Route}>
                  <Pencil size={16} />
                  <span>Edit</span>
                </Link>
              ) : null}
              <button
                className="button button-secondary danger-button"
                type="button"
                disabled={isPending || !photo.dbId}
                onClick={() => {
                  const photoDbId = photo.dbId;
                  if (!photoDbId) return;
                  if (!window.confirm(`Delete "${photo.title}" from the Image Library? This cannot be undone.`)) return;

                  startTransition(async () => {
                    try {
                      const nextMessage = await deletePhoto(photoDbId);
                      refreshWithMessage(nextMessage);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "Unable to delete photo.");
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
          const slug = String(formData.get("slug") ?? "").trim() || slugifyPhotoTitle(title);

          formData.set("slug", slug);
          formData.set("displayOrder", String(orderedPhotos.length + 1));

          startTransition(async () => {
            try {
              const nextMessage = await submitPhoto("/api/admin/leader-photos", formData);
              refreshWithMessage(nextMessage);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Unable to add photo.");
            }
          });
        }}
      >
        <div className="admin-game-add-head">
          <h2>Add new photo</h2>
          <p>Add a new Image Library entry. Use a public path such as /bible-photos/Capernaum.jpeg.</p>
        </div>
        <input name="title" placeholder="Photo title" required />
        <input name="slug" placeholder="URL slug, e.g. capernaum" />
        <input name="imagePath" placeholder="/bible-photos/Capernaum.jpeg" required />
        <input name="fileName" placeholder="Download filename, e.g. Capernaum.jpeg" />
        <select name="status" defaultValue="open" aria-label="Status">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <textarea name="description" placeholder="Short description for cards and detail page" required />
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Plus size={16} />
          <span>Add photo</span>
        </button>
      </form>
    </div>
  );
}
