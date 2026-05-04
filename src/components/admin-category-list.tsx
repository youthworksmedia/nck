"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ResourceCategory } from "@/types";

type Props = {
  categories: ResourceCategory[];
};

export function AdminCategoryList({ categories }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="stack-sm">
      {categories.map((category) => {
        const isEditing = editingId === category.id;

        return (
          <div className="admin-inline-row" key={category.id}>
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                required
              />
            ) : (
              <strong>{category.name}</strong>
            )}
            <div className="button-row button-row-tight">
              {isEditing ? (
                <button
                  type="button"
                  className="button button-primary"
                  disabled={isPending}
                  onClick={() => {
                    setMessage(null);
                    startTransition(async () => {
                      const response = await fetch(`/api/admin/categories/${category.id}`, {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ name: editingName })
                      });

                      const payload = await response.json();
                      setMessage(payload.message);

                      if (!response.ok) {
                        return;
                      }

                      setEditingId(null);
                      setEditingName("");
                      router.refresh();
                    });
                  }}
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(category.id);
                    setEditingName(category.name);
                    setMessage(null);
                  }}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="button button-secondary"
                disabled={isPending}
                onClick={() => {
                  const confirmed = window.confirm(
                    `Delete the category "${category.name}"? Existing resources will be moved to Uncategorized.`
                  );

                  if (!confirmed) {
                    return;
                  }

                  setMessage(null);
                  startTransition(async () => {
                    const response = await fetch(`/api/admin/categories/${category.id}`, {
                      method: "DELETE"
                    });

                    const payload = await response.json();
                    setMessage(payload.message);

                    if (!response.ok) {
                      return;
                    }

                    if (editingId === category.id) {
                      setEditingId(null);
                      setEditingName("");
                    }

                    router.refresh();
                  });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
