import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { ResourceEntryContent } from "@/components/resource-entry-content";
import { ResourceVisitTracker } from "@/components/resource-visit-tracker";
import { formatLessonContentHtml } from "@/lib/resource-content";
import { getMemberAccessSnapshot } from "@/lib/portal";
import { getPublicResources } from "@/lib/public-resources";
import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { trackLastAccessedResource } from "@/lib/dashboard-state";

type Props = {
  params: Promise<{
    resourceId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resourceId } = await params;
  const resources = await getPublicResources();
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

  const lessonLabel = `Week ${resource.lessonNumber ?? 1} - ${resource.title}`;
  const year = normalizeCurriculumYear(resource.yearCycle);
  const term = normalizeCurriculumSection(resource.term);
  const description = resource.scripture
    ? `${resource.scripture} · ${year} · ${term}`
    : `${year} · ${term} curriculum lesson`;

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
  const [resources, access] = await Promise.all([
    getPublicResources(),
    getMemberAccessSnapshot()
  ]);
  const resource = resources.find((entry) => entry.id === resourceId);

  if (!resource) {
    notFound();
  }

  if (access.user && !access.hasActiveAccount) {
    redirect("/account");
  }

  if (access.user && access.hasActiveAccount) {
    await trackLastAccessedResource(resource.id);
  }

  const year = normalizeCurriculumYear(resource.yearCycle);
  const term = normalizeCurriculumSection(resource.term);
  const canDownload = Boolean(access.user && access.hasActiveAccount);
  const loginHref = `/login?next=${encodeURIComponent(`/resources/${resource.id}`)}` as Route;
  const sameSectionResources = resources
    .filter(
      (entry) =>
        normalizeCurriculumYear(entry.yearCycle) === year &&
        normalizeCurriculumSection(entry.term) === term
    )
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));
  const currentIndex = sameSectionResources.findIndex((entry) => entry.id === resource.id);
  const previousLesson = currentIndex >= 0 ? sameSectionResources[currentIndex - 1] ?? null : null;
  const nextLesson = currentIndex >= 0 ? sameSectionResources[currentIndex + 1] ?? null : null;
  const resourcesHref = `/resources?year=${encodeURIComponent(year)}&section=${encodeURIComponent(term)}` as Route;

  return (
    <main className="site-shell section">
      {access.user && access.hasActiveAccount ? <ResourceVisitTracker resourceId={resource.id} /> : null}
      <section className="resource-browser-layout">
        <article className="panel resource-entry-panel">
          <ResourceEntryContent
            canAccessPodcast={canDownload}
            canDownload={canDownload}
            descriptionHtml={formatLessonContentHtml(resource.description)}
            loginHref={loginHref}
            nextLesson={nextLesson}
            previousLesson={previousLesson}
            resource={resource}
            resourcesHref={resourcesHref}
          />
        </article>
      </section>
    </main>
  );
}
