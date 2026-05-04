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

function buildBrandCss() {
  return `
    @page {
      margin: 16mm 14mm 22mm;
    }

    :root {
      --navy: #143d74;
      --blue: #2f92ff;
      --sky: #31d1ff;
      --yellow: #ffe98d;
      --gold: #ffcb3f;
      --orange: #ff8d2f;
      --cream: #fffdf0;
      --ink: #20324d;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "Avenir Next Rounded", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(255,255,214,0.92), transparent 30%),
        radial-gradient(circle at bottom right, rgba(255,202,89,0.26), transparent 28%),
        linear-gradient(180deg, #fff7ba 0%, #ffe285 100%);
    }
    h1, h2, h3 { color: var(--navy); margin-top: 0; }
    p, li { line-height: 1.6; }
    .sheet {
      max-width: 960px;
      margin: 0 auto;
      padding: 28px 28px 140px;
    }
    .hero {
      position: relative;
      border-radius: 24px;
      padding: 28px 30px 30px;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.26), transparent 32%),
        linear-gradient(135deg, #1c7be0 0%, #2fc7d9 48%, #72dc74 100%);
      color: white;
      box-shadow: 0 18px 28px rgba(28, 57, 110, 0.18);
    }
    .hero h1, .hero p { color: white; }
    .hero-top {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 18px;
    }
    .hero-logo {
      flex: 0 0 auto;
      width: 118px;
      height: auto;
    }
    .hero-copy {
      min-width: 0;
    }
    .hero-copy h1 {
      margin-bottom: 10px;
      font-size: 2.3rem;
      line-height: 1.05;
    }
    .hero-copy p {
      margin: 0;
      font-size: 1rem;
    }
    .meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .pill {
      display: inline-flex;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.32);
      font-weight: 700;
    }
    .card {
      margin-top: 20px;
      padding: 24px;
      border-radius: 22px;
      background: rgba(255, 253, 240, 0.92);
      border: 2px solid rgba(255, 210, 80, 0.34);
      box-shadow: 0 16px 22px rgba(117, 80, 12, 0.1);
    }
    .card.alt {
      background: linear-gradient(135deg, rgba(255,245,204,0.94), rgba(236,247,255,0.92));
    }
    .page-corner-dog {
      position: fixed;
      right: 8px;
      bottom: 10px;
      width: 92px;
      height: auto;
      z-index: 1;
    }
    .page-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 8px;
      padding: 0 16mm;
      font-size: 11px;
      color: rgba(32, 50, 77, 0.72);
      text-align: center;
    }
    ul { padding-left: 22px; }
    .answer-box {
      min-height: 90px;
      border: 3px dashed rgba(20, 61, 116, 0.35);
      border-radius: 18px;
      background: rgba(255,255,255,0.72);
      margin-top: 12px;
    }
    .colour-box {
      min-height: 220px;
      border: 4px dashed rgba(255, 141, 47, 0.45);
      border-radius: 24px;
      background:
        radial-gradient(circle at 15% 15%, rgba(255,255,255,0.65), transparent 18%),
        linear-gradient(135deg, rgba(255,244,197,0.88), rgba(234,246,255,0.9));
      margin-top: 14px;
    }
    @media print {
      body { background: white; }
      .sheet { max-width: none; padding: 0; }
      .hero, .card { box-shadow: none; }
      .page-corner-dog { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `;
}

function buildTeacherGuideHtml(lesson: LessonPlan) {
  const logoPath = `${window.location.origin}/pdf-logo.png`;
  const createdYear = new Date().getFullYear();

  return `
    <html>
      <head>
        <title>${lesson.title}</title>
        <style>
          ${buildBrandCss()}
        </style>
      </head>
      <body>
        <div class="page-footer">Copyright. All rights reserved New Creation Kids ${createdYear}</div>
        <main class="sheet">
          <section class="hero">
            <div class="hero-top">
              <img src="${logoPath}" alt="New Creation Kids logo" class="hero-logo" />
              <div class="hero-copy">
                <h1>${lesson.title}</h1>
                <p>Teachers manual</p>
              </div>
            </div>
            <div class="meta">
              <span class="pill">Teachers manual</span>
              <span class="pill">New Creation Kids</span>
            </div>
          </section>

          <section class="card">
            <h2>Lesson overview</h2>
            <p>${lesson.lessonOverview}</p>
          </section>
          <section class="card alt">
            <h2>Teaching outline</h2>
            <ul>${lesson.teachingOutline.map((item) => `<li>${item}</li>`).join("")}</ul>
          </section>
          <section class="card">
            <h2>Discussion questions</h2>
            <ul>${lesson.discussionQuestions.map((item) => `<li>${item}</li>`).join("")}</ul>
          </section>
          <section class="card alt">
            <h2>Interactive activity</h2>
            <p>${lesson.interactiveActivity}</p>
          </section>
          <section class="card">
            <h2>Prayer and reflection</h2>
            <p>${lesson.prayerReflection}</p>
          </section>
          <section class="card alt">
            <h2>Assessment questions</h2>
            <ul>${lesson.assessmentQuestions.map((item) => `<li>${item}</li>`).join("")}</ul>
          </section>
          <section class="card">
            <h2>Teacher guide</h2>
            <p>${lesson.teacherGuide.replace(/\n/g, "<br />")}</p>
          </section>
        </main>
      </body>
    </html>
  `;
}

