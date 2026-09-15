"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { GripVertical, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { FamilyResourceCard, FamilyResourceLesson, FamilyResourceTerm } from "@/types";

type Props = {
  cards: FamilyResourceCard[];
  lessons: FamilyResourceLesson[];
  terms: FamilyResourceTerm[];
};

function statusMessageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function submitForm(url: string, form: HTMLFormElement, method = "POST") {
  const response = await fetch(url, { method, body: new FormData(form) });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to save family resource content.");
  }
}

async function deleteEntry(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to delete family resource content.");
  }
}

const familySections = [
  { term: 1, label: "Unit 1" },
  { term: 2, label: "Unit 2" },
  { term: 3, label: "Unit 3" },
  { term: 4, label: "Unit 4" },
  { term: 5, label: "Holiday" },
  { term: 6, label: "Advent" }
];

export function AdminFamilyResources({ cards, lessons, terms }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dropTargetLessonId, setDropTargetLessonId] = useState<string | null>(null);
  const termMap = new Map(terms.map((term) => [term.term, term]));
  const lessonsByUnit = familySections.map((section) => ({
    ...section,
    lessons: lessons
      .filter((lesson) => lesson.term === section.term)
      .sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }

        return a.lessonNumber - b.lessonNumber;
      })
  }));

  const refreshWithMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.location.reload();
  };

  function reorderLessons(unitNumber: number, orderedIds: string[]) {
    startTransition(async () => {
      const response = await fetch("/api/admin/family-resources/lessons/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ term: unitNumber, orderedIds })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMessage(data.message ?? "Family lessons reordered.");
        router.refresh();
      } else {
        setMessage(data.message ?? "Unable to reorder family lessons.");
      }
    });
  }

  return (
    <div className="admin-family-editor">
      {message ? <p className="admin-form-status">{message}</p> : null}
      <section className="admin-family-section">
        <h2>Top cards</h2>
        <form
          className="admin-family-card-form admin-family-add-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            startTransition(async () => {
              try {
                await submitForm("/api/admin/family-resources/cards", form);
                refreshWithMessage("Card added.");
              } catch (error) {
                setMessage(statusMessageFromError(error));
              }
            });
          }}
        >
          <input name="title" placeholder="Title" required />
          <input name="description" placeholder="Description" />
          <input name="icon" placeholder="💬" />
          <input name="badge" placeholder="Weekly PDF" />
          <input name="meta" placeholder="per lesson" />
          <input name="displayOrder" type="number" min="0" defaultValue={cards.length + 1} aria-label="Display order" />
          <button className="button button-primary" type="submit" disabled={isPending}>
            <Plus size={16} />
            <span>Add card</span>
          </button>
        </form>
        {cards.map((card) => (
          <form
            className="admin-family-card-form"
            key={card.id}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              startTransition(async () => {
                try {
                  await submitForm(`/api/admin/family-resources/cards/${card.id}`, form, "PUT");
                  refreshWithMessage("Card saved.");
                } catch (error) {
                  setMessage(statusMessageFromError(error));
                }
              });
            }}
          >
            <input name="title" defaultValue={card.title} aria-label="Title" required />
            <input name="description" defaultValue={card.description} aria-label="Description" />
            <input name="icon" defaultValue={card.icon} aria-label="Icon" />
            <input name="badge" defaultValue={card.badge} aria-label="Badge" />
            <input name="meta" defaultValue={card.meta} aria-label="Meta" />
            <input name="displayOrder" type="number" min="0" defaultValue={card.displayOrder} aria-label="Display order" />
            <select name="status" defaultValue={card.status} aria-label="Status">
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <button className="icon-button" type="submit" aria-label={`Save ${card.title}`} disabled={isPending}>
              <Save size={16} />
            </button>
            <button
              className="icon-button danger-button"
              type="button"
              aria-label={`Delete ${card.title}`}
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await deleteEntry(`/api/admin/family-resources/cards/${card.id}`);
                    refreshWithMessage("Card deleted.");
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
      </section>

      <section className="admin-family-section">
        <div className="admin-family-section-head">
          <div>
            <h2>Unit resources</h2>
            <p>Open a unit to manage memory cards, reading guides, parent devotions, Canva links, and status.</p>
          </div>
        </div>
        {familySections.map((section) => {
          const term = termMap.get(section.term);
          const editHref = `/admin/family/unit/${section.term}` as Route;

          return (
            <div className="admin-family-unit-row" key={section.term}>
              <div className="admin-family-term-title">
                <strong>{section.label}</strong>
                <span>{term?.status === "closed" ? "Closed" : "Open"}</span>
              </div>
              <div className="admin-family-unit-summary">
                <span>{term?.memoryText || term?.memoryUrl ? "Memory card 1" : "No memory card 1"}</span>
                <span>{term?.memoryText2 || term?.memoryUrl2 ? "Memory card 2" : "No memory card 2"}</span>
                <span>{term?.readingGuideUrl ? "Reading guide PDF" : "No reading guide"}</span>
                <span>{term?.parentDevotionUrl ? "Parent devotions PDF" : "No parent devotions"}</span>
              </div>
              <Link href={editHref} className="button button-secondary">
                <Pencil size={16} />
                <span>{term ? "Open" : "Add"}</span>
              </Link>
            </div>
          );
        })}
      </section>

      <section className="admin-family-section">
        <div className="admin-family-section-head">
          <div>
            <h2>Weekly resources</h2>
            <p className="admin-drag-help">Drag lessons within each unit to sort them. Open a lesson to edit files and details.</p>
          </div>
          <Link href={"/admin/family/new" as Route} className="button button-primary">
            <Plus size={16} />
            <span>Add weekly resource</span>
          </Link>
        </div>
        <div className="admin-family-weekly-list">
          {lessonsByUnit.map((unitGroup) => (
            <section className="admin-family-weekly-unit" key={unitGroup.term}>
              <h3>{unitGroup.label}</h3>
              {unitGroup.lessons.length ? (
                <div className="admin-family-weekly-rows">
                  {unitGroup.lessons.map((lesson) => {
                    const isDropTarget = dropTargetLessonId === lesson.id;
                    const editHref = `/admin/family/${lesson.id}` as Route;

                    return (
                      <div
                        className={`admin-family-weekly-row ${isDropTarget ? "admin-drag-target" : ""}`}
                        key={lesson.id}
                        draggable
                        onDragStart={() => {
                          setDraggedLessonId(lesson.id);
                          setDropTargetLessonId(lesson.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedLessonId && draggedLessonId !== lesson.id) {
                            setDropTargetLessonId(lesson.id);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();

                          if (!draggedLessonId || draggedLessonId === lesson.id) {
                            setDraggedLessonId(null);
                            setDropTargetLessonId(null);
                            return;
                          }

                          const currentIds = unitGroup.lessons.map((entry) => entry.id);
                          const draggedIndex = currentIds.indexOf(draggedLessonId);
                          const targetIndex = currentIds.indexOf(lesson.id);

                          if (draggedIndex === -1 || targetIndex === -1) {
                            setDraggedLessonId(null);
                            setDropTargetLessonId(null);
                            return;
                          }

                          const reordered = [...currentIds];
                          const [moved] = reordered.splice(draggedIndex, 1);
                          reordered.splice(targetIndex, 0, moved);
                          setDraggedLessonId(null);
                          setDropTargetLessonId(null);
                          reorderLessons(unitGroup.term, reordered);
                        }}
                        onDragEnd={() => {
                          setDraggedLessonId(null);
                          setDropTargetLessonId(null);
                        }}
                      >
                        <span className="admin-family-weekly-drag" aria-hidden="true">
                          <GripVertical size={16} />
                        </span>
                        <span className="admin-family-weekly-meta">{unitGroup.label}</span>
                        <span className="admin-family-weekly-meta">Lesson {lesson.lessonNumber}</span>
                        <Link href={editHref} className="admin-family-weekly-title">
                          {lesson.title}
                          {lesson.scripture ? <small>({lesson.scripture})</small> : null}
                        </Link>
                        <Link
                          href={editHref}
                          className="button button-secondary icon-only-button"
                          aria-label={`Edit ${lesson.title}`}
                          title={`Edit ${lesson.title}`}
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="admin-empty-note">No weekly resources in this unit yet.</p>
              )}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
