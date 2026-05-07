"use client";

import Link from "next/link";
import { BookOpenText, ChevronDown, FileText, Gamepad2, Music4, Video } from "lucide-react";
import { useMemo, useState } from "react";

import type { CurriculumTermNote, LessonResourceType, Resource } from "@/types";

const yearTabs = ["Year A", "Year B", "Year C"] as const;
const termOrder = ["Term 1", "Term 2", "Term 3", "Term 4"] as const;

type Props = {
  resources: Resource[];
  termNotes: CurriculumTermNote[];
};

export function ResourceLibrary({ resources, termNotes }: Props) {
  const [selectedYear, setSelectedYear] = useState<(typeof yearTabs)[number]>("Year A");
  const [selectedTerm, setSelectedTerm] = useState<(typeof termOrder)[number]>("Term 1");

  const resourcesByTerm = useMemo(
    () =>
      termOrder.map((term) => ({
        term,
        entries: resources
          .filter(
            (resource) =>
              (resource.yearCycle ?? "Year A") === selectedYear &&
              (resource.term ?? "Term 1") === term
          )
          .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0))
      })),
    [resources, selectedYear]
  );

  const activeTermNote = useMemo(
    () =>
      termNotes.find((note) => note.yearCycle === selectedYear && note.term === selectedTerm)?.content ?? "",
    [termNotes, selectedTerm, selectedYear]
  );

  return (
    <>
      <section className="panel resource-filter-panel">
        <div className="section-head app-page-head">
          <div>
            <h1>Lessons</h1>
            <p>Browse New Creation Kids by year, term, lesson summary, description, and uploaded resources.</p>
          </div>
        </div>
      </section>

      <section className="resource-browser-layout">
        <aside className="panel resource-side-menu" aria-label="Lessons">
          <div className="resource-side-menu-title">
            <BookOpenText size={18} />
            <span>Lessons</span>
          </div>
          {yearTabs.map((year) => (
            <div key={year} className="resource-side-year">
              <button
                type="button"
                className={`resource-side-year-button ${selectedYear === year ? "resource-side-year-button-active" : ""}`}
                onClick={() => setSelectedYear(year)}
              >
                <span>{year}</span>
                <ChevronDown size={16} />
              </button>
              <div className="resource-side-term-list">
                {termOrder.map((term) => (
                  <button
                    key={`${year}-${term}`}
                    type="button"
                    aria-current={selectedYear === year && selectedTerm === term ? "page" : undefined}
                    className={`resource-side-term-button ${
                      selectedYear === year && selectedTerm === term ? "resource-side-term-button-active" : ""
                    }`}
                    onClick={() => {
                      setSelectedYear(year);
                      setSelectedTerm(term);
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="panel resource-list-panel">
          <div className="resource-selected-head">
            <span className="eyebrow">{selectedYear}</span>
            <h2>{selectedTerm}</h2>
          </div>
          {resourcesByTerm.some((group) => group.term === selectedTerm && (group.entries.length || activeTermNote)) ? (
            <div className="resource-term-stack">
              {resourcesByTerm.map((group) =>
                group.term === selectedTerm ? (
                  <section key={group.term} className="resource-term-section">
                    {activeTermNote ? (
                      <div className="resource-term-note">
                        <div className="resource-html" dangerouslySetInnerHTML={{ __html: activeTermNote }} />
                      </div>
                    ) : null}
                    {group.entries.length ? (
                    <div className="curriculum-list">
                      {group.entries.map((resource) => {
                        const attachmentTypes = [
                          ...new Set((resource.attachments ?? []).map((attachment) => attachment.type))
                        ];

                        return (
                        <article key={resource.id} className="curriculum-row">
                          <div className="curriculum-row-copy">
                            <Link href={`/resources/${resource.id}`} className="curriculum-row-title">
                              <span>
                                Lesson #{resource.lessonNumber ?? 1} - {resource.title}
                                {resource.scripture ? (
                                  <span className="curriculum-resource-scripture-inline">
                                    {" "}
                                    ({resource.scripture})
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          </div>
                          {attachmentTypes.length ? (
                            <div className="curriculum-row-icons" aria-label="Lesson resources">
                              {attachmentTypes.map((type) => (
                                <span className="curriculum-row-icon" key={type} title={getResourceTypeLabel(type)}>
                                  <ResourceTypeIcon type={type} size={17} />
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                        );
                      })}
                    </div>
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

function getResourceTypeLabel(type: LessonResourceType) {
  switch (type) {
    case "game":
      return "Game";
    case "music":
      return "Music";
    case "video":
      return "Video";
    case "pdf":
    default:
      return "PDF";
  }
}

function ResourceTypeIcon({ type, size }: { type: LessonResourceType; size: number }) {
  if (type === "game") {
    return <Gamepad2 size={size} />;
  }

  if (type === "music") {
    return <Music4 size={size} />;
  }

  if (type === "video") {
    return <Video size={size} />;
  }

  return <FileText size={size} />;
}
