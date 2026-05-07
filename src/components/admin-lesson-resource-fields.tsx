"use client";

import { FileText, Gamepad2, Music4, Plus, Trash2, Video } from "lucide-react";

import type { LessonResourceAttachment, LessonResourceType } from "@/types";

export type LessonResourceDraft = {
  id: string;
  type: LessonResourceType;
  name: string;
  filePath: string;
  fileName: string;
  file: File | null;
};

type Props = {
  value: LessonResourceDraft[];
  onChange: (value: LessonResourceDraft[]) => void;
};

const typeOptions: Array<{ value: LessonResourceType; label: string }> = [
  { value: "pdf", label: "PDF" },
  { value: "game", label: "Game" },
  { value: "music", label: "Music" },
  { value: "video", label: "Video" }
];

function createDraft(): LessonResourceDraft {
  return {
    id: crypto.randomUUID(),
    type: "pdf",
    name: "",
    filePath: "",
    fileName: "",
    file: null
  };
}

export function attachmentsToDrafts(attachments: LessonResourceAttachment[] = []): LessonResourceDraft[] {
  return attachments.map((attachment) => ({
    ...attachment,
    file: null
  }));
}

export function emptyResourceDrafts() {
  return [createDraft()];
}

export function AdminLessonResourceFields({ value, onChange }: Props) {
  function updateDraft(id: string, patch: Partial<LessonResourceDraft>) {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removeDraft(id: string) {
    const next = value.filter((entry) => entry.id !== id);
    onChange(next.length ? next : emptyResourceDrafts());
  }

  return (
    <section className="admin-resource-files-editor">
      <div className="admin-resource-files-head">
        <div>
          <h3>Lesson resources</h3>
          <p>Add each downloadable file with the name and icon members should see.</p>
        </div>
        <button type="button" className="button button-secondary" onClick={() => onChange([...value, createDraft()])}>
          <Plus size={16} />
          <span>Add resource</span>
        </button>
      </div>
      <div className="admin-resource-file-list">
        {value.map((entry, index) => (
          <div key={entry.id} className="admin-resource-file-row">
            <div className="admin-resource-file-icon" aria-hidden="true">
              {entry.type === "game" ? <Gamepad2 size={18} /> : null}
              {entry.type === "music" ? <Music4 size={18} /> : null}
              {entry.type === "video" ? <Video size={18} /> : null}
              {entry.type === "pdf" ? <FileText size={18} /> : null}
            </div>
            <div>
              <label className="admin-field-label" htmlFor={`resource-file-name-${entry.id}`}>
                Name
              </label>
              <input
                id={`resource-file-name-${entry.id}`}
                type="text"
                placeholder={`Resource ${index + 1}`}
                value={entry.name}
                onChange={(event) => updateDraft(entry.id, { name: event.target.value })}
              />
            </div>
            <div>
              <label className="admin-field-label" htmlFor={`resource-file-type-${entry.id}`}>
                Icon
              </label>
              <select
                id={`resource-file-type-${entry.id}`}
                value={entry.type}
                onChange={(event) => updateDraft(entry.id, { type: event.target.value as LessonResourceType })}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="admin-field-label" htmlFor={`resource-file-upload-${entry.id}`}>
                File
              </label>
              <input
                id={`resource-file-upload-${entry.id}`}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  updateDraft(entry.id, {
                    file,
                    fileName: file?.name ?? entry.fileName,
                    filePath: file ? "" : entry.filePath
                  });
                }}
              />
              {entry.fileName && !entry.file ? (
                <p className="admin-resource-current-file">Current: {entry.fileName}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="button button-secondary icon-only-button admin-resource-file-remove"
              aria-label="Remove resource file"
              title="Remove resource file"
              onClick={() => removeDraft(entry.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
