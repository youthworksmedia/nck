"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { ministryLeaderResourceTypeOptions } from "@/lib/ministry-leader-resources";
import type { MinistryLeaderResourceSection } from "@/types";

type Props = {
  sections: MinistryLeaderResourceSection[];
};

function statusMessageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function submitForm(url: string, form: HTMLFormElement, method = "POST") {
  const response = await fetch(url, {
    method,
    body: new FormData(form)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to save resource content.");
  }
}

async function deleteEntry(url: string, payload: Record<string, string>) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to delete resource content.");
  }
}

export function AdminMinistryLeaderResources({ sections }: Props) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshWithMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.location.reload();
  };

  return (
    <div className="admin-leader-resource-editor">
      {message ? <p className="admin-form-status">{message}</p> : null}
      <form
        className="admin-leader-section-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          startTransition(async () => {
            try {
              await submitForm("/api/admin/ministry-leader-resources/sections", form);
              refreshWithMessage("Section added.");
            } catch (error) {
              setMessage(statusMessageFromError(error));
            }
          });
        }}
      >
        <input name="title" placeholder="Section title" required />
        <input name="description" placeholder="Short description" />
        <input name="displayOrder" type="number" min="0" defaultValue={sections.length + 1} aria-label="Display order" />
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Plus size={16} />
          <span>Add section</span>
        </button>
      </form>

      <div className="stack-sm">
        {sections.map((section) => (
          <section className="admin-leader-section" key={section.id}>
            <form
              className="admin-leader-section-head"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                startTransition(async () => {
                  try {
                    await submitForm(`/api/admin/ministry-leader-resources/sections/${section.id}`, form, "PUT");
                    refreshWithMessage("Section saved.");
                  } catch (error) {
                    setMessage(statusMessageFromError(error));
                  }
                });
              }}
            >
              <input name="title" defaultValue={section.title} aria-label="Section title" required />
              <input name="description" defaultValue={section.description} aria-label="Section description" />
              <input name="displayOrder" type="number" min="0" defaultValue={section.displayOrder} aria-label="Display order" />
              <select name="status" defaultValue={section.status} aria-label="Status">
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <button className="icon-button" type="submit" aria-label={`Save ${section.title}`} disabled={isPending}>
                <Save size={16} />
              </button>
              <button
                className="icon-button danger-button"
                type="button"
                aria-label={`Delete ${section.title}`}
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await deleteEntry(`/api/admin/ministry-leader-resources/sections/${section.id}`, {});
                      refreshWithMessage("Section deleted.");
                    } catch (error) {
                      setMessage(statusMessageFromError(error));
                    }
                  });
                }}
              >
                <Trash2 size={16} />
              </button>
            </form>

            <div className="admin-leader-items">
              {section.items.map((item) => (
                <form
                  className="admin-leader-item-form"
                  key={item.id}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    startTransition(async () => {
                      try {
                        await submitForm(`/api/admin/ministry-leader-resources/items/${item.id}`, form, "PUT");
                        refreshWithMessage("Resource saved.");
                      } catch (error) {
                        setMessage(statusMessageFromError(error));
                      }
                    });
                  }}
                >
                  <input name="title" defaultValue={item.title} aria-label="Resource title" required />
                  <input name="description" defaultValue={item.description} aria-label="Resource description" />
                  <input name="icon" defaultValue={item.icon} aria-label="Icon" placeholder="calendar" />
                  <select name="resourceType" defaultValue={item.resourceType} aria-label="Resource type">
                    {ministryLeaderResourceTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input name="actionLabel" defaultValue={item.actionLabel} aria-label="Action label" placeholder="PDF" />
                  <input name="duration" defaultValue={item.duration ?? ""} aria-label="Duration" placeholder="0:30" />
                  <input name="url" defaultValue={item.url ?? ""} aria-label="External URL" placeholder="https://..." />
                  <input name="displayOrder" type="number" min="0" defaultValue={item.displayOrder} aria-label="Display order" />
                  <select name="status" defaultValue={item.status} aria-label="Status">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                  <label className="admin-file-inline">
                    <span>{item.fileName || "Upload file"}</span>
                    <input name="file" type="file" />
                  </label>
                  <button className="icon-button" type="submit" aria-label={`Save ${item.title}`} disabled={isPending}>
                    <Save size={16} />
                  </button>
                  <button
                    className="icon-button danger-button"
                    type="button"
                    aria-label={`Delete ${item.title}`}
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await deleteEntry(`/api/admin/ministry-leader-resources/items/${item.id}`, {});
                          refreshWithMessage("Resource deleted.");
                        } catch (error) {
                          setMessage(statusMessageFromError(error));
                        }
                      });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              ))}

              <form
                className="admin-leader-item-form admin-leader-item-add-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  startTransition(async () => {
                    try {
                      await submitForm("/api/admin/ministry-leader-resources/items", form);
                      refreshWithMessage("Resource added.");
                    } catch (error) {
                      setMessage(statusMessageFromError(error));
                    }
                  });
                }}
              >
                <input type="hidden" name="sectionId" value={section.id} />
                <input name="title" placeholder="Resource title" required />
                <input name="description" placeholder="Description" />
                <input name="icon" placeholder="calendar" defaultValue="file" />
                <select name="resourceType" defaultValue="pdf">
                  {ministryLeaderResourceTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input name="actionLabel" placeholder="PDF" />
                <input name="duration" placeholder="0:30" />
                <input name="url" placeholder="https://..." />
                <input name="displayOrder" type="number" min="0" defaultValue={section.items.length + 1} aria-label="Display order" />
                <select name="status" defaultValue="open" aria-label="Status">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
                <label className="admin-file-inline">
                  <span>Upload file</span>
                  <input name="file" type="file" />
                </label>
                <button className="button button-primary" type="submit" disabled={isPending}>
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
