import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Gamepad2, Music4, Video } from "lucide-react";

import { PrintResourceButton } from "@/components/print-resource-button";
import { formatLessonContentHtml } from "@/lib/resource-content";
import { getResources } from "@/lib/portal";
import type { LessonResourceType } from "@/types";

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
        <div className="resource-entry-layout">
          <div
            className="resource-html"
            dangerouslySetInnerHTML={{ __html: formatLessonContentHtml(resource.description) }}
          />
          <aside className="resource-entry-files" aria-label="Lesson resources">
            <h2>Resources</h2>
            {resource.attachments?.length ? (
              <div className="resource-entry-file-list">
                {resource.attachments.map((attachment) => (
                  <div className="resource-entry-file-card" key={attachment.id}>
                    <div className="resource-entry-file-copy">
                      <span className="resource-entry-file-icon" aria-hidden="true">
                        <ResourceTypeIcon type={attachment.type} size={18} />
                      </span>
                      <span>{attachment.name}</span>
                    </div>
                    <a
                      href={`/api/resources/${resource.id}/download?asset=${encodeURIComponent(attachment.id)}`}
                      className="button button-primary resource-entry-download-button"
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p>No files have been added to this lesson yet.</p>
            )}
          </aside>
        </div>
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
