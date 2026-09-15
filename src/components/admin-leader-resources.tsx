"use client";

import { useState, useTransition } from "react";
import { FileText, Link as LinkIcon, Plus, Save, Trash2, Video } from "lucide-react";

import { leaderResourceTypeOptions } from "@/lib/leader-resources";
import type { LeaderResourceSection } from "@/types";

type Props = {
  sections: LeaderResourceSection[];
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
    throw new Error(data.message ?? "Unable to save leader resources.");
  }
}

async function deleteEntry(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to delete leader resources.");
  }
}

function formatLeaderResourceType(type: string) {
  if (type === "coming_soon") {
    return "Coming soon";
  }

  if (type === "pdf") {
    return "PDF";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

function ResourceTypeIcon({ type }: { type: string }) {
  if (type === "video") {
    return <Video size={16} />;
  }

  if (type === "link") {
    return <LinkIcon size={16} />;
  }

  return <FileText size={16} />;
}

export function AdminLeaderResources({ sections }: Props) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshWithMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.location.reload();
  };

  return (
    <div className="admin-leaders-editor">
      {message ? <p className="admin-form-status">{message}</p> : null}
      <form
        className="admin-leaders-section-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          startTransition(async () => {
            try {
              await submitForm("/api/admin/leader-resources/sections", form);
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
          <section className="admin-leaders-section" key={section.id}>
            <form
              className="admin-leaders-section-head"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                startTransition(async () => {
                  try {
                    await submitForm(`/api/admin/leader-resources/sections/${section.id}`, form, "PUT");
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
                      await deleteEntry(`/api/admin/leader-resources/sections/${section.id}`);
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

            <div className="admin-leaders-items">
              {section.items.map((item) => (
                <form
                  className="admin-leaders-item-form"
                  key={item.id}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    startTransition(async () => {
                      try {
                        await submitForm(`/api/admin/leader-resources/items/${item.id}`, form, "PUT");
                        refreshWithMessage("Resource saved.");
                      } catch (error) {
                        setMessage(statusMessageFromError(error));
                      }
                    });
                  }}
                >
                  <div className="admin-leaders-item-main">
                    <input name="title" defaultValue={item.title} aria-label="Title" required />
                    <input name="description" defaultValue={item.description} aria-label="Description" />
                    <input name="duration" defaultValue={item.duration ?? ""} aria-label="Duration" placeholder="12 min" />
                    <label className="admin-leaders-type-select">
                      <ResourceTypeIcon type={item.resourceType} />
                      <select name="resourceType" defaultValue={item.resourceType} aria-label="Type">
                        {leaderResourceTypeOptions.map((type) => (
                          <option key={type} value={type}>{formatLeaderResourceType(type)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="admin-leaders-item-meta">
                    <input name="url" defaultValue={item.url ?? ""} aria-label="URL" placeholder="https://..." />
                    <label className="admin-file-inline">
                      <span>{item.fileName || "Upload file"}</span>
                      <input name="file" type="file" />
                    </label>
                    <input name="displayOrder" type="number" min="0" defaultValue={item.displayOrder} aria-label="Display order" />
                    <select name="status" defaultValue={item.status} aria-label="Status">
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
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
                            await deleteEntry(`/api/admin/leader-resources/items/${item.id}`);
                            refreshWithMessage("Resource deleted.");
                          } catch (error) {
                            setMessage(statusMessageFromError(error));
                          }
                        });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </form>
              ))}

              <form
                className="admin-leaders-item-form admin-leaders-item-add-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  startTransition(async () => {
                    try {
                      await submitForm("/api/admin/leader-resources/items", form);
                      refreshWithMessage("Resource added.");
                    } catch (error) {
                      setMessage(statusMessageFromError(error));
                    }
                  });
                }}
              >
                <input type="hidden" name="sectionId" value={section.id} />
                <div className="admin-leaders-item-main">
                  <input name="title" placeholder="Title" required />
                  <input name="description" placeholder="Description" />
                  <input name="duration" placeholder="12 min" />
                  <label className="admin-leaders-type-select">
                    <ResourceTypeIcon type="video" />
                    <select name="resourceType" defaultValue="video" aria-label="Type">
                      {leaderResourceTypeOptions.map((type) => (
                        <option key={type} value={type}>{formatLeaderResourceType(type)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin-leaders-item-meta">
                  <input name="url" placeholder="https://..." />
                  <label className="admin-file-inline">
                    <span>Upload file</span>
                    <input name="file" type="file" />
                  </label>
                  <input name="displayOrder" type="number" min="0" defaultValue={section.items.length + 1} aria-label="Display order" />
                  <select name="status" defaultValue="open" aria-label="Status">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button className="button button-primary" type="submit" disabled={isPending}>
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
