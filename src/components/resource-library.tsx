"use client";

import Link from "next/link";
import { Download, Home, Loader2, Play, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ModalPortal } from "@/components/modal-portal";
import {
  curriculumSections,
  getCurriculumSectionMeta,
  normalizeCurriculumSection,
  normalizeCurriculumYear,
  type CurriculumSection,
  type CurriculumYear
} from "@/lib/curriculum";
import { getResourceIconPath } from "@/lib/resource-icon-paths";
import type { CurriculumUnitGraphic, CurriculumUnitOverview, Resource } from "@/types";

type Props = {
  canAccessPremiumMedia: boolean;
  resources: Resource[];
  unitOverviews: CurriculumUnitOverview[];
  initialYear?: CurriculumYear;
  initialSection?: CurriculumSection;
};

export function ResourceLibrary({
  canAccessPremiumMedia,
  resources,
  unitOverviews,
  initialYear = "Volume 1",
  initialSection = "Unit 1"
}: Props) {
  const selectedYear = initialYear;
  const selectedTerm = initialSection;

  const resourcesByTerm = useMemo(
    () =>
      curriculumSections.map((term) => ({
        term,
        entries: resources
          .filter(
            (resource) =>
              normalizeCurriculumYear(resource.yearCycle) === selectedYear &&
              normalizeCurriculumSection(resource.term) === term
          )
          .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0))
      })),
    [resources, selectedYear]
  );

  const activeUnitOverview = useMemo(
    () =>
      unitOverviews.find(
        (overview) =>
          normalizeCurriculumYear(overview.yearCycle) === selectedYear &&
          normalizeCurriculumSection(overview.term) === selectedTerm
      ),
    [selectedTerm, selectedYear, unitOverviews]
  );

  function getUnitSubtitle(term: CurriculumSection) {
    return (
      unitOverviews.find(
        (overview) =>
          normalizeCurriculumYear(overview.yearCycle) === selectedYear &&
          normalizeCurriculumSection(overview.term) === term
      )?.subtitle || getCurriculumSectionMeta(selectedYear, term).title
    );
  }

  function trackResourceVisit(resourceId: string) {
    fetch("/api/dashboard-state/resource", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ resourceId }),
      keepalive: true
    }).catch(() => {
      // Opening the lesson is more important than persisting dashboard history.
    });
  }

  return (
    <>
      <section className="resource-filter-panel">
        <div className="resource-term-tabs-inline" aria-label={`${selectedYear} sections`}>
          {curriculumSections.map((term) => {
            const isActive = selectedTerm === term;
            const subtitle = getUnitSubtitle(term);

            return (
              <Link
                key={term}
                href={{ pathname: "/resources", query: { year: selectedYear, section: term } }}
                aria-current={isActive ? "page" : undefined}
                className={`resource-term-pill ${isActive ? "resource-term-pill-active" : ""}`}
              >
                <span>{term}</span>
                <small>{subtitle}</small>
              </Link>
            );
          })}
        </div>
        {activeUnitOverview ? <UnitOverview canAccessPremiumMedia={canAccessPremiumMedia} overview={activeUnitOverview} /> : null}
      </section>

      <section className="resource-browser-layout">
        <div className="resource-list-panel">
          {resourcesByTerm.some((group) => group.term === selectedTerm && group.entries.length) ? (
            <div className="resource-term-stack">
              {resourcesByTerm.map((group) =>
                group.term === selectedTerm ? (
                  <section key={group.term} className="resource-term-section">
                    {group.entries.length ? (
                      <LessonLayout
                        lessons={group.entries}
                        onVisit={trackResourceVisit}
                      />
                    ) : (
                      <p className="resource-empty">
                        No curriculum entries have been added for {selectedYear} {selectedTerm} yet.
                      </p>
                    )}
                  </section>
                ) : null
              )}
            </div>
          ) : (
            <p className="resource-empty">
              No curriculum entries have been added for {selectedYear} {selectedTerm} yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function LessonLayout({
  lessons,
  onVisit
}: {
  lessons: Resource[];
  onVisit: (resourceId: string) => void;
}) {
  const splitIndex = Math.ceil(lessons.length / 2);
  const columns = lessons.length > 1 ? [lessons.slice(0, splitIndex), lessons.slice(splitIndex)] : [lessons];

  return (
    <div className="curriculum-table">
      <div className="curriculum-table-intro">
        <strong>Weekly Teaching Content</strong>
      </div>
      <div className="curriculum-table-columns">
        {columns.map((columnLessons, columnIndex) =>
          columnLessons.length ? (
            <div className="curriculum-table-column" key={columnIndex}>
              <div className="curriculum-table-row curriculum-table-head" aria-hidden="true">
                <span>Week</span>
                <span>Title</span>
              </div>
              {columnLessons.map((resource) => {
                const lessonIndex = lessons.findIndex((entry) => entry.id === resource.id);

                return (
                  <article key={resource.id} className="curriculum-table-row">
                    <span className="curriculum-lesson-number">{resource.lessonNumber ?? lessonIndex + 1}</span>
                    <div className="curriculum-lesson-cell">
                      <Link
                        href={`/resources/${resource.id}`}
                        className="curriculum-row-title"
                        onClick={() => onVisit(resource.id)}
                      >
                        {resource.title}
                      </Link>
                      <span className="curriculum-passage">
                        {resource.scripture || getFallbackPassage(lessonIndex)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function UnitOverview({
  canAccessPremiumMedia,
  overview
}: {
  canAccessPremiumMedia: boolean;
  overview: CurriculumUnitOverview;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);
  const [previewGraphic, setPreviewGraphic] = useState<CurriculumUnitGraphic | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const hasGraphics = overview.graphics.length > 0;
  const heroImageUrl = overview.heroImagePath
    ? `/api/resources/unit-overviews/hero-image?year=${encodeURIComponent(overview.yearCycle)}&term=${encodeURIComponent(overview.term)}`
    : null;

  async function downloadAllGraphics() {
    if (!hasGraphics || isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch(
        `/api/resources/unit-graphics/download-all?year=${encodeURIComponent(overview.yearCycle)}&term=${encodeURIComponent(overview.term)}`
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${overview.title}-graphics.zip`.replace(/[\\/:*?"<>|]+/g, "-");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  function getGraphicDownloadUrl(graphic: CurriculumUnitGraphic) {
    return `/api/resources/unit-graphics/${graphic.id}/download`;
  }

  function getGraphicPreviewUrl(graphic: CurriculumUnitGraphic) {
    return `${getGraphicDownloadUrl(graphic)}?preview=1`;
  }

  function getGraphicPreviewType(fileName?: string | null) {
    const extension = fileName?.split(".").pop()?.toLowerCase() ?? "";

    if (extension === "pdf") {
      return "pdf";
    }

    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
      return "image";
    }

    return "none";
  }

  function downloadPreviewGraphic() {
    if (!previewGraphic) {
      return;
    }

    const destination = getGraphicDownloadUrl(previewGraphic);
    setPreviewGraphic(null);
    window.setTimeout(() => {
      window.location.assign(destination);
    }, 120);
  }

  function openPreviewGraphic(graphic: CurriculumUnitGraphic) {
    setIsPreviewLoading(true);
    setPreviewGraphic(graphic);
  }

  function renderGraphicIcon(graphic: CurriculumUnitGraphic) {
    const iconPath = getResourceIconPath(graphic.title, graphic.fileName, "primary-school", graphic.icon);

    if (iconPath) {
      return <img src={iconPath} alt="" />;
    }

    return graphic.icon;
  }

  return (
    <section className="unit-overview-wrap">
      <div
        className={`unit-hero-card ${heroImageUrl ? "unit-hero-card-with-image" : ""}`}
        style={heroImageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(33, 31, 38, 0.96) 0%, rgba(33, 31, 38, 0.78) 46%, rgba(33, 31, 38, 0.16) 100%), url("${heroImageUrl}")` } : undefined}
      >
        <span className="eyebrow">
          <Home size={17} />
          {overview.eyebrow}
        </span>
        <h2>{overview.title}</h2>
        <strong>{overview.subtitle}</strong>
      </div>

      <div className="unit-overview-grid">
        <article className="unit-overview-card">
          <span className="eyebrow">
            <Home size={16} />
            Unit overview
          </span>
          <div className="resource-html" dangerouslySetInnerHTML={{ __html: overview.overviewHtml }} />
          {canAccessPremiumMedia ? (
            <div className="unit-video-grid">
              <UnitVideoCard
                title={overview.introVideoTitle}
                meta={overview.introVideoMeta}
                description={overview.introVideoDescription}
                url={overview.introVideoUrl}
                onOpen={setActiveVideo}
              />
              <UnitVideoCard
                title={overview.deepDiveVideoTitle}
                meta={overview.deepDiveVideoMeta}
                description={overview.deepDiveVideoDescription}
                url={overview.deepDiveVideoUrl}
                onOpen={setActiveVideo}
              />
            </div>
          ) : (
            <p className="resource-preview-note">
              Sign in with an active membership to watch the unit videos.
            </p>
          )}
        </article>

        <aside className="unit-graphics-card">
          <div className="unit-graphics-head">
            <span className="eyebrow">
              <Home size={16} />
              Unit Files
            </span>
            <p>Branding files for promotion & display</p>
          </div>
          <div className="unit-graphics-list">
            {overview.graphics.length ? (
              overview.graphics.map((graphic) => {
                const previewType = getGraphicPreviewType(graphic.fileName);
                const canPreview = canAccessPremiumMedia && previewType !== "none";

                return (
                  <div className="unit-graphic-row" key={graphic.id}>
                    {canPreview ? (
                      <button
                        type="button"
                        className="unit-graphic-preview-trigger"
                        onClick={() => openPreviewGraphic(graphic)}
                        aria-label={`Preview ${graphic.title}`}
                      >
                        <span className="unit-graphic-icon">{renderGraphicIcon(graphic)}</span>
                        <span>
                          <strong>{graphic.title}</strong>
                          <small>{graphic.description || graphic.fileName || "Download"}</small>
                        </span>
                      </button>
                    ) : (
                      <span className="unit-graphic-copy">
                        <span className="unit-graphic-icon">{renderGraphicIcon(graphic)}</span>
                        <span>
                          <strong>{graphic.title}</strong>
                          <small>{graphic.description || graphic.fileName || "Download"}</small>
                        </span>
                      </span>
                    )}
                    {canAccessPremiumMedia ? (
                      <a
                        href={getGraphicDownloadUrl(graphic)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Download ${graphic.title}`}
                      >
                        <Download size={18} />
                      </a>
                    ) : (
                      <small>Login required</small>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="resource-empty">No unit files have been uploaded yet.</p>
            )}
          </div>
          {canAccessPremiumMedia ? (
            <button
              className="button button-primary unit-download-all"
              type="button"
              onClick={downloadAllGraphics}
              disabled={!hasGraphics || isDownloading}
            >
              {isDownloading ? <Loader2 size={16} className="unit-download-spinner" /> : <Download size={16} />}
              <span>{isDownloading ? "Preparing..." : "Download all files"}</span>
            </button>
          ) : (
            <p className="resource-preview-note">Sign in with an active membership to download unit files.</p>
          )}
        </aside>
      </div>
      {activeVideo ? (
        <ModalPortal>
          <div
            className="modal-backdrop unit-video-modal-backdrop"
            role="presentation"
            onClick={() => setActiveVideo(null)}
          >
            <div
              className="modal-card unit-video-modal-card"
              role="dialog"
              aria-modal="true"
              aria-label={activeVideo.title}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="unit-video-modal-head">
                <h3>{activeVideo.title}</h3>
                <div>
                  <a href={activeVideo.url} target="_blank" rel="noreferrer">
                    Open video URL
                  </a>
                  <button
                    className="unit-video-close-button"
                    type="button"
                    onClick={() => setActiveVideo(null)}
                    aria-label="Close video"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="unit-video-frame-wrap">
                <iframe
                  src={getEmbeddableVideoUrl(activeVideo.url)}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
      {previewGraphic ? (
        <ModalPortal>
          <div className="modal-backdrop resource-preview-modal-backdrop" role="presentation" onClick={() => setPreviewGraphic(null)}>
            <div
              className="modal-card resource-file-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="unit-graphic-preview-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="resource-file-preview-head">
                <div>
                  <h3 id="unit-graphic-preview-title">{previewGraphic.title}</h3>
                  <p>{previewGraphic.description || previewGraphic.fileName || "Unit file"}</p>
                </div>
                <div className="resource-file-preview-actions">
                  <button
                    type="button"
                    className="resource-file-preview-icon-button"
                    aria-label={`Download ${previewGraphic.title}`}
                    onClick={downloadPreviewGraphic}
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    className="resource-file-preview-icon-button"
                    aria-label="Close preview"
                    onClick={() => setPreviewGraphic(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="resource-file-preview-body">
                {isPreviewLoading ? (
                  <div className="resource-file-preview-loader" aria-live="polite">
                    <Loader2 size={24} className="spin" />
                    <span>Loading...</span>
                  </div>
                ) : null}
                {getGraphicPreviewType(previewGraphic.fileName) === "pdf" ? (
                  <iframe
                    className="resource-file-preview-frame"
                    src={getGraphicPreviewUrl(previewGraphic)}
                    title={previewGraphic.title}
                    onLoad={() => setIsPreviewLoading(false)}
                  />
                ) : (
                  <img
                    className="resource-file-preview-image"
                    src={getGraphicPreviewUrl(previewGraphic)}
                    alt={previewGraphic.title}
                    onLoad={() => setIsPreviewLoading(false)}
                    onError={() => setIsPreviewLoading(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </section>
  );
}

function UnitVideoCard({
  title,
  meta,
  description,
  url,
  onOpen
}: {
  title: string;
  meta: string;
  description: string;
  url?: string | null;
  onOpen: (video: { title: string; url: string }) => void;
}) {
  const hasVideo = Boolean(url);

  return (
    <button
      className="unit-video-card"
      type="button"
      disabled={!hasVideo}
      onClick={() => {
        if (url) {
          onOpen({ title, url });
        }
      }}
    >
      <span><Play size={18} fill="currentColor" /></span>
      <small>{meta}</small>
      <strong>{title}</strong>
      <p>{description}</p>
    </button>
  );
}

function getEmbeddableVideoUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (url.hostname.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).at(-1);

      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

function getFallbackPassage(index: number) {
  const passages = ["Luke 4:1-30", "Luke 5:12-32", "Luke 7:1-23", "Luke 8:22-39"];

  return passages[index % passages.length];
}
