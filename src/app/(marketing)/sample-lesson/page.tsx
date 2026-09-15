import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Gamepad2, Music4, Video } from "lucide-react";

import { PendingActionLink } from "@/components/pending-action-link";
import { formatLessonContentHtml } from "@/lib/resource-content";
import { buildPublicMetadata } from "@/lib/metadata";
import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { getPublicSampleResource } from "@/lib/public-resources";
import type { LessonResourceType } from "@/types";

export const metadata: Metadata = buildPublicMetadata({
  title: "Sample Lesson",
  description: "Preview a fully unlocked New Creation Kids sample lesson with downloadable files.",
  path: "/sample-lesson"
});

export default async function SampleLessonPage() {
  const resource = await getPublicSampleResource();

  if (!resource) {
    return (
      <main className="site-shell section">
        <section className="panel sample-lesson-panel">
          <span className="eyebrow">Sample lesson</span>
          <h1>Sample lesson coming soon</h1>
          <p>Once a published lesson is added, this page will show a fully unlocked preview.</p>
          <Link href="/resources" className="button button-primary">
            Preview curriculum
          </Link>
        </section>
      </main>
    );
  }

  const year = normalizeCurriculumYear(resource.yearCycle);
  const term = normalizeCurriculumSection(resource.term);

  return (
    <main className="site-shell section sample-lesson-page">
      <section className="panel sample-lesson-hero">
        <div>
          <span className="eyebrow">Fully unlocked sample lesson</span>
          <h1>
            Week {resource.lessonNumber ?? 1} - {resource.title}
          </h1>
          <p>{resource.scripture ? `${resource.scripture} · ` : ""}{year} · {term}</p>
        </div>
        <Link href="/#subscription-plans" className="button button-primary">
          View membership
        </Link>
      </section>

      <section className="panel resource-entry-panel sample-lesson-panel">
        <div className="resource-entry-layout">
          <div
            className="resource-html resource-entry-description"
            dangerouslySetInnerHTML={{ __html: formatLessonContentHtml(resource.description) }}
          />
          <aside className="resource-entry-files" aria-label="Sample lesson resources">
            <h2>Sample downloads</h2>
            <p className="resource-preview-note">
              These files are unlocked so your church can see the quality before signing up.
            </p>
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
                    <PendingActionLink
                      href={`/api/sample-lesson/${resource.id}/download?asset=${encodeURIComponent(attachment.id)}`}
                      className="button button-primary resource-entry-download-button"
                      loadingLabel="Preparing..."
                    >
                      <Download size={16} />
                      <span>Download sample</span>
                    </PendingActionLink>
                  </div>
                ))}
              </div>
            ) : (
              <p>No sample files have been added to this lesson yet.</p>
            )}
          </aside>
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
