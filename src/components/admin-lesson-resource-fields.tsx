"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FileText,
  FolderOpen,
  GripVertical,
  Plus,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useMemo, useState } from "react";

import { ModalPortal } from "@/components/modal-portal";
import { getResourceIconKey, getResourceIconPath, resourceIconOptions } from "@/lib/resource-icon-paths";
import { formatDateTime } from "@/lib/time";
import type { ResourceLibraryFile } from "@/lib/resource-assets";
import type { LessonResourceAttachment, LessonResourceProgramKey, LessonResourceType } from "@/types";

export type LessonResourceDraft = {
  id: string;
  type: LessonResourceType;
  icon: string;
  name: string;
  filePath: string;
  fileName: string;
  sizeBytes?: number;
  includeCopyright: boolean;
  file: File | null;
};

type Props = {
  value: LessonResourceDraft[];
  onChange: (value: LessonResourceDraft[]) => void;
  files?: ResourceLibraryFile[];
  title?: string;
  description?: string;
  addLabel?: string;
  program: LessonResourceProgramKey;
};

function createDraft(): LessonResourceDraft {
  return {
    id: crypto.randomUUID(),
    type: "pdf",
    icon: "lesson-guide",
    name: "",
    filePath: "",
    fileName: "",
    sizeBytes: undefined,
    includeCopyright: false,
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

function inferResourceTypeFromFileName(fileName: string): LessonResourceType {
  const extension = fileName.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";

  if (["mp3", "wav", "m4a", "aac"].includes(extension)) {
    return "music";
  }

  if (["mp4", "mov", "webm"].includes(extension)) {
    return "video";
  }

  if (["zip"].includes(extension)) {
    return "game";
  }

  return "pdf";
}

function isPdfFileName(fileName: string) {
  return fileName.split("?")[0]?.toLowerCase().endsWith(".pdf") ?? false;
}

function ResourceIconPreview({
  icon,
  program
}: {
  icon: string;
  program: LessonResourceProgramKey;
}) {
  const iconPath = getResourceIconPath("", null, program, icon);

  if (!iconPath) {
    return <FileText size={17} />;
  }

  return <img src={iconPath} alt="" />;
}

export function attachmentsToDrafts(attachments: LessonResourceAttachment[] = []): LessonResourceDraft[] {
  return attachments.map((attachment) => ({
    ...attachment,
    icon: getResourceIconKey(attachment.name, attachment.fileName, attachment.icon) ?? "lesson-guide",
    includeCopyright: attachment.includeCopyright ?? false,
    file: null
  }));
}

export function emptyResourceDrafts() {
  return [createDraft()];
}

export function AdminLessonResourceFields({
  value,
  onChange,
  files = [],
  title = "Lesson resources",
  description = "Add each downloadable file with the name and icon members should see.",
  addLabel = "Add resource",
  program
}: Props) {
  const [browseDraftId, setBrowseDraftId] = useState<string | null>(null);
  const [draggedDraftId, setDraggedDraftId] = useState<string | null>(null);
  const [dropTargetDraftId, setDropTargetDraftId] = useState<string | null>(null);
  const [openTypeMenuId, setOpenTypeMenuId] = useState<string | null>(null);
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

  function moveDraft(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= value.length) {
      return;
    }

    const next = [...value];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  }

  function reorderDraft(draggedId: string, targetId: string) {
    const draggedIndex = value.findIndex((entry) => entry.id === draggedId);
    const targetIndex = value.findIndex((entry) => entry.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }

    const next = [...value];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  }

  function openBrowse(id: string) {
    setBrowseDraftId(id);
    setSearch("");
    setPage(1);
  }

  function updateFileSelection(
    id: string,
    patch: Partial<Pick<LessonResourceDraft, "file" | "fileName" | "filePath" | "sizeBytes" | "name">>
  ) {
    const currentDraft = value.find((entry) => entry.id === id);
    const nextFileName = patch.file?.name ?? patch.fileName ?? currentDraft?.fileName ?? "";
    const nextType = inferResourceTypeFromFileName(nextFileName);

    updateDraft(id, {
      ...patch,
      type: nextType,
      includeCopyright: isPdfFileName(nextFileName)
        ? currentDraft?.includeCopyright ?? false
        : false
    });
  }

  return (
    <section className="admin-resource-files-editor">
      <div className="admin-resource-files-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button type="button" className="button button-secondary" onClick={() => onChange([...value, createDraft()])}>
          <Plus size={16} />
          <span>{addLabel}</span>
        </button>
      </div>
      <div className="admin-resource-file-list">
        {value.map((entry, index) => (
          <div
            key={entry.id}
            className={`admin-resource-file-row ${dropTargetDraftId === entry.id ? "admin-resource-file-row-target" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (draggedDraftId && draggedDraftId !== entry.id) {
                setDropTargetDraftId(entry.id);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedDraftId) {
                reorderDraft(draggedDraftId, entry.id);
              }
              setDraggedDraftId(null);
              setDropTargetDraftId(null);
            }}
          >
            <button
              type="button"
              className="button button-secondary icon-only-button admin-resource-file-drag"
              draggable
              aria-label={`Drag ${entry.name || `resource file ${index + 1}`} to sort`}
              title="Drag to sort"
              onDragStart={() => {
                setDraggedDraftId(entry.id);
                setDropTargetDraftId(entry.id);
              }}
              onDragEnd={() => {
                setDraggedDraftId(null);
                setDropTargetDraftId(null);
              }}
            >
              <GripVertical size={18} />
            </button>
            <div className="admin-resource-file-name-field">
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
            <div className="admin-resource-file-type-field">
              <label className="admin-field-label" id={`resource-file-type-label-${entry.id}`}>
                Icon
              </label>
              <div
                className="admin-resource-type-menu"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenTypeMenuId(null);
                  }
                }}
              >
                <button
                  type="button"
                  className="admin-resource-type-button"
                  aria-haspopup="listbox"
                  aria-expanded={openTypeMenuId === entry.id}
                  aria-labelledby={`resource-file-type-label-${entry.id}`}
                  onClick={() =>
                    setOpenTypeMenuId((current) => (current === entry.id ? null : entry.id))
                  }
                >
                  <span>
                    {resourceIconOptions.find((option) => option.value === entry.icon)?.label ?? "Choose icon"}
                  </span>
                  <ResourceIconPreview icon={entry.icon} program={program} />
                  <ChevronDown size={17} />
                </button>
                {openTypeMenuId === entry.id ? (
                  <div className="admin-resource-type-options" role="listbox" tabIndex={-1}>
                    {resourceIconOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`admin-resource-type-option ${
                          option.value === entry.icon ? "admin-resource-type-option-active" : ""
                        }`}
                        role="option"
                        aria-selected={option.value === entry.icon}
                        onClick={() => {
                          updateDraft(entry.id, {
                            icon: option.value
                          });
                          setOpenTypeMenuId(null);
                        }}
                      >
                        <span>{option.label}</span>
                        <ResourceIconPreview icon={option.value} program={program} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="admin-resource-copyright-cell">
              {isPdfFileName(entry.file?.name ?? entry.fileName) ? (
                <label className="admin-resource-copyright-toggle">
                  <span>©</span>
                  <input
                    type="checkbox"
                    checked={entry.includeCopyright}
                    onChange={(event) => updateDraft(entry.id, { includeCopyright: event.target.checked })}
                    aria-label={`Add copyright footer to ${entry.name || `resource file ${index + 1}`}`}
                  />
                </label>
              ) : null}
            </div>
            <div className="admin-resource-file-picker">
              <label className="admin-field-label" htmlFor={`resource-file-upload-${entry.id}`}>
                File
              </label>
              <div className="asset-picker-actions">
                <input
                  id={`resource-file-upload-${entry.id}`}
                  className="admin-resource-native-file"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    updateFileSelection(entry.id, {
                      file,
                      fileName: file?.name ?? entry.fileName,
                      filePath: file ? "" : entry.filePath,
                      sizeBytes: file?.size ?? entry.sizeBytes
                    });
                  }}
                />
                <label
                  className="button button-secondary icon-only-button admin-resource-upload-button"
                  htmlFor={`resource-file-upload-${entry.id}`}
                  aria-label={`Choose file for ${entry.name || `resource file ${index + 1}`}`}
                  title="Choose file"
                >
                  <Upload size={16} />
                </label>
                <button
                  type="button"
                  className="button button-secondary icon-only-button"
                  onClick={() => openBrowse(entry.id)}
                  aria-label={`Browse files for ${entry.name || `resource file ${index + 1}`}`}
                  title="Browse"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              <p className="admin-resource-current-file">
                {entry.file
                  ? `Selected: ${entry.file.name}`
                  : entry.fileName
                    ? `Current: ${entry.fileName}`
                    : "No file selected"}
              </p>
            </div>
            <div className="admin-resource-file-actions">
              <button
                type="button"
                className="button button-secondary icon-only-button"
                aria-label={`Move ${entry.name || `resource file ${index + 1}`} up`}
                title="Move up"
                disabled={index === 0}
                onClick={() => moveDraft(index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="button button-secondary icon-only-button"
                aria-label={`Move ${entry.name || `resource file ${index + 1}`} down`}
                title="Move down"
                disabled={index === value.length - 1}
                onClick={() => moveDraft(index, 1)}
              >
                <ArrowDown size={16} />
              </button>
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
          </div>
        ))}
      </div>

      {browsingDraft ? (
        <ModalPortal>
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
                          updateFileSelection(browsingDraft.id, {
                            file: null,
                            filePath: file.path,
                            fileName: file.name,
                            sizeBytes: file.sizeBytes,
                            name: browsingDraft.name || file.name
                          });
                          setBrowseDraftId(null);
                        }}
                      >
                        Use file
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="admin-form-status">No files found.</p>
                )}
              </div>
              {pageCount > 1 ? (
                <div className="button-row button-row-tight">
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <span className="admin-form-status">
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
              ) : null}
              {browsingDraft.fileName ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    updateFileSelection(browsingDraft.id, {
                      file: null,
                      filePath: "",
                      fileName: "",
                      sizeBytes: undefined
                    });
                    setBrowseDraftId(null);
                  }}
                >
                  Clear current file
                </button>
              ) : null}
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </section>
  );
}