function buildSlidesHtml(lesson: LessonPlan) {
  return `
    <html>
      <head>
        <title>${lesson.title} Slides</title>
        <style>
          body { font-family: "Avenir Next Rounded", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif; margin: 0; background: #f6f8ff; }
          .slide { min-height: 100vh; padding: 72px; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
          .slide::before {
            content: "";
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at top left, rgba(255,255,255,0.45), transparent 30%);
            pointer-events: none;
          }
          .slide:nth-child(3n + 1) { background: linear-gradient(135deg, #fff4b8, #ffce52); }
          .slide:nth-child(3n + 2) { background: linear-gradient(135deg, #dcf3ff, #97c7ff); }
          .slide:nth-child(3n + 3) { background: linear-gradient(135deg, #efe3ff, #b08cff); }
          .slide-badge {
            display: inline-flex;
            width: fit-content;
            padding: 10px 16px;
            border-radius: 999px;
            background: rgba(255,255,255,0.74);
            color: #143d74;
            font-weight: 800;
            margin-bottom: 18px;
          }
          h1 { font-size: 54px; margin: 0 0 24px; color: #143d74; line-height: 1; }
          p { font-size: 32px; line-height: 1.35; color: #20324d; max-width: 18ch; }
        </style>
      </head>
      <body>
        ${lesson.slidesOutline
          .map(
            (slide, index) => `
              <section class="slide">
                <span class="slide-badge">New Creation Kids</span>
                <h1>Slide ${index + 1}</h1>
                <p>${slide}</p>
              </section>
            `
          )
          .join("")}
      </body>
    </html>
  `;
}

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

function buildWorksheetHtml(lesson: LessonPlan) {
  const logoPath = `${window.location.origin}/pdf-logo.png`;
  const dogPath = `${window.location.origin}/pdf-dog.png`;
  const createdYear = new Date().getFullYear();

  return `
    <html>
      <head>
        <title>${lesson.title} Worksheet</title>
        <style>
          ${buildBrandCss()}
        </style>
      </head>
      <body>
        <img src="${dogPath}" alt="" class="page-corner-dog" />
        <div class="page-footer">Copyright. All rights reserved New Creation Kids ${createdYear}</div>
        <main class="sheet">
          <section class="hero">
            <div class="hero-top">
              <img src="${logoPath}" alt="New Creation Kids logo" class="hero-logo" />
              <div class="hero-copy">
                <h1>${lesson.title}</h1>
                <p>Kids worksheet</p>
              </div>
            </div>
            <div class="meta">
              <span class="pill">Fill in</span>
              <span class="pill">Draw and colour</span>
            </div>
          </section>

          <section class="card">
            <h2>Big idea</h2>
            <p>${lesson.lessonOverview}</p>
          </section>

          <section class="card alt">
            <h2>Think and write</h2>
            ${lesson.discussionQuestions
              .slice(0, 3)
              .map(
                (question) => `
                  <div style="margin-bottom: 22px;">
                    <strong>${question}</strong>
                    <div class="answer-box"></div>
                  </div>
                `
              )
              .join("")}
          </section>

          <section class="card">
            <h2>Prayer and reflection</h2>
            <p>${lesson.prayerReflection}</p>
            <div class="answer-box"></div>
          </section>

          <section class="card alt">
            <h2>Draw and colour</h2>
            <p>Draw a picture that shows the main Bible truth from today’s lesson.</p>
            <div class="colour-box"></div>
          </section>
        </main>
      </body>
    </html>
  `;
}

function triggerHtmlDownload(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printHtmlDocument(html: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;

  if (!frameWindow) {
    frame.remove();
    return false;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  frame.onload = () => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  };

  return true;
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
                onClick={() => {
                  if (!lesson) {
                    return;
                  }

                  const didOpen = printHtmlDocument(buildTeacherGuideHtml(lesson));
                  setMessage(
                    didOpen
                      ? "Print dialog opened. Choose Save as PDF to export the teacher guide."
                      : "Could not open the print dialog."
                  );
                }}
              >
                <Download size={16} />
                <span>Teachers manual (PDF)</span>
              </button>
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
                onClick={() => {
                  if (!lesson) {
                    return;
                  }

                  const didOpen = printHtmlDocument(buildWorksheetHtml(lesson));
                  setMessage(
                    didOpen
                      ? "Print dialog opened. Choose Save as PDF to export the kids worksheet."
                      : "Could not open the print dialog."
                  );
                }}
              >
                <Download size={16} />
                <span>Kids worksheets (PDF)</span>
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
