import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Music4, NotebookPen } from "lucide-react";

import { PrintResourceButton } from "@/components/print-resource-button";
import { formatLessonContentHtml } from "@/lib/resource-content";
import { getResources } from "@/lib/portal";

type Props = {
  params: Promise<{
    resourceId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resourceId } = await params;
  const resources = await getResources();
  const resource = resources.find((entry) => entry.id === resourceId);

  if (!resource) {
    return {
      title: "Curriculum lesson",
      description: "View a curriculum lesson from the New Creation Kids library.",
      robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true
      }
    };
  }

  const lessonLabel = `Lesson #${resource.lessonNumber ?? 1} - ${resource.title}`;
  const description = resource.scripture
    ? `${resource.scripture} · ${resource.yearCycle ?? "Year A"} · ${resource.term ?? "Term 1"}`
    : `${resource.yearCycle ?? "Year A"} · ${resource.term ?? "Term 1"} curriculum lesson`;

  return {
    title: lessonLabel,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true
    }
  };
}

export default async function ResourceEntryPage({ params }: Props) {
  const { resourceId } = await params;
  const resources = await getResources();
  const resource = resources.find((entry) => entry.id === resourceId);

  if (!resource) {
    notFound();
  }

  return (
    <main className="site-shell section">
      <section className="panel resource-entry-panel">
        <div className="section-head app-page-head">
          <div>
            <span className="eyebrow">{resource.yearCycle ?? "Year A"} · {resource.term ?? "Term 1"}</span>
            <h1>
              Lesson #{resource.lessonNumber ?? 1} - {resource.title}
            </h1>
            {resource.scripture ? <p className="resource-entry-scripture">{resource.scripture}</p> : null}
          </div>
        </div>
        <div className="button-row resource-download-row">
          {resource.manualFilePath ? (
            <a href={`/api/resources/${resource.id}/download?asset=manual`} className="button button-primary">
              <NotebookPen size={16} />
              <span>Manual</span>
            </a>
          ) : null}
          {resource.worksheetFilePath ? (
            <a href={`/api/resources/${resource.id}/download?asset=worksheet`} className="button button-primary">
              <FileText size={16} />
              <span>Worksheet</span>
            </a>
          ) : null}
          {resource.musicFilePath ? (
            <a href={`/api/resources/${resource.id}/download?asset=music`} className="button button-primary">
              <Music4 size={16} />
              <span>Music</span>
            </a>
          ) : null}
        </div>
        <div
          className="resource-html"
          dangerouslySetInnerHTML={{ __html: formatLessonContentHtml(resource.description) }}
        />
        <div className="resource-entry-back resource-entry-actions-bottom">
          <Link href="/resources" className="button button-secondary">
            <ArrowLeft size={16} />
            Back to Curriculum Library
          </Link>
          <PrintResourceButton />
        </div>
      </section>
    </main>
  );
}
