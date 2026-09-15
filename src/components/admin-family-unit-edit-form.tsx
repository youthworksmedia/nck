"use client";

import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useState, useTransition } from "react";

import type { FamilyResourceTerm } from "@/types";

type Props = {
  termNumber: number;
  term?: FamilyResourceTerm;
};

function statusMessageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getSectionLabel(term: number) {
  if (term === 5) return "Holiday";
  if (term === 6) return "Advent";
  return `Unit ${term}`;
}

export function AdminFamilyUnitEditForm({ termNumber, term }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const sectionLabel = getSectionLabel(termNumber);

  async function saveUnit(form: HTMLFormElement) {
    const response = await fetch("/api/admin/family-resources/terms", {
      method: "POST",
      body: new FormData(form)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to save unit resources.");
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
            await saveUnit(form);
            router.push("/admin?section=family");
            router.refresh();
          } catch (error) {
            setMessage(statusMessageFromError(error));
          }
        });
      }}
    >
      {message ? <p className="admin-form-status">{message}</p> : null}
      <input name="term" type="hidden" value={termNumber} />
      <div className="admin-family-term-title admin-family-unit-edit-title">
        <strong>{sectionLabel}</strong>
        <span>Memory cards, family reading guide, parent devotions, Canva links, and availability.</span>
      </div>
      <div className="admin-family-term-groups">
        <div className="admin-family-term-group">
          <h3>Memory Cards</h3>
          <label className="admin-family-memory-fields">
            <span>Memory verse 1</span>
            <input
              name="memoryText"
              defaultValue={term?.memoryText ?? ""}
              placeholder='"Be strong and courageous." - Joshua 1:9'
              aria-label={`${sectionLabel} first memory verse text`}
            />
            <input name="memoryFile" type="file" aria-label={`${sectionLabel} first memory card file`} />
            <input name="memoryUrl" type="hidden" defaultValue={term?.memoryUrl ?? ""} />
            <small>{term?.memoryUrl ? `Current: ${term.memoryUrl.split("/").pop()}` : "No file uploaded"}</small>
          </label>
          <label className="admin-family-memory-fields">
            <span>Memory verse 2</span>
            <input
              name="memoryText2"
              defaultValue={term?.memoryText2 ?? ""}
              placeholder='"Your word is a lamp to my feet." - Psalm 119:105'
              aria-label={`${sectionLabel} second memory verse text`}
            />
            <input name="memoryFile2" type="file" aria-label={`${sectionLabel} second memory card file`} />
            <input name="memoryUrl2" type="hidden" defaultValue={term?.memoryUrl2 ?? ""} />
            <small>{term?.memoryUrl2 ? `Current: ${term.memoryUrl2.split("/").pop()}` : "No file uploaded"}</small>
          </label>
        </div>

        <div className="admin-family-term-group">
          <h3>Family Reading Guide</h3>
          <label className="admin-family-memory-fields">
            <span>PDF download</span>
            <input
              name="readingGuideFile"
              type="file"
              accept="application/pdf,.pdf"
              aria-label={`${sectionLabel} family reading guide PDF`}
            />
            <input name="readingGuideUrl" type="hidden" defaultValue={term?.readingGuideUrl ?? ""} />
            <small>
              {term?.readingGuideUrl ? `Current: ${term.readingGuideUrl.split("/").pop()}` : "No file uploaded"}
            </small>
          </label>
          <label className="admin-family-memory-fields">
            <span>Canva template URL</span>
            <input
              name="readingGuideCanvaUrl"
              type="url"
              defaultValue={term?.readingGuideCanvaUrl ?? ""}
              placeholder="https://www.canva.com/..."
              aria-label={`${sectionLabel} family reading guide Canva template`}
            />
          </label>
        </div>

        <div className="admin-family-term-group">
          <h3>Parent Devotions</h3>
          <label className="admin-family-memory-fields">
            <span>PDF download</span>
            <input
              name="parentDevotionFile"
              type="file"
              accept="application/pdf,.pdf"
              aria-label={`${sectionLabel} parent devotions PDF`}
            />
            <input name="parentDevotionUrl" type="hidden" defaultValue={term?.parentDevotionUrl ?? ""} />
            <small>
              {term?.parentDevotionUrl ? `Current: ${term.parentDevotionUrl.split("/").pop()}` : "No file uploaded"}
            </small>
          </label>
          <label className="admin-family-memory-fields">
            <span>Canva template URL</span>
            <input
              name="parentDevotionCanvaUrl"
              type="url"
              defaultValue={term?.parentDevotionCanvaUrl ?? ""}
              placeholder="https://www.canva.com/..."
              aria-label={`${sectionLabel} parent devotions Canva template`}
            />
          </label>
        </div>
      </div>

      <div className="admin-family-lesson-edit-actions">
        <label className="admin-family-status-field">
          <span>Status</span>
          <select name="status" defaultValue={term?.status ?? "open"} aria-label={`${sectionLabel} resource status`}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <button className="button button-primary" type="submit" disabled={isPending}>
          <Save size={16} />
          <span>Save unit resources</span>
        </button>
      </div>
    </form>
  );
}
