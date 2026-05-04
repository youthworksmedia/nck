"use client";

import Link from "next/link";
import { BookOpenText, ChevronDown, Download, FileText, Music4, NotebookPen } from "lucide-react";
import { useMemo, useState } from "react";

import type { CurriculumTermNote, Resource } from "@/types";

const yearTabs = ["Year A", "Year B", "Year C"] as const;
const termOrder = ["Term 1", "Term 2", "Term 3", "Term 4"] as const;

type Props = {
  resources: Resource[];
  termNotes: CurriculumTermNote[];
};

export function ResourceLibrary({ resources, termNotes }: Props) {
  const [selectedYear, setSelectedYear] = useState<(typeof yearTabs)[number]>("Year A");
  const [selectedTerm, setSelectedTerm] = useState<(typeof termOrder)[number]>("Term 1");
  const [downloadKind, setDownloadKind] = useState<"manual" | "workbook" | null>(null);
  const [customSelection, setCustomSelection] = useState<{
    year: (typeof yearTabs)[number];
    term: (typeof termOrder)[number];
    ids: string[];
  } | null>(null);

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

  async function downloadCustomPack(kind: "manual" | "workbook", year: string, term: string, ids: string[]) {
    setDownloadKind(kind);
    const href = `/api/resources/custom-pack?kind=${encodeURIComponent(kind)}&year=${encodeURIComponent(year)}&term=${encodeURIComponent(term)}&ids=${encodeURIComponent(ids.join(","))}`;
    const link = document.createElement("a");

    link.href = href;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      setDownloadKind((current) => (current === kind ? null : current));
    }, 3000);
  }

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
                      {group.entries.map((resource) => (
                        <article key={resource.id} className="curriculum-row">
                          <label className="curriculum-row-select">
                            {(() => {
                              const isSelectable = Boolean(
                                resource.manualFilePath ||
                                  resource.manualFileName ||
                                  resource.worksheetFilePath ||
                                  resource.worksheetFileName
                              );

                              return (
                            <input
                              type="checkbox"
                              disabled={!isSelectable}
                              checked={Boolean(
                                isSelectable &&
                                customSelection &&
                                  customSelection.year === selectedYear &&
                                  customSelection.term === group.term &&
                                  customSelection.ids.includes(resource.id)
                              )}
                              onChange={(event) => {
                                setCustomSelection((current) => {
                                  const isSameGroup =
                                    current &&
                                    current.year === selectedYear &&
                                    current.term === group.term;
                                  const currentIds = isSameGroup ? current.ids : [];

                                  const nextIds = event.target.checked
                                    ? [...currentIds, resource.id]
                                    : currentIds.filter((id) => id !== resource.id);

                                  if (!nextIds.length) {
                                    return null;
                                  }

                                  return {
                                    year: selectedYear,
                                    term: group.term,
                                    ids: nextIds
                                  };
                                });
                              }}
                              aria-label={
                                isSelectable
                                  ? `Select ${resource.title} for a custom pack`
                                  : `No manual or worksheet available for ${resource.title}`
                              }
                            />
                              );
                            })()}
                          </label>
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
                            <div className="curriculum-resource-meta">
                              {resource.manualFilePath || resource.manualFileName ? (
                                <span className="pill">
                                  <NotebookPen size={14} /> Manual
                                </span>
                              ) : null}
                              {resource.worksheetFilePath || resource.worksheetFileName ? (
                                <span className="pill">
                                  <FileText size={14} /> Worksheet
                                </span>
                              ) : null}
                              {resource.musicFilePath || resource.musicFileName ? (
                                <span className="pill">
                                  <Music4 size={14} /> Music
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    ) : (
                      <p className="resource-empty">
                        No curriculum entries have been added for {selectedYear} {selectedTerm} yet.
                      </p>
                    )}
                    {customSelection &&
                    customSelection.year === selectedYear &&
                    customSelection.term === group.term &&
                    customSelection.ids.length ? (
                      <div className="curriculum-custom-pack">
                        <p>
                          {customSelection.ids.length} lesson{customSelection.ids.length === 1 ? "" : "s"} selected.
                          Create your own customised lesson manual and worksheet for the term.
                        </p>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button button-primary"
                            disabled={downloadKind !== null}
                            onClick={() =>
                              downloadCustomPack("manual", selectedYear, group.term, customSelection.ids)
                            }
                          >
                            <Download size={16} />
                            <span>{downloadKind === "manual" ? "Manuals (PDF)..." : "Manuals (PDF)"}</span>
                          </button>
                          <button
                            type="button"
                            className="button button-primary"
                            disabled={downloadKind !== null}
                            onClick={() =>
                              downloadCustomPack("workbook", selectedYear, group.term, customSelection.ids)
                            }
                          >
                            <Download size={16} />
                            <span>{downloadKind === "workbook" ? "Worksheets (PDF)..." : "Worksheets (PDF)"}</span>
                          </button>
                        </div>
                      </div>
                    ) : null}
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
