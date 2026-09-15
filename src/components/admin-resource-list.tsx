"use client";

import type { Route } from "next";
import Link from "next/link";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  curriculumSections,
  curriculumYears,
  normalizeCurriculumSection,
  normalizeCurriculumYear,
  type CurriculumSection,
  type CurriculumYear
} from "@/lib/curriculum";
import type { ResourceLibraryFile } from "@/lib/resource-assets";
import { getTodayISO } from "@/lib/time";
import type { Resource } from "@/types";

type Props = {
  resources: Resource[];
  files: ResourceLibraryFile[];
  activeYear: CurriculumYear;
  activeTerm?: CurriculumSection;
  basePath?: "/content" | "/admin";
  showTermTabs?: boolean;
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

function buildResourceEditHref(basePath: "/content" | "/admin", resourceId: string) {
  return (basePath === "/admin" ? `/admin/resources/${resourceId}` : `${basePath}?edit=${resourceId}`) as Route;
}

export function AdminResourceList({
  resources,
  activeYear,
  activeTerm = "Unit 1",
  basePath = "/content",
  showTermTabs = true
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<CurriculumSection>(activeTerm);

  useEffect(() => {
    setSelectedTerm(activeTerm);
  }, [activeTerm]);

  const grouped = useMemo(
    () =>
      curriculumYears.map((yearCycle) => ({
        yearCycle,
        terms: curriculumSections.map((term) => ({
          term,
          entries: resources
            .filter(
              (resource) =>
                normalizeCurriculumYear(resource.yearCycle) === yearCycle &&
                normalizeCurriculumSection(resource.term) === term
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

  async function reorder(yearCycle: CurriculumYear, term: CurriculumSection, orderedIds: string[]) {
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

  return (
    <div className="stack-sm">
      {grouped
        .filter((yearGroup) => yearGroup.yearCycle === activeYear)
        .map((yearGroup) => (
          <section key={yearGroup.yearCycle}>
            {showTermTabs ? (
              <div className="admin-term-tabs" role="tablist" aria-label="Library term tabs">
                {yearGroup.terms.map((termGroup) => (
                  <button
                    key={`${yearGroup.yearCycle}-${termGroup.term}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={selectedTerm === termGroup.term}
                    className={`admin-term-tab ${selectedTerm === termGroup.term ? "admin-term-tab-active" : ""}`}
                    onClick={() => setSelectedTerm(termGroup.term)}
                  >
                    {termGroup.term}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="stack-sm">
              {yearGroup.terms.map((termGroup) =>
                termGroup.term === selectedTerm ? (
                  <section
                    key={`${yearGroup.yearCycle}-${termGroup.term}`}
                    className="admin-term-group panel panel-compact"
                  >
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
                    {termGroup.entries.length
                      ? termGroup.entries.map((resource) => {
                          const isDragTarget = dropTargetId === resource.id;
                          const isInactive = isInactiveResource(resource);
                          const isExpired = isExpiredResource(resource);
                          const editHref = buildResourceEditHref(basePath, resource.id);

                          return (
                            <div
                              className={`panel panel-compact ${isDragTarget ? "admin-drag-target" : ""} ${
                                isInactive ? "admin-resource-inactive" : ""
                              }`}
                              key={resource.id}
                              draggable
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
                                reorder(yearGroup.yearCycle, termGroup.term, reordered);
                              }}
                              onDragEnd={() => {
                                setDraggedId(null);
                                setDropTargetId(null);
                              }}
                            >
                              <div className="admin-inline-row">
                                <div>
                                  <Link
                                    href={editHref}
                                    className={`admin-resource-title ${
                                      resource.status === "closed" ? "admin-resource-title-closed" : ""
                                    }`}
                                  >
                                    <GripVertical size={16} />
                                    <span>
                                      {isInactive ? null : `Lesson ${resource.lessonNumber ?? 1} - `}
                                      {resource.title}
                                      {resource.scripture ? (
                                        <span className="admin-resource-scripture-inline"> ({resource.scripture})</span>
                                      ) : null}
                                      {isExpired ? <span className="admin-expired-badge">Expired</span> : null}
                                    </span>
                                  </Link>
                                </div>
                                <div className="button-row button-row-tight">
                                  <Link
                                    href={editHref}
                                    className="button button-secondary icon-only-button"
                                    aria-label={`Edit ${resource.title}`}
                                    title={`Edit ${resource.title}`}
                                  >
                                    <Pencil size={16} />
                                  </Link>
                                  <button
                                    type="button"
                                    className="button button-secondary icon-only-button"
                                    disabled={isPending}
                                    aria-label={`Delete ${resource.title}`}
                                    title={`Delete ${resource.title}`}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `Delete "${resource.title}" from the curriculum library?`
                                      );

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
                            </div>
                          );
                        })
                      : null}
                  </section>
                ) : null
              )}
            </div>
          </section>
        ))}
    </div>
  );
}
