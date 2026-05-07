"use client";

import { FileText, FolderOpen, Gamepad2, Music4, Plus, Trash2, Video, X } from "lucide-react";
import { useMemo, useState } from "react";

import { formatDateTime } from "@/lib/time";
import type { ResourceLibraryFile } from "@/lib/resource-assets";
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
  files?: ResourceLibraryFile[];
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

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function getFileType(name: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  return extension || "FILE";
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

export function AdminLessonResourceFields({ value, onChange, files = [] }: Props) {
  const [browseDraftId, setBrowseDraftId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const generalFiles = useMemo(
    () =>
      files
        .filter((file) => file.kind === "general")
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt)),
    [files]
  );
  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return generalFiles;
    }

    return generalFiles.filter((file) => {
      const type = getFileType(file.name).toLowerCase();
      return file.name.toLowerCase().includes(query) || type.includes(query);
    });
  }, [generalFiles, search]);
  const pageCount = Math.max(1, Math.ceil(filteredFiles.length / pageSize));
  const visibleFiles = filteredFiles.slice((page - 1) * pageSize, page * pageSize);
  const browsingDraft = value.find((entry) => entry.id === browseDraftId) ?? null;

  function updateDraft(id: string, patch: Partial<LessonResourceDraft>) {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removeDraft(id: string) {
    const next = value.filter((entry) => entry.id !== id);
        onChange(next.length ? next : emptyResourceDrafts());
  }

  function openBrowse(id: string) {
    setBrowseDraftId(id);
    setSearch("");
    setPage(1);
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
              <div className="asset-picker-actions">
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
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => openBrowse(entry.id)}
                >
                  <FolderOpen size={16} />
                  <span>Browse</span>
                </button>
              </div>
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

      {browsingDraft ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setBrowseDraftId(null)}>
          <div className="modal-card asset-library-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>Browse media</h3>
                <p>Choose an existing file from General.</p>
              </div>
              <button
                type="button"
                className="asset-library-close"
                aria-label="Close media browser"
                onClick={() => setBrowseDraftId(null)}
              >
                <X size={14} />
              </button>
            </div>
            <label className="admin-field-label" htmlFor={`asset-library-search-${browsingDraft.id}`}>
              Search resources
            </label>
            <input
              id={`asset-library-search-${browsingDraft.id}`}
              type="search"
              placeholder="Search by file name or type"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <div className="asset-library-list">
              {visibleFiles.length ? (
                visibleFiles.map((file) => (
                  <div key={file.id} className="asset-library-row">
                    <div>
                      <strong>{file.name}</strong>
                      <p>
                        {formatFileSize(file.sizeBytes)} · {getFileType(file.name)} · Uploaded{" "}
                        {formatDateTime(file.uploadedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => {
                        updateDraft(browsingDraft.id, {
                          file: null,
                          filePath: file.path,
                          fileName: file.name,
                          name: browsingDraft.name || file.name
                        });
                        setBrowseDraftId(null);
                      }}
                    >
                      Choose
                    </button>
                  </div>
                ))
              ) : (
                <p className="form-status">No files match your search.</p>
              )}
            </div>
            <div className="asset-library-pagination">
              <button
                type="button"
                className="button button-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="button button-secondary"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
