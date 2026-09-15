"use client";

import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { FamilyResourceLesson } from "@/types";

type Props = {
  lesson?: FamilyResourceLesson;
};

function statusMessageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

const familySections = [
  { term: 1, label: "Unit 1" },
  { term: 2, label: "Unit 2" },
  { term: 3, label: "Unit 3" },
  { term: 4, label: "Unit 4" },
  { term: 5, label: "Holiday" },
  { term: 6, label: "Advent" }
];

export function AdminFamilyLessonEditForm({ lesson }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isNew = !lesson;
  const defaultLesson: FamilyResourceLesson = lesson ?? {
    id: "new",
    term: 1,
    lessonNumber: 1,
    title: "",
    scripture: "",
    discussionUrl: null,
    activityUrl: null,
    memoryUrl: null,
    memoryText: null,
    displayOrder: 0,
    status: "open"
  };

  async function saveLesson(form: HTMLFormElement) {
    const response = await fetch(
      isNew ? "/api/admin/family-resources/lessons" : `/api/admin/family-resources/lessons/${defaultLesson.id}`,
      {
        method: isNew ? "POST" : "PUT",
        body: new FormData(form)
      }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to save weekly resource.");
    }
  }

  async function deleteLesson() {
    const response = await fetch(`/api/admin/family-resources/lessons/${defaultLesson.id}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to delete weekly resource.");
    }
  }

  return (
    <form
      className="admin-family-lesson-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        startTransition(async () => {
          try {
            await saveLesson(form);
            router.push("/admin?section=family");
            router.refresh();
          } catch (error) {
            setMessage(statusMessageFromError(error));
          }
        });
      }}
    >
      {message ? <p className="admin-form-status">{message}</p> : null}
      <div className="admin-family-lesson-edit-grid">
        <label>
          <span>Volume 1 section</span>
          <select name="term" defaultValue={defaultLesson.term}>
            {familySections.map((section) => (
              <option key={section.term} value={section.term}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lesson</span>
          <input name="lessonNumber" type="number" min="1" defaultValue={defaultLesson.lessonNumber} required />
        </label>
        <label>
          <span>Title</span>
          <input name="title" defaultValue={defaultLesson.title} required />
        </label>
        <label>
          <span>Scripture</span>
          <input name="scripture" defaultValue={defaultLesson.scripture} />
        </label>
        <label>
          <span>Discussion PDF</span>
          <input name="discussionFile" type="file" />
          <small>{defaultLesson.discussionUrl ? `Current: ${defaultLesson.discussionUrl.split("/").pop()}` : "No file uploaded"}</small>
        </label>
        <label>
          <span>Activity PDF</span>
          <input name="activityFile" type="file" />
          <small>{defaultLesson.activityUrl ? `Current: ${defaultLesson.activityUrl.split("/").pop()}` : "No file uploaded"}</small>
        </label>
        <label>
          <span>Memory PDF</span>
          <input name="memoryFile" type="file" />
          <small>{defaultLesson.memoryUrl ? `Current: ${defaultLesson.memoryUrl.split("/").pop()}` : "No file uploaded"}</small>
        </label>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={defaultLesson.status}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      <input name="discussionUrl" type="hidden" defaultValue={defaultLesson.discussionUrl ?? ""} />
      <input name="activityUrl" type="hidden" defaultValue={defaultLesson.activityUrl ?? ""} />
      <input name="memoryUrl" type="hidden" defaultValue={defaultLesson.memoryUrl ?? ""} />
      <input name="memoryText" type="hidden" defaultValue={defaultLesson.memoryText ?? ""} />
      <input name="displayOrder" type="hidden" defaultValue={defaultLesson.displayOrder} />
      <div className="admin-family-lesson-edit-actions">
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Save size={16} />
          <span>{isNew ? "Add weekly resource" : "Save lesson"}</span>
        </button>
        {isNew ? null : (
          <button
            className="button button-secondary danger-button"
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!window.confirm(`Delete "${defaultLesson.title}" from Family resources?`)) {
                return;
              }

              startTransition(async () => {
                try {
                  await deleteLesson();
                  router.push("/admin?section=family");
                  router.refresh();
                } catch (error) {
                  setMessage(statusMessageFromError(error));
                }
              });
            }}
          >
            <Trash2 size={16} />
            <span>Delete lesson</span>
          </button>
        )}
      </div>
    </form>
  );
}
