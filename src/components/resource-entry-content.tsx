"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileArchive,
  FileText,
  ImageIcon,
  LoaderCircle,
  LogIn,
  MicVocal,
  Music4,
  Play,
  UserPlus,
  Video,
  X
} from "lucide-react";
import { useState, useTransition } from "react";

import { ModalPortal } from "@/components/modal-portal";
import { PendingActionLink } from "@/components/pending-action-link";
import { getResourceIconPath } from "@/lib/resource-icon-paths";
import type { LessonResourceAttachment, LessonResourceProgramKey, Resource } from "@/types";

type Props = {
  canAccessPodcast: boolean;
  canDownload: boolean;
  descriptionHtml: string;
  loginHref: Route;
  nextLesson: Pick<Resource, "id" | "lessonNumber" | "title"> | null;
  previousLesson: Pick<Resource, "id" | "lessonNumber" | "title"> | null;
  resource: Resource;
  resourcesHref: Route;
};

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) {
    return "Size unavailable";
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function ResourceFileIcon({
  attachment,
  program
}: {
  attachment: LessonResourceAttachment;
  program: LessonResourceProgramKey;
}) {
  const iconPath = getResourceIconPath(attachment.name, attachment.fileName, program, attachment.icon);

  if (iconPath) {
    return <img src={iconPath} alt="" />;
  }

  const { fileName } = attachment;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (["mp3", "wav", "m4a", "aac"].includes(extension)) {
    return <Music4 size={18} />;
  }

  if (["mp4", "mov", "webm"].includes(extension)) {
    return <Video size={18} />;
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return <ImageIcon size={18} />;
  }

  if (["zip"].includes(extension)) {
    return <FileArchive size={18} />;
  }

  return <FileText size={18} />;
}

const downloadSections: Array<{
  program: LessonResourceProgramKey;
  title: string;
  subtitle: string;
  downloadAllLabel: string;
  panelClassName: string;
  iconClassName: string;
  linkClassName: string;
  buttonClassName: string;
}> = [
  {
    program: "schoolAge",
    title: "School Age Program",
    subtitle: "Download lesson content",
    downloadAllLabel: "Download all (School Age)",
    panelClassName: "resource-downloads-panel-school-age",
    iconClassName: "resource-download-icon-school-age",
    linkClassName: "resource-download-link-school-age",
    buttonClassName: "resource-download-all-button-school-age"
  },
  {
    program: "preschool",
    title: "Preschool Program",
    subtitle: "Ages 3-5 adaptation",
    downloadAllLabel: "Download all (Preschool)",
    panelClassName: "resource-downloads-panel-preschool",
    iconClassName: "resource-download-icon-preschool",
    linkClassName: "resource-download-link-preschool",
    buttonClassName: "resource-download-all-button-preschool"
  }
];

export function ResourceEntryContent({
  canAccessPodcast,
  canDownload,
  descriptionHtml,
  loginHref,
  nextLesson,
  previousLesson,
  resource,
  resourcesHref
}: Props) {
  const [isPackingFiles, startPackingFiles] = useTransition();
  const [isPodcastOpen, setIsPodcastOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    attachment: LessonResourceAttachment;
    program: LessonResourceProgramKey;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const canShowPodcast = Boolean(canAccessPodcast && resource.podcastTitle && resource.podcastLinks?.length);
  const preschoolAttachments =
    resource.preschoolAttachments?.length
      ? resource.preschoolAttachments
      : resource.lessonNumber === 1
        ? resource.attachments ?? []
        : [];

  async function downloadAllFiles(program: LessonResourceProgramKey) {
    startPackingFiles(async () => {
      const response = await fetch(`/api/resources/${resource.id}/download-all?program=${encodeURIComponent(program)}`);

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${resource.title}-${program === "preschool" ? "preschool" : "school-age"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    });
  }

  async function copyPodcastUrl(linkId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(linkId);
      window.setTimeout(() => {
        setCopiedLinkId((current) => (current === linkId ? null : current));
      }, 1800);
    } catch {
      setCopiedLinkId(null);
    }
  }

  function getDownloadUrl(attachment: LessonResourceAttachment, program: LessonResourceProgramKey) {
    return `/api/resources/${resource.id}/download?asset=${encodeURIComponent(attachment.id)}&program=${encodeURIComponent(program)}`;
  }

  function getPreviewUrl(attachment: LessonResourceAttachment, program: LessonResourceProgramKey) {
    return `${getDownloadUrl(attachment, program)}&preview=1`;
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

  function downloadPreviewFile() {
    if (!previewFile) {
      return;
    }

    const destination = getDownloadUrl(previewFile.attachment, previewFile.program);
    setPreviewFile(null);
    window.setTimeout(() => {
      window.location.assign(destination);
    }, 120);
  }

  function openPreviewFile(attachment: LessonResourceAttachment, program: LessonResourceProgramKey) {
    setIsPreviewLoading(true);
    setPreviewFile({ attachment, program });
  }

  return (
    <>
      <div className="resource-entry-page">
        <header className="resource-entry-header">
          <nav className="resource-entry-breadcrumb" aria-label="Lesson breadcrumb">
            <Link href="/resources">Teach</Link>
            <span>/</span>
            <Link href={resourcesHref}>{resource.term}</Link>
            <span>/</span>
            <Link href={`/resources/${resource.id}` as Route}>Week {resource.lessonNumber ?? 1}</Link>
          </nav>
          <h1 className="resource-entry-title">{resource.title}</h1>
          {resource.scripture ? <p className="resource-entry-scripture">{resource.scripture}</p> : null}
        </header>

        <div className="resource-entry-shell">
          <div className="resource-entry-main">
          {resource.bigIdea ? (
            <section className="resource-big-idea">
              <span>Big Idea</span>
              <strong>{resource.bigIdea}</strong>
            </section>
          ) : null}
          <section className="resource-entry-overview">
            <h2>Teaching Overview</h2>
            <div
              className="resource-html resource-entry-description"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </section>
          {canShowPodcast ? (
            <button type="button" className="resource-podcast-card" onClick={() => setIsPodcastOpen(true)}>
              <span className="resource-podcast-icon">
                <MicVocal size={22} />
              </span>
              <span className="resource-podcast-copy">
                <span className="resource-podcast-label">Podcast</span>
                <strong>{resource.podcastTitle}</strong>
                <span>
                  {resource.podcastLinks?.map((entry) => entry.label).join(" · ")}
                </span>
              </span>
              <span className="resource-podcast-action">
                <Play size={16} />
                Play
              </span>
            </button>
          ) : null}
          </div>

          <div className="resource-entry-sidebar">
            {downloadSections.map((section) => {
              const attachments: LessonResourceAttachment[] =
                section.program === "preschool" ? preschoolAttachments : resource.attachments ?? [];

              return (
                <aside
                  key={section.program}
                  className={`resource-downloads-panel ${section.panelClassName}`}
                  aria-label={`${section.title} downloads`}
                >
                  <div className="resource-downloads-head">
                    <h2>{section.title}</h2>
                    <p>{section.subtitle}</p>
                  </div>
                  {!canDownload ? (
                    <p className="resource-preview-note">
                      Preview the lesson details here. Sign in or choose a membership to download the files.
                    </p>
                  ) : null}
                  {attachments.length ? (
                    <div className="resource-download-list">
                      {attachments.map((attachment) => {
                        const previewType = getPreviewType(attachment.fileName);
                        const canPreview = canDownload && previewType !== "none";

                        return (
                        <div className="resource-download-item" key={`${section.program}-${attachment.id}`}>
                          {canPreview ? (
                            <button
                              type="button"
                              className="resource-download-copy resource-download-preview-trigger"
                              onClick={() => openPreviewFile(attachment, section.program)}
                              aria-label={`Preview ${attachment.name}`}
                            >
                              <span
                                className={`resource-download-icon ${section.iconClassName}`}
                                aria-hidden="true"
                              >
                                <ResourceFileIcon attachment={attachment} program={section.program} />
                              </span>
                              <span>
                                <strong>{attachment.name}</strong>
                                <small>
                                  {getFileExtension(attachment.fileName)} · {formatFileSize(attachment.sizeBytes)}
                                </small>
                              </span>
                            </button>
                          ) : (
                            <div className="resource-download-copy">
                              <span
                                className={`resource-download-icon ${section.iconClassName}`}
                                aria-hidden="true"
                              >
                                <ResourceFileIcon attachment={attachment} program={section.program} />
                              </span>
                              <span>
                                <strong>{attachment.name}</strong>
                                <small>
                                  {getFileExtension(attachment.fileName)} · {formatFileSize(attachment.sizeBytes)}
                                </small>
                              </span>
                            </div>
                          )}
                          {canDownload ? (
                            <PendingActionLink
                              href={getDownloadUrl(attachment, section.program)}
                              className={`resource-download-link ${section.linkClassName}`}
                              loadingLabel="Preparing..."
                            >
                              <Download size={18} />
                            </PendingActionLink>
                          ) : (
                            <div className="resource-entry-preview-actions">
                              <Link href={loginHref} className="button button-primary resource-entry-download-button">
                                <LogIn size={16} />
                                <span>Login</span>
                              </Link>
                              <Link href="/#subscription-plans" className="button button-secondary resource-entry-signup-button">
                                <UserPlus size={16} />
                                <span>Sign up</span>
                              </Link>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="resource-preview-note">No files have been added to this lesson yet.</p>
                  )}
                  {canDownload && attachments.length ? (
                    <button
                      type="button"
                      className={`button button-primary resource-download-all-button ${section.buttonClassName}`}
                      disabled={isPackingFiles}
                      onClick={() => void downloadAllFiles(section.program)}
                    >
                      {isPackingFiles ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
                      <span>{isPackingFiles ? "Packing all files..." : section.downloadAllLabel}</span>
                    </button>
                  ) : null}
                </aside>
              );
            })}
          </div>

            <div className="resource-entry-lesson-nav" aria-label="Lesson navigation">
              <Link href={resourcesHref} className="resource-back-lessons-button">
                <ArrowLeft size={16} />
                <span>Back to lessons</span>
              </Link>
              {previousLesson || nextLesson ? (
                <div className="resource-week-nav">
                  {previousLesson ? (
                    <Link href={`/resources/${previousLesson.id}`} className="resource-week-button">
                      <ArrowLeft size={16} />
                      <span>{previousLesson.lessonNumber ? `Week ${previousLesson.lessonNumber}` : "Previous week"}</span>
                    </Link>
                  ) : null}
                  {nextLesson ? (
                    <Link href={`/resources/${nextLesson.id}`} className="resource-week-button">
                      <span>{nextLesson.lessonNumber ? `Week ${nextLesson.lessonNumber}` : "Next week"}</span>
                      <ArrowRight size={16} />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
        </div>
      </div>

      {isPodcastOpen ? (
        <ModalPortal>
          <div className="modal-backdrop" role="presentation" onClick={() => setIsPodcastOpen(false)}>
            <div className="modal-card resource-podcast-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <h3>{resource.podcastTitle}</h3>
                  <p>Listen wherever you like.</p>
                </div>
                <button
                  type="button"
                  className="asset-library-close"
                  aria-label="Close podcast links"
                  onClick={() => setIsPodcastOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="resource-podcast-links">
                {resource.podcastLinks?.map((entry) => (
                  <div key={entry.id} className="resource-podcast-link-row">
                    <strong>{entry.label}</strong>
                    <div className="resource-podcast-url-row">
                      <input
                        type="text"
                        readOnly
                        value={entry.url}
                        aria-label={`${entry.label} URL`}
                        className="resource-podcast-url-input"
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <button
                        type="button"
                        className="button button-secondary resource-podcast-copy-button"
                        onClick={() => void copyPodcastUrl(entry.id, entry.url)}
                      >
                        {copiedLinkId === entry.id ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedLinkId === entry.id ? "Copied" : "Copy"}</span>
                      </button>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="button button-secondary resource-podcast-link"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {previewFile ? (
        <ModalPortal>
          <div className="modal-backdrop resource-preview-modal-backdrop" role="presentation" onClick={() => setPreviewFile(null)}>
            <div
              className="modal-card resource-file-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="resource-file-preview-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="resource-file-preview-head">
                <div>
                  <h3 id="resource-file-preview-title">{previewFile.attachment.name}</h3>
                  <p>
                    {getFileExtension(previewFile.attachment.fileName)} · {formatFileSize(previewFile.attachment.sizeBytes)}
                  </p>
                </div>
                <div className="resource-file-preview-actions">
                  <button
                    type="button"
                    className="resource-file-preview-icon-button"
                    aria-label={`Download ${previewFile.attachment.name}`}
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
                {getPreviewType(previewFile.attachment.fileName) === "pdf" ? (
                  <iframe
                    src={getPreviewUrl(previewFile.attachment, previewFile.program)}
                    title={`${previewFile.attachment.name} preview`}
                    className="resource-file-preview-frame"
                    onLoad={() => setIsPreviewLoading(false)}
                  />
                ) : (
                  <img
                    src={getPreviewUrl(previewFile.attachment, previewFile.program)}
                    alt={`${previewFile.attachment.name} preview`}
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
