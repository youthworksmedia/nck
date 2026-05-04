"use client";

import {
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { formatDateTime } from "@/lib/time";
import type { ResourceAssetKey, ResourceLibraryFile } from "@/lib/resource-assets";

type Props = {
  files: ResourceLibraryFile[];
};

const labels: Record<ResourceAssetKey, string> = {
  music: "Music files",
  worksheet: "Worksheet files",
  manual: "Manual files"
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function FileKindIcon({ fileName }: { fileName: string }) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (["mp3", "wav", "m4a", "aac", "ogg"].includes(extension)) {
    return <FileAudio size={18} />;
  }

  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
    return <FileImage size={18} />;
  }

  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileSpreadsheet size={18} />;
  }

  if (["zip", "rar", "7z"].includes(extension)) {
    return <FileArchive size={18} />;
  }

  return <FileText size={18} />;
}

export function AdminFileLibrary({ files }: Props) {
  const router = useRouter();
  const inputRefs = useRef<Record<ResourceAssetKey, HTMLInputElement | null>>({
    music: null,
    worksheet: null,
    manual: null
  });
  const [activeKind, setActiveKind] = useState<ResourceAssetKey>("manual");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleFiles = files.filter((file) => file.kind === activeKind);

  return (
    <div className="stack-sm">
      <div className="admin-file-tabs" role="tablist" aria-label="File library tabs">
        {(["manual", "worksheet", "music"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={activeKind === kind}
            className={`admin-file-tab ${activeKind === kind ? "admin-file-tab-active" : ""}`}
            onClick={() => setActiveKind(kind)}
          >
            {labels[kind]}
          </button>
        ))}
      </div>

      <section className="panel panel-compact">
        <div className="admin-file-library-head">
          <h3>{labels[activeKind]}</h3>
          <div>
            <input
              ref={(element) => {
                inputRefs.current[activeKind] = element;
              }}
              type="file"
              className="asset-picker-input"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                setMessage(null);
                startTransition(async () => {
                  const formData = new FormData();
                  formData.set("kind", activeKind);
                  formData.set("file", file);

                  const response = await fetch("/api/admin/resource-files", {
                    method: "POST",
                    body: formData
                  });

                  const payload = await response.json();
                  setMessage(payload.message);

                  if (response.ok) {
                    event.target.value = "";
                    router.refresh();
                  }
                });
              }}
            />
            <button
              type="button"
              className="button button-primary"
              disabled={isPending}
              onClick={() => inputRefs.current[activeKind]?.click()}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>
        {visibleFiles.length ? (
          <div className="admin-file-list">
            {visibleFiles.map((file) => (
              <div key={file.id} className="admin-file-row">
                <div className="admin-file-row-copy">
                  <strong className="admin-file-row-name">
                    <FileKindIcon fileName={file.name} />
                    <span>{file.name}</span>
                  </strong>
                  <p>
                    Uploaded {formatDateTime(file.uploadedAt)} · {formatFileSize(file.sizeBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-secondary admin-file-delete"
                  disabled={isPending}
                  aria-label={`Delete ${file.name}`}
                  title={`Delete ${file.name}`}
                  onClick={() => {
                    const confirmed = window.confirm(`Delete "${file.name}" from the file library?`);

                    if (!confirmed) {
                      return;
                    }

                    startTransition(async () => {
                      const response = await fetch("/api/admin/resource-files", {
                        method: "DELETE",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                          path: file.path,
                          kind: file.kind
                        })
                      });

                      const payload = await response.json();
                      setMessage(payload.message);

                      if (response.ok) {
                        router.refresh();
                      }
                    });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="form-status">No files uploaded here yet.</p>
        )}
      </section>
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
