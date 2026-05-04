import type { Resource } from "@/types";

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="resource-card">
      <div className="resource-meta">
        <span className="pill">{resource.yearCycle ?? "Year A"}</span>
        <span className="pill">{resource.term ?? "Term 1"}</span>
        {resource.scripture ? <span className="pill">{resource.scripture}</span> : null}
      </div>
      <h3>
        Lesson #{resource.lessonNumber ?? 1} - {resource.title}
      </h3>
      <div
        className="resource-html"
        dangerouslySetInnerHTML={{ __html: resource.description }}
      />
    </article>
  );
}
