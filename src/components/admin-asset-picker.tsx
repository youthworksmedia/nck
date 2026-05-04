"use client";

import { FolderOpen, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { formatDateTime } from "@/lib/time";
import type { ResourceAssetKey, ResourceLibraryFile } from "@/lib/resource-assets";

type Props = {
  kind: ResourceAssetKey;
  files: ResourceLibraryFile[];
  selectedPath: string;
  onSelectPath: (value: string) => void;
  uploadFile: File | null;
  onUploadFile: (file: File | null) => void;
};

function formatLabel(kind: ResourceAssetKey) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function getFileFormat(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.at(-1)?.toUpperCase() ?? "FILE" : "FILE";
}

export function AdminAssetPicker({
  kind,
  files,
  selectedPath,
  onSelectPath,
  uploadFile,
  onUploadFile
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const label = kind === "worksheet" ? "Worksheets" : formatLabel(kind);
  const matchingFiles = files.filter((file) => file.kind === kind);

  const selectedExistingFile = useMemo(
    () => matchingFiles.find((file) => file.path === selectedPath) ?? null,
    [matchingFiles, selectedPath]
  );

  const currentLabel = uploadFile
    ? `New upload: ${uploadFile.name}`
    : selectedExistingFile
      ? `Library file: ${selectedExistingFile.name}`
      : "No file selected yet";

  const hasSelection = Boolean(uploadFile || selectedExistingFile);

  return (
    <div className="asset-picker">
      <label className="admin-field-label">{label}</label>
      <div className="asset-picker-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} />
          <span>Upload</span>
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setIsOpen(true)}
        >
          <FolderOpen size={16} />
          <span>Library</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="asset-picker-input"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onUploadFile(file);
          if (file) {
            onSelectPath("");
          }
        }}
      />
      <div className="asset-picker-current-row">
        <p className="asset-picker-current">{currentLabel}</p>
        {hasSelection ? (
          <button
            type="button"
            className="asset-picker-clear"
            aria-label={`Remove selected ${label.toLowerCase()} file`}
            title={`Remove selected ${label.toLowerCase()} file`}
            onClick={() => {
              onSelectPath("");
              onUploadFile(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div className="modal-card asset-library-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{label} library</h3>
                <p>Choose an existing file from the private file library.</p>
              </div>
              <button
                type="button"
                className="asset-library-close"
                aria-label={`Close ${label} library`}
                onClick={() => setIsOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="asset-library-list">
              {matchingFiles.length ? (
                matchingFiles.map((file) => (
                  <div key={file.id} className="asset-library-row">
                    <div>
                      <strong>{file.name}</strong>
                      <p>
                        Uploaded {formatDateTime(file.uploadedAt)} · {getFileFormat(file.name)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => {
                        onSelectPath(file.path);
                        onUploadFile(null);
                        setIsOpen(false);
                      }}
                    >
                      Choose
                    </button>
                  </div>
                ))
              ) : (
                <p className="form-status">No {kind} files have been uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
