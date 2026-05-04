"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="invite-form"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);

        startTransition(async () => {
          const response = await fetch("/api/admin/categories", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ name })
          });

          const payload = await response.json();
          setMessage(payload.message);

          if (!response.ok) {
            return;
          }

          setName("");
          router.refresh();
        });
      }}
    >
      <div className="inline-form">
        <input
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <button type="submit" className="button button-primary" disabled={isPending}>
          {isPending ? "Adding..." : "Add category"}
        </button>
      </div>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
