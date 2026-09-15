import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import type { Resource } from "@/types";

export function ResourceCard({ resource }: { resource: Resource }) {
  const year = normalizeCurriculumYear(resource.yearCycle);
  const term = normalizeCurriculumSection(resource.term);

  return (
    <article className="resource-card">
      <div className="resource-meta">
        <span className="pill">{year}</span>
        <span className="pill">{term}</span>
        {resource.scripture ? <span className="pill">{resource.scripture}</span> : null}
      </div>
      <h3>
        Week {resource.lessonNumber ?? 1} - {resource.title}
      </h3>
      <div
        className="resource-html"
        dangerouslySetInnerHTML={{ __html: resource.description }}
      />
    </article>
  );
}
