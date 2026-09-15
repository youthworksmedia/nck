import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoPrint } from "@/components/auto-print";
import { PrintResourceButton } from "@/components/print-resource-button";
import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getResources } from "@/lib/portal";
import { formatLessonContentHtml } from "@/lib/resource-content";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Custom Pack",
  description: "Print a combined custom manual or worksheet pack from selected curriculum lessons."
});

type Props = {
  searchParams: Promise<{
    kind?: string;
    ids?: string;
    year?: string;
    term?: string;
    autoprint?: string;
  }>;
};

function cleanIds(ids: string | undefined) {
  return (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export default async function CustomPackPage({ searchParams }: Props) {
  const params = await searchParams;
  const kind = params.kind === "workbook" ? "workbook" : params.kind === "manual" ? "manual" : null;
  const ids = cleanIds(params.ids);
  const year = normalizeCurriculumYear(params.year);
  const term = normalizeCurriculumSection(params.term);
  const shouldAutoPrint = params.autoprint === "1";

  if (!kind || !ids.length) {
    notFound();
  }

  const resources = await getResources();
  const selectedResources = ids
    .map((id) => resources.find((resource) => resource.id === id))
    .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource))
    .filter(
      (resource) =>
        normalizeCurriculumYear(resource.yearCycle) === year &&
        normalizeCurriculumSection(resource.term) === term
    )
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));

  if (!selectedResources.length) {
    notFound();
  }

  return (
    <main className={`site-shell section custom-pack-page ${kind === "workbook" ? "custom-pack-workbook" : ""}`}>
      {shouldAutoPrint ? <AutoPrint /> : null}
      <section className="panel custom-pack-panel">
        <div className="resource-entry-back print-hidden">
          <Link href="/resources" className="button button-secondary">
            Back to Curriculum Library
          </Link>
          <PrintResourceButton />
        </div>

        <div className="custom-pack-head">
          <span className="eyebrow">{year} · {term}</span>
          <h1>{kind === "manual" ? "Custom Manual" : "Custom Workbooks"}</h1>
          <p>
            {selectedResources.length} selected lesson{selectedResources.length === 1 ? "" : "s"} combined into one{" "}
            {kind === "manual" ? "teacher manual" : "student workbook"}.
          </p>
        </div>

        <div className="custom-pack-stack">
          {selectedResources.map((resource) => (
            <article key={resource.id} className="custom-pack-lesson">
              <header className="custom-pack-lesson-head">
                <h2>
                  Week {resource.lessonNumber ?? 1} - {resource.title}
                </h2>
                {resource.scripture ? <p>{resource.scripture}</p> : null}
              </header>

              {kind === "manual" ? (
                <div
                  className="resource-html"
                  dangerouslySetInnerHTML={{ __html: formatLessonContentHtml(resource.description) }}
                />
              ) : (
                <div className="custom-workbook-blocks">
                  <div className="custom-workbook-card">
                    <h3>Key idea</h3>
                    <div className="custom-workbook-lines" />
                  </div>
                  <div className="custom-workbook-card">
                    <h3>What did I learn?</h3>
                    <div className="custom-workbook-lines" />
                  </div>
                  <div className="custom-workbook-card">
                    <h3>Prayer or reflection</h3>
                    <div className="custom-workbook-lines" />
                  </div>
                  <div className="custom-workbook-card custom-workbook-draw">
                    <h3>Draw or design something from this lesson</h3>
                    <div className="custom-workbook-canvas" />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
