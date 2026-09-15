"use client";

import type { Route } from "next";
import Link from "next/link";
import { Download, FileArchive, FileText, ImageIcon, LoaderCircle, Palette, Pin, X } from "lucide-react";
import { useState } from "react";

import { ModalPortal } from "@/components/modal-portal";
import { getResourceIconPath } from "@/lib/resource-icon-paths";

export type FamilyLessonFileItem = {
  key: "discussion" | "activity" | "memory";
  title: string;
  description: string;
  href: string;
  fileName: string;
};

type Props = {
  files: FamilyLessonFileItem[];
  lessonTitle: string;
};

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function getPreviewType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "pdf") {
    return "pdf";
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }

  return "none";
}

function appendPreviewParam(href: string) {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return `${href}${href.includes("?") ? "&" : "?"}preview=1`;
}

function FamilyFileIcon({ file }: { file: FamilyLessonFileItem }) {
  const iconPath = getResourceIconPath(file.title, file.fileName, "family");

  if (iconPath) {
    return <img src={iconPath} alt="" />;
  }

  const previewType = getPreviewType(file.fileName);
  const extension = file.fileName.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "zip") {
    return <FileArchive size={18} />;
  }

  if (previewType === "image") {
    return <ImageIcon size={18} />;
  }

  if (file.key === "activity") {
    return <Palette size={18} />;
  }

  if (file.key === "memory") {
    return <Pin size={18} />;
  }

  return <FileText size={18} />;
}

export function FamilyLessonFiles({ files, lessonTitle }: Props) {
  const [previewFile, setPreviewFile] = useState<FamilyLessonFileItem | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  if (!files.length) {
    return null;
  }

  function openPreviewFile(file: FamilyLessonFileItem) {
    setIsPreviewLoading(true);
    setPreviewFile(file);
  }

  function downloadPreviewFile() {
    if (!previewFile) {
      return;
    }

    const destination = previewFile.href;
    setPreviewFile(null);
    window.setTimeout(() => {
      window.location.assign(destination);
    }, 120);
  }

  return (
    <>
      <section className="resource-downloads-panel family-downloads-panel" aria-label="Family lesson downloads">
        <div className="resource-downloads-head family-downloads-head">
          <h2>Family Files</h2>
          <p>Take-home resources</p>
        </div>
        <div className="resource-download-list">
          {files.map((file) => {
            const previewType = getPreviewType(file.fileName);
            const canPreview = previewType !== "none";

            return (
              <div className="resource-download-item family-download-item" key={file.key}>
                {canPreview ? (
                  <button
                    type="button"
                    className="resource-download-copy resource-download-preview-trigger"
                    onClick={() => openPreviewFile(file)}
                    aria-label={`Preview ${file.title} for ${lessonTitle}`}
                  >
                    <span className="resource-download-icon family-download-icon" aria-hidden="true">
                      <FamilyFileIcon file={file} />
                    </span>
                    <span>
                      <strong>{file.title}</strong>
                      <small>{file.description}</small>
                    </span>
                  </button>
                ) : (
                  <div className="resource-download-copy">
                    <span className="resource-download-icon family-download-icon" aria-hidden="true">
                      <FamilyFileIcon file={file} />
                    </span>
                    <span>
                      <strong>{file.title}</strong>
                      <small>{file.description}</small>
                    </span>
                  </div>
                )}
                <Link
                  href={file.href as Route}
                  className="resource-download-link family-download-link"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Download ${file.title} for ${lessonTitle}`}
                >
                  <Download size={18} />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {previewFile ? (
        <ModalPortal>
          <div className="modal-backdrop resource-preview-modal-backdrop" role="presentation" onClick={() => setPreviewFile(null)}>
            <div
              className="modal-card resource-file-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="family-file-preview-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="resource-file-preview-head">
                <div>
                  <h3 id="family-file-preview-title">{previewFile.title}</h3>
                  <p>{getFileExtension(previewFile.fileName)}</p>
                </div>
                <div className="resource-file-preview-actions">
                  <button
                    type="button"
                    className="resource-file-preview-icon-button"
                    aria-label={`Download ${previewFile.title}`}
                    onClick={downloadPreviewFile}
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    className="resource-file-preview-icon-button"
                    aria-label="Close preview"
                    onClick={() => setPreviewFile(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="resource-file-preview-body">
                {isPreviewLoading ? (
                  <div className="resource-file-preview-loader" role="status" aria-live="polite">
                    <LoaderCircle size={22} className="spin" />
                    <span>Loading...</span>
                  </div>
                ) : null}
                {getPreviewType(previewFile.fileName) === "pdf" ? (
                  <iframe
                    src={appendPreviewParam(previewFile.href)}
                    title={`${previewFile.title} preview`}
                    className="resource-file-preview-frame"
                    onLoad={() => setIsPreviewLoading(false)}
                  />
                ) : (
                  <img
                    src={appendPreviewParam(previewFile.href)}
                    alt={`${previewFile.title} preview`}
                    className="resource-file-preview-image"
                    onLoad={() => setIsPreviewLoading(false)}
                    onError={() => setIsPreviewLoading(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
