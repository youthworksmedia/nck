"use client";

import { ChevronDown, Download, FolderOpen, Save, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { LessonBuilderInput, LessonPlan, SavedLesson } from "@/types";

const emptyInput: LessonBuilderInput = {
  passage: "",
  ageGroup: "10-12",
  lessonLength: 45,
  learningGoal: "faith formation"
};

type SectionKey =
  | "lessonOverview"
  | "teachingOutline"
  | "discussionQuestions"
  | "interactiveActivity"
  | "prayerReflection"
  | "assessmentQuestions"
  | "slidesOutline"
  | "teacherGuide";

async function exportSlidesPptx(lesson: LessonPlan) {
  const response = await fetch("/api/lesson-builder/export/slides", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lesson })
  });

  if (!response.ok) {
    throw new Error("Could not export slides.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${lesson.title}.pptx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportTeacherManualDocx(lesson: LessonPlan) {
  const response = await fetch("/api/lesson-builder/export/teacher-guide", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lesson })
  });

  if (!response.ok) {
    throw new Error("Could not export teacher manual.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${lesson.title}-teacher-manual.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


export function LessonBuilderDashboard({ savedLessons }: { savedLessons: SavedLesson[] }) {
  const router = useRouter();
  const [input, setInput] = useState<LessonBuilderInput>(emptyInput);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);
  const [isSharedLesson, setIsSharedLesson] = useState(false);
  const [isEditableLesson, setIsEditableLesson] = useState(true);
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<SectionKey | null>(null);

  const hasLesson = Boolean(lesson);

  async function callBuilder(payload: Record<string, unknown>) {
    const response = await fetch("/api/lesson-builder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not build lesson.");
    }

    setMessage(
      data.usedFallback
        ? "Lesson generated in local fallback mode. Add OPENAI_API_KEY for live resource generation."
        : "Lesson generated."
    );

    return data.lesson as LessonPlan;
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setMessage("");

    try {
      const nextLesson = await callBuilder({
        mode: "generate",
        input
      });

      setSavedLessonId(null);
      setIsSharedLesson(false);
      setIsEditableLesson(true);
      setLesson(nextLesson);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate lesson.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function regenerateSection(section: SectionKey) {
    if (!lesson) {
      return;
    }

    setRegeneratingSection(section);
    setMessage("");

    try {
      const nextLesson = await callBuilder({
        mode: "regenerate",
        input,
        section,
        currentLesson: lesson
      });

      setLesson(nextLesson);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not regenerate section.");
    } finally {
      setRegeneratingSection(null);
    }
  }

  async function saveLesson() {
    if (!lesson) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/lesson-builder/saved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: savedLessonId ?? undefined,
          isShared: isSharedLesson,
          input,
          lesson
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Could not save lesson.");
      }

      setMessage(payload.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save lesson.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLesson(lessonId: string) {
    setDeletingLessonId(lessonId);
    setMessage("");

    try {
      const response = await fetch(`/api/lesson-builder/saved/${lessonId}`, {
        method: "DELETE"
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Could not delete lesson.");
      }

      if (savedLessonId === lessonId) {
        setSavedLessonId(null);
        setLesson(null);
        setInput(emptyInput);
        setIsSharedLesson(false);
        setIsEditableLesson(true);
      }

      setMessage(payload.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete lesson.");
    } finally {
      setDeletingLessonId(null);
    }
  }

  function loadSavedLesson(savedLesson: SavedLesson) {
    setSavedLessonId(savedLesson.id);
    setInput(savedLesson.input);
    setLesson(savedLesson.lesson);
    setIsSharedLesson(savedLesson.isShared);
    setIsEditableLesson(savedLesson.isEditable);
    setMessage(
      savedLesson.isEditable
        ? "Saved lesson loaded."
        : `Shared lesson loaded. Created by ${savedLesson.createdByEmail}.`
    );
  }

  const outputSections = useMemo(
    () =>
      lesson
        ? [
            {
              key: "lessonOverview" as const,
              title: "Lesson overview",
              kind: "text" as const,
              value: lesson.lessonOverview
            },
            {
              key: "teachingOutline" as const,
              title: "Teaching outline",
              kind: "list" as const,
              value: lesson.teachingOutline.join("\n")
            },
            {
              key: "discussionQuestions" as const,
              title: "Discussion questions",
              kind: "list" as const,
              value: lesson.discussionQuestions.join("\n")
            },
            {
              key: "interactiveActivity" as const,
              title: "Interactive activity",
              kind: "text" as const,
              value: lesson.interactiveActivity
            },
            {
              key: "prayerReflection" as const,
              title: "Prayer / reflection",
              kind: "text" as const,
              value: lesson.prayerReflection
            },
            {
              key: "assessmentQuestions" as const,
              title: "Assessment questions",
              kind: "list" as const,
              value: lesson.assessmentQuestions.join("\n")
            },
            {
              key: "slidesOutline" as const,
              title: "Slides",
              kind: "list" as const,
              value: lesson.slidesOutline.join("\n")
            },
            {
              key: "teacherGuide" as const,
              title: "Printable teacher guide",
              kind: "text" as const,
              value: lesson.teacherGuide
            }
          ]
        : [],
    [lesson]
  );

  return (
    <main className="site-shell section">
      <div className="section-head app-page-head lesson-builder-head">
        <div>
          <h1>New lesson tools</h1>
          <p>Generate a complete lesson plan from a Bible passage, then edit and export it.</p>
        </div>
      </div>

      <section className="panel lesson-builder-panel">
        <div className="lesson-builder-form">
          <label className="admin-field-label" htmlFor="lesson-passage">
            Bible passage *
          </label>
          <input
            id="lesson-passage"
            value={input.passage}
            onChange={(event) => setInput((current) => ({ ...current, passage: event.target.value }))}
            placeholder="John 3:16-21"
          />

          <div className="admin-inline-row lesson-builder-inline">
            <label className="admin-field-label" htmlFor="lesson-age-group">
              Age group *
            </label>
            <input
              id="lesson-age-group"
              value={input.ageGroup}
              onChange={(event) => setInput((current) => ({ ...current, ageGroup: event.target.value }))}
              placeholder="10-12"
            />

            <label className="admin-field-label" htmlFor="lesson-length">
              Lesson length *
            </label>
            <select
              id="lesson-length"
              value={input.lessonLength}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  lessonLength: Number(event.target.value) as 30 | 45 | 60
                }))
              }
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>

            <label className="admin-field-label" htmlFor="lesson-goal">
              Learning goal *
            </label>
            <select
              id="lesson-goal"
              value={input.learningGoal}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  learningGoal: event.target.value as LessonBuilderInput["learningGoal"]
                }))
              }
            >
              <option value="faith formation">Faith formation</option>
              <option value="discussion">Discussion</option>
              <option value="apologetics">Apologetics</option>
              <option value="character">Character</option>
            </select>
          </div>

          <div className="button-row">
            <button
              type="button"
              className={`button button-primary lesson-generate-button${isGenerating ? " is-generating" : ""}`}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles size={16} />
              <span>{isGenerating ? "Generating..." : "Generate lesson"}</span>
            </button>
          </div>
          {isGenerating ? (
            <p className="lesson-builder-generating-note">Generating... hang tight, this takes a moment.</p>
          ) : null}

          {hasLesson && isEditableLesson ? (
            <div className="lesson-save-block">
              <hr className="lesson-title-rule" />
              <h3 className="lesson-action-heading">{lesson?.title}</h3>
              <div className="button-row lesson-save-row">
                <button
                  type="button"
                  className="button button-secondary lesson-save-button"
                  onClick={saveLesson}
                  disabled={isSaving}
                >
                  <Save size={16} />
                  <span>{isSaving ? "Saving..." : savedLessonId ? "Save changes" : "Save lesson"}</span>
                </button>
                <label className="lesson-share-toggle">
                  <input
                    type="checkbox"
                    checked={isSharedLesson}
                    onChange={(event) => setIsSharedLesson(event.target.checked)}
                  />
                  <span>Share with group</span>
                </label>
              </div>
            </div>
          ) : null}

          {hasLesson && !isEditableLesson ? (
            <div className="button-row lesson-save-row">
              <span className="lesson-share-note">Shared lesson. Only the creator can edit or delete it.</span>
            </div>
          ) : null}

          {hasLesson ? (
            <div className="button-row lesson-export-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={async () => {
                  if (!lesson) {
                    return;
                  }

                  try {
                    await exportTeacherManualDocx(lesson);
                    setMessage("Teacher manual exported as DOCX.");
                  } catch {
                    setMessage("Could not export the teacher manual.");
                  }
                }}
              >
                <Download size={16} />
                <span>Teachers manual (Word)</span>
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={async () => {
                  if (!lesson) {
                    return;
                  }

                  try {
                    await exportSlidesPptx(lesson);
                    setMessage("PowerPoint slides exported.");
                  } catch {
                    setMessage("Could not export PowerPoint slides.");
                  }
                }}
              >
                <Download size={16} />
                <span>Slides (PPTX)</span>
              </button>
            </div>
          ) : null}

          {lesson ? (
            <details className="lesson-details-panel">
              <summary className="lesson-details-summary">
                <span className="lesson-details-icon">
                  <ChevronDown size={16} />
                </span>
                <span>More details about lesson</span>
              </summary>
              <section className="lesson-output-grid">
                {outputSections.map((section) => (
                  <article key={section.key} className="panel lesson-output-card">
                    <div className="lesson-output-head">
                      <h2>{section.title}</h2>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => regenerateSection(section.key)}
                        disabled={regeneratingSection === section.key || !isEditableLesson}
                      >
                        {regeneratingSection === section.key ? "Regenerating..." : "Regenerate section"}
                      </button>
                    </div>
                    <textarea
                      className="lesson-output-textarea"
                      value={section.value}
                      readOnly={!isEditableLesson}
                      onChange={(event) => {
                        if (!isEditableLesson) {
                          return;
                        }

                        const nextValue = event.target.value;

                        setLesson((current) => {
                          if (!current) {
                            return current;
                          }

                          if (section.kind === "list") {
                            const items = nextValue
                              .split("\n")
                              .map((entry) => entry.trim())
                              .filter(Boolean);

                            return {
                              ...current,
                              [section.key]: items
                            };
                          }

                          return {
                            ...current,
                            [section.key]: nextValue
                          };
                        });
                      }}
                    />
                  </article>
                ))}
              </section>
            </details>
          ) : null}

          {message ? <p className="lesson-builder-message">{message}</p> : null}
        </div>
      </section>

      <section className="panel lesson-builder-saved-panel">
        <div className="section-head">
          <div>
            <h2>Saved lessons</h2>
            <p>Open a saved lesson to keep editing where you left off.</p>
          </div>
        </div>
        <div className="stack-sm">
          {savedLessons.length ? (
            savedLessons.map((savedLesson) => (
              <article key={savedLesson.id} className="lesson-saved-row">
                <div>
                  <strong>{savedLesson.title}</strong>
                  <p>
                    {savedLesson.input.passage} · {savedLesson.input.ageGroup} years · {savedLesson.input.lessonLength} min · {savedLesson.input.learningGoal}
                  </p>
                  <p>
                    By {savedLesson.createdByName || savedLesson.createdByEmail}
                    {savedLesson.isShared ? " · Shared with group" : " · Private"}
                  </p>
                </div>
                <div className="button-row button-row-tight">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => loadSavedLesson(savedLesson)}
                  >
                    <FolderOpen size={16} />
                    <span>Open</span>
                  </button>
                  {savedLesson.isEditable ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete "${savedLesson.title}"?`);

                        if (!confirmed) {
                          return;
                        }

                        deleteLesson(savedLesson.id);
                      }}
                      disabled={deletingLessonId === savedLesson.id}
                    >
                      <Trash2 size={16} />
                      <span>{deletingLessonId === savedLesson.id ? "Deleting..." : "Delete"}</span>
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="lesson-builder-message">No saved lessons yet.</p>
          )}
        </div>
      </section>

    </main>
  );
}
