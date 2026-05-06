"use client";

import type { Route } from "next";
import Link from "next/link";
import { FileText, GripVertical, Music4, NotebookPen, Pencil, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { AdminAssetPicker } from "@/components/admin-asset-picker";
import { AdminTermNoteEditor } from "@/components/admin-term-note-editor";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { getTodayISO } from "@/lib/time";
import type { CurriculumTermNote, Resource } from "@/types";
import type { ResourceLibraryFile } from "@/lib/resource-assets";

type Props = {
  resources: Resource[];
  files: ResourceLibraryFile[];
  activeYear: "Year A" | "Year B" | "Year C";
  activeTerm?: "Term 1" | "Term 2" | "Term 3" | "Term 4";
  termNotes: CurriculumTermNote[];
  basePath?: "/content" | "/admin";
};

function isInactiveResource(resource: Resource) {
  const today = getTodayISO();
  const isExpired = Boolean(resource.expiryDate && resource.expiryDate < today);
  return resource.status === "closed" || isExpired;
}

function isExpiredResource(resource: Resource) {
  const today = getTodayISO();
  return Boolean(resource.expiryDate && resource.expiryDate < today);
}

function buildContentHref(
  basePath: "/content" | "/admin",
  params: {
    tab?: "add" | "files";
    year?: string;
    term?: string;
  }
) {
  const searchParams = new URLSearchParams();

  if (basePath === "/admin") {
    searchParams.set("section", params.tab === "files" ? "media" : "content");
  }

  if (params.tab && params.tab !== "files") {
    searchParams.set("tab", params.tab);
  }

  if (params.year) {
    searchParams.set("year", params.year);
  }

  if (params.term) {
    searchParams.set("term", params.term);
  }

  const query = searchParams.toString();
  return (query ? `${basePath}?${query}` : basePath) as Route;
}

export function AdminResourceList({
  resources,
  files,
  activeYear,
  activeTerm = "Term 1",
  termNotes,
  basePath = "/content"
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<"Term 1" | "Term 2" | "Term 3" | "Term 4">(activeTerm);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    scripture: "",
    yearCycle: "Year A" as "Year A" | "Year B" | "Year C",
    term: "Term 1" as "Term 1" | "Term 2" | "Term 3" | "Term 4",
    publishDate: "",
    expiryDate: "",
    status: "open" as "open" | "closed",
    existingMusicPath: "",
    existingWorksheetPath: "",
    existingManualPath: "",
    musicFile: null as File | null,
    worksheetFile: null as File | null,
    manualFile: null as File | null
  });

  useEffect(() => {
    setSelectedTerm(activeTerm);
  }, [activeTerm]);

  const grouped = useMemo(
    () =>
      ["Year A", "Year B", "Year C"].map((yearCycle) => ({
        yearCycle,
        terms: ["Term 1", "Term 2", "Term 3", "Term 4"].map((term) => ({
          term,
          entries: resources
            .filter(
              (resource) =>
                (resource.yearCycle ?? "Year A") === yearCycle &&
                (resource.term ?? "Term 1") === term
            )
            .sort((a, b) => {
              const aInactive = isInactiveResource(a);
              const bInactive = isInactiveResource(b);

              if (aInactive !== bInactive) {
                return aInactive ? 1 : -1;
              }

              return (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0);
            })
        }))
      })),
    [resources]
  );

  const termNoteMap = useMemo(
    () =>
      new Map(
        termNotes.map((note) => [`${note.yearCycle}::${note.term}`, note.content])
      ),
    [termNotes]
  );

  async function reorder(yearCycle: "Year A" | "Year B" | "Year C", term: "Term 1" | "Term 2" | "Term 3" | "Term 4", orderedIds: string[]) {
    startTransition(async () => {
      const response = await fetch("/api/admin/resources/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ yearCycle, term, orderedIds })
      });

      if (response.ok) {
        router.refresh();
      }
    });
  }

  function submitDraft(resourceId: string, options?: { addMore?: boolean }) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", draft.title);
      formData.set("description", draft.description);
      formData.set("scripture", draft.scripture);
      formData.set("yearCycle", draft.yearCycle);
      formData.set("term", draft.term);
      formData.set("publishDate", draft.publishDate);
      formData.set("expiryDate", draft.expiryDate);
      formData.set("status", draft.status);
      formData.set("existingMusicPath", draft.existingMusicPath);
      formData.set("existingWorksheetPath", draft.existingWorksheetPath);
      formData.set("existingManualPath", draft.existingManualPath);
      if (draft.musicFile) formData.set("musicFile", draft.musicFile);
      if (draft.worksheetFile) formData.set("worksheetFile", draft.worksheetFile);
      if (draft.manualFile) formData.set("manualFile", draft.manualFile);

      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: "PATCH",
        body: formData
      });

      if (!response.ok) {
        return;
      }

      setEditingId(null);

      if (options?.addMore) {
        router.push(buildContentHref(basePath, { tab: "add", year: draft.yearCycle, term: draft.term }));
      }

      router.refresh();
    });
  }

  return (
    <div className="stack-sm">
      {grouped
        .filter((yearGroup) => yearGroup.yearCycle === activeYear)
        .map((yearGroup) => (
        <section key={yearGroup.yearCycle}>
          <div className="admin-term-tabs" role="tablist" aria-label="Library term tabs">
            {yearGroup.terms.map((termGroup) => (
              <button
                key={`${yearGroup.yearCycle}-${termGroup.term}-tab`}
                type="button"
                role="tab"
                aria-selected={selectedTerm === termGroup.term}
                className={`admin-term-tab ${selectedTerm === termGroup.term ? "admin-term-tab-active" : ""}`}
                onClick={() => setSelectedTerm(termGroup.term as "Term 1" | "Term 2" | "Term 3" | "Term 4")}
              >
                {termGroup.term}
              </button>
            ))}
          </div>
          <div className="stack-sm">
            {yearGroup.terms.map((termGroup) =>
              termGroup.term === selectedTerm ? (
                <section
                  key={`${yearGroup.yearCycle}-${termGroup.term}`}
                  className="admin-term-group panel panel-compact"
                >
                  <AdminTermNoteEditor
                    yearCycle={yearGroup.yearCycle as "Year A" | "Year B" | "Year C"}
                    term={termGroup.term as "Term 1" | "Term 2" | "Term 3" | "Term 4"}
                    initialContent={termNoteMap.get(`${yearGroup.yearCycle}::${termGroup.term}`) ?? ""}
                  />
                  <div className="admin-term-tools">
                    <p className="admin-drag-help">
                      {termGroup.entries.length
                        ? "Drag lessons up or down to reorganise them inside this term."
                        : "No lessons in this term yet. Use Add to create one here."}
                    </p>
                    <Link
                      href={buildContentHref(basePath, {
                        tab: "add",
                        year: yearGroup.yearCycle,
                        term: termGroup.term
                      })}
                      className="button button-primary admin-term-add"
                      aria-label={`Add lesson to ${yearGroup.yearCycle} ${termGroup.term}`}
                      title={`Add lesson to ${yearGroup.yearCycle} ${termGroup.term}`}
                    >
                      + Add
                    </Link>
                  </div>
                  {termGroup.entries.length ? (
                  <>
                  {termGroup.entries.map((resource) => {
                    const isEditing = editingId === resource.id;
                    const isDragTarget = dropTargetId === resource.id;
                    const isInactive = isInactiveResource(resource);
                    const isExpired = isExpiredResource(resource);

                    return (
                      <div
                        className={`panel panel-compact ${isDragTarget ? "admin-drag-target" : ""} ${isInactive ? "admin-resource-inactive" : ""}`}
                        key={resource.id}
                        draggable={!isEditing}
                        onDragStart={() => {
                          setDraggedId(resource.id);
                          setDropTargetId(resource.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedId && draggedId !== resource.id) {
                            setDropTargetId(resource.id);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();

                          if (!draggedId || draggedId === resource.id) {
                            setDraggedId(null);
                            setDropTargetId(null);
                            return;
                          }

                          const currentIds = termGroup.entries.map((entry) => entry.id);
                          const draggedIndex = currentIds.indexOf(draggedId);
                          const targetIndex = currentIds.indexOf(resource.id);

                          if (draggedIndex === -1 || targetIndex === -1) {
                            setDraggedId(null);
                            setDropTargetId(null);
                            return;
                          }

                          const reordered = [...currentIds];
                          const [moved] = reordered.splice(draggedIndex, 1);
                          reordered.splice(targetIndex, 0, moved);

                          setDraggedId(null);
                          setDropTargetId(null);
                          reorder(
                            yearGroup.yearCycle as "Year A" | "Year B" | "Year C",
                            termGroup.term as "Term 1" | "Term 2" | "Term 3" | "Term 4",
                            reordered
                          );
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDropTargetId(null);
                        }}
                      >
                        {isEditing ? (
                          <div className="invite-form">
                            <div className="admin-title-row">
                              <label className="admin-field-label" htmlFor={`resource-title-${resource.id}`}>
                                Title *
                              </label>
                              <input
                                id={`resource-title-${resource.id}`}
                                type="text"
                                value={draft.title}
                                onChange={(event) =>
                                  setDraft((current) => ({ ...current, title: event.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="three-up admin-form-grid">
                              <div>
                                <label className="admin-field-label" htmlFor={`resource-scripture-${resource.id}`}>
                                  Scripture *
                                </label>
                                <input
                                  id={`resource-scripture-${resource.id}`}
                                  type="text"
                                  value={draft.scripture}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      scripture: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="admin-field-label" htmlFor={`resource-year-${resource.id}`}>
                                  Year *
                                </label>
                                <select
                                  id={`resource-year-${resource.id}`}
                                  value={draft.yearCycle}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      yearCycle: event.target.value as "Year A" | "Year B" | "Year C"
                                    }))
                                  }
                                >
                                  <option value="Year A">Year A</option>
                                  <option value="Year B">Year B</option>
                                  <option value="Year C">Year C</option>
                                </select>
                              </div>
                              <div>
                                <label className="admin-field-label" htmlFor={`resource-term-${resource.id}`}>
                                  Term *
                                </label>
                                <select
                                  id={`resource-term-${resource.id}`}
                                  value={draft.term}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      term: event.target.value as "Term 1" | "Term 2" | "Term 3" | "Term 4"
                                    }))
                                  }
                                >
                                  <option value="Term 1">Term 1</option>
                                  <option value="Term 2">Term 2</option>
                                  <option value="Term 3">Term 3</option>
                                  <option value="Term 4">Term 4</option>
                                </select>
                              </div>
                            </div>
                            <div className="three-up admin-form-grid">
                              <div>
                                <label className="admin-field-label" htmlFor={`resource-publish-${resource.id}`}>
                                  Publish date *
                                </label>
                                <input
                                  id={`resource-publish-${resource.id}`}
                                  type="date"
                                  value={draft.publishDate}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      publishDate: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="admin-field-label" htmlFor={`resource-expiry-${resource.id}`}>
                                  Expiry date
                                </label>
                                <input
                                  id={`resource-expiry-${resource.id}`}
                                  type="date"
                                  value={draft.expiryDate}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      expiryDate: event.target.value
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="three-up admin-form-grid">
                              <div>
                                <label className="admin-field-label" htmlFor={`resource-status-${resource.id}`}>
                                  Status *
                                </label>
                                <select
                                  id={`resource-status-${resource.id}`}
                                  value={draft.status}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      status: event.target.value as "open" | "closed"
                                    }))
                                  }
                                >
                                  <option value="open">Open</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </div>
                            </div>
                            <div className="three-up admin-form-grid">
                              <AdminAssetPicker
                                kind="manual"
                                files={files}
                                selectedPath={draft.existingManualPath}
                                onSelectPath={(value) =>
                                  setDraft((current) => ({ ...current, existingManualPath: value }))
                                }
                                uploadFile={draft.manualFile}
                                onUploadFile={(file) =>
                                  setDraft((current) => ({
                                    ...current,
                                    manualFile: file,
                                    existingManualPath: file ? "" : current.existingManualPath
                                  }))
                                }
                              />
                              <AdminAssetPicker
                                kind="worksheet"
                                files={files}
                                selectedPath={draft.existingWorksheetPath}
                                onSelectPath={(value) =>
                                  setDraft((current) => ({ ...current, existingWorksheetPath: value }))
                                }
                                uploadFile={draft.worksheetFile}
                                onUploadFile={(file) =>
                                  setDraft((current) => ({
                                    ...current,
                                    worksheetFile: file,
                                    existingWorksheetPath: file ? "" : current.existingWorksheetPath
                                  }))
                                }
                              />
                              <AdminAssetPicker
                                kind="music"
                                files={files}
                                selectedPath={draft.existingMusicPath}
                                onSelectPath={(value) =>
                                  setDraft((current) => ({ ...current, existingMusicPath: value }))
                                }
                                uploadFile={draft.musicFile}
                                onUploadFile={(file) =>
                                  setDraft((current) => ({
                                    ...current,
                                    musicFile: file,
                                    existingMusicPath: file ? "" : current.existingMusicPath
                                  }))
                                }
                              />
                            </div>
                            <WysiwygEditor
                              label="Content *"
                              value={draft.description}
                              onChange={(value) =>
                                setDraft((current) => ({ ...current, description: value }))
                              }
                              placeholder="Write the lesson content here."
                            />
                            <div className="button-row button-row-tight">
                              <button
                                type="button"
                                className="button button-primary"
                                disabled={isPending}
                                onClick={() => submitDraft(resource.id)}
                              >
                                <Save size={16} />
                                <span>{isPending ? "Updating..." : "Update"}</span>
                              </button>
                              <button
                                type="button"
                                className="button"
                                disabled={isPending}
                                onClick={() => submitDraft(resource.id, { addMore: true })}
                              >
                                <Save size={16} />
                                <span>{isPending ? "Updating..." : "Save and add more"}</span>
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => {
                                  setEditingId(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-inline-row">
                            <div>
                              <strong
                                className={`admin-resource-title ${resource.status === "closed" ? "admin-resource-title-closed" : ""}`}
                              >
                                <GripVertical size={16} />
                                <span>
                                  {isInactive ? null : `Lesson #${resource.lessonNumber ?? 1} - `}
                                  {resource.title}
                                  {resource.scripture ? (
                                    <span className="admin-resource-scripture-inline">
                                      {" "}
                                      ({resource.scripture})
                                    </span>
                                  ) : null}
                                  {isExpired ? <span className="admin-expired-badge">Expired</span> : null}
                                </span>
                              </strong>
                              <div className="resource-meta">
                                {resource.manualFilePath || resource.manualFileName ? <span className="pill"><NotebookPen size={14} /> Manual</span> : null}
                                {resource.worksheetFilePath || resource.worksheetFileName ? <span className="pill"><FileText size={14} /> Worksheet</span> : null}
                                {resource.musicFilePath || resource.musicFileName ? <span className="pill"><Music4 size={14} /> Music</span> : null}
                              </div>
                            </div>
                            <div className="button-row button-row-tight">
                              <button
                                type="button"
                                className="button button-secondary icon-only-button"
                                aria-label={`Edit ${resource.title}`}
                                title={`Edit ${resource.title}`}
                                onClick={() => {
                                  setEditingId(resource.id);
                                  setDraft({
                                    title: resource.title,
                                    description: resource.description,
                                    scripture: resource.scripture ?? "",
                                    yearCycle: resource.yearCycle ?? "Year A",
                                    term: resource.term ?? "Term 1",
                                    publishDate: resource.publishDate ?? "",
                                    expiryDate: resource.expiryDate ?? "",
                                    status: resource.status ?? "open",
                                    existingMusicPath: resource.musicFilePath ?? "",
                                    existingWorksheetPath: resource.worksheetFilePath ?? "",
                                    existingManualPath: resource.manualFilePath ?? "",
                                    musicFile: null,
                                    worksheetFile: null,
                                    manualFile: null
                                  });
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="button button-secondary icon-only-button"
                                disabled={isPending}
                                aria-label={`Delete ${resource.title}`}
                                title={`Delete ${resource.title}`}
                                onClick={() => {
                                  const confirmed = window.confirm(`Delete "${resource.title}" from the curriculum library?`);

                                  if (!confirmed) {
                                    return;
                                  }

                                  startTransition(async () => {
                                    const response = await fetch(`/api/admin/resources/${resource.id}`, {
                                      method: "DELETE"
                                    });

                                    if (response.ok) {
                                      router.refresh();
                                    }
                                  });
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </>
                  ) : null}
                </section>
              ) : null
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
