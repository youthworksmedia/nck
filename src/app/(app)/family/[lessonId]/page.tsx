import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";

import { FamilyLessonFiles, type FamilyLessonFileItem } from "@/components/family-lesson-files";
import { getPublishedFamilyResources } from "@/lib/family-resources";
import {
  normalizeCurriculumSection,
  normalizeCurriculumYear,
  type CurriculumSection
} from "@/lib/curriculum";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";
import { getPublicResources } from "@/lib/public-resources";

type FamilyLessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

type FamilyLesson = Awaited<ReturnType<typeof getPublishedFamilyResources>>["lessons"][number];

const sectionLabels: Record<number, string> = {
  1: "Unit 1",
  2: "Unit 2",
  3: "Unit 3",
  4: "Unit 4",
  5: "Holiday",
  6: "Advent"
};

const fileTypes = [
  {
    key: "discussion",
    title: "Discussion Guide",
    description: "Conversation prompts for families to continue the lesson at home.",
    getUrl: (lesson?: FamilyLesson | null) => lesson?.discussionUrl
  },
  {
    key: "activity",
    title: "Activity Sheet",
    description: "Printable activity content connected to this week's lesson.",
    getUrl: (lesson?: FamilyLesson | null) => lesson?.activityUrl
  },
  {
    key: "memory",
    title: "Memory Card",
    description: "A take-home memory verse card for children and families.",
    getUrl: (lesson?: FamilyLesson | null) => lesson?.memoryUrl
  }
] as const;

function getSectionLabel(term: number) {
  return sectionLabels[term] ?? "Unit 1";
}

function getTermFromSection(section: CurriculumSection) {
  if (section === "Holiday") {
    return 5;
  }

  if (section === "Advent") {
    return 6;
  }

  return Number(section.replace("Unit ", ""));
}

function isExternalFileUrl(url?: string | null) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://") || url?.startsWith("/"));
}

function getFileName(url: string | null | undefined, fallback: string) {
  if (!url) {
    return fallback;
  }

  const path = url.split("?")[0] ?? "";
  const fileName = path.split("/").pop();

  return fileName || fallback;
}

function getFamilyHref(term: number) {
  const section = getSectionLabel(term);

  return `/family?year=${encodeURIComponent("Volume 1")}&section=${encodeURIComponent(section)}` as Route;
}

export async function generateMetadata({ params }: FamilyLessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const [familyResources, teachResources] = await Promise.all([
    getPublishedFamilyResources(),
    getPublicResources()
  ]);
  const familyLesson = familyResources.lessons.find((entry) => entry.id === lessonId);
  const lesson =
    teachResources.find((entry) => entry.id === lessonId) ??
    teachResources.find(
      (entry) =>
        familyLesson &&
        getTermFromSection(normalizeCurriculumSection(entry.term)) === familyLesson.term &&
        (entry.lessonNumber ?? 1) === familyLesson.lessonNumber
    );

  if (!lesson) {
    return buildPrivateMetadata({
      title: "Family lesson",
      description: "View a family resource lesson from New Creation Kids."
    });
  }

  return buildPrivateMetadata({
    title: `Family Resources - Week ${lesson.lessonNumber}`,
    description: lesson.scripture || `${normalizeCurriculumSection(lesson.term)} family resources`
  });
}

export default async function FamilyLessonPage({ params }: FamilyLessonPageProps) {
  const { lessonId } = await params;
  const [access, resources, teachResources] = await Promise.all([
    getMemberAccessSnapshot(),
    getPublishedFamilyResources(),
    getPublicResources()
  ]);

  if (!access.user) {
    redirect(`/login?next=${encodeURIComponent(`/family/${lessonId}`)}`);
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  const familyLessonById = resources.lessons.find((entry) => entry.id === lessonId);
  const lesson =
    teachResources.find((entry) => entry.id === lessonId) ??
    teachResources.find(
      (entry) =>
        familyLessonById &&
        getTermFromSection(normalizeCurriculumSection(entry.term)) === familyLessonById.term &&
        (entry.lessonNumber ?? 1) === familyLessonById.lessonNumber
    );

  if (!lesson) {
    notFound();
  }

  const sectionLabel = normalizeCurriculumSection(lesson.term);
  const activeTerm = getTermFromSection(sectionLabel);
  const familyLesson =
    familyLessonById ??
    resources.lessons.find(
      (entry) => entry.term === activeTerm && entry.lessonNumber === (lesson.lessonNumber ?? 1)
    );
  const familyHref = getFamilyHref(activeTerm);
  const sameSectionLessons = teachResources
    .filter(
      (entry) =>
        normalizeCurriculumYear(entry.yearCycle) === normalizeCurriculumYear(lesson.yearCycle) &&
        normalizeCurriculumSection(entry.term) === sectionLabel
    )
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));
  const currentIndex = sameSectionLessons.findIndex((entry) => entry.id === lesson.id);
  const previousLesson = currentIndex >= 0 ? sameSectionLessons[currentIndex - 1] ?? null : null;
  const nextLesson = currentIndex >= 0 ? sameSectionLessons[currentIndex + 1] ?? null : null;
  const familyFiles = fileTypes.flatMap<FamilyLessonFileItem>((fileType) => {
      const url = fileType.getUrl(familyLesson);

      if (!url) {
        return [];
      }

      const href = (
        isExternalFileUrl(url)
          ? url
          : `/api/family-resources/lessons/${familyLesson?.id ?? lesson.id}/download?type=${fileType.key}`
      ) as string;

      return [{
        key: fileType.key,
        title: fileType.title,
        description: fileType.description,
        href,
        fileName: getFileName(url, `${fileType.key}.pdf`)
      }];
    });

  return (
    <main className="site-shell section family-page family-lesson-page">
      <section className="family-page-head family-lesson-page-head">
        <span className="eyebrow">
          <Home size={18} />
          Family
        </span>
        <h1>Family Resources</h1>
        <p>
          Volume 1 take-home resources for families. Print and hand these out each week to help families
          continue the conversation at home.
        </p>
      </section>
      <section className="resource-browser-layout">
        <article className="panel resource-entry-panel family-lesson-panel">
          <div className="resource-entry-page">
            <header className="resource-entry-header">
              <nav className="resource-entry-breadcrumb family-entry-breadcrumb" aria-label="Family lesson breadcrumb">
                <Link href="/family">Family</Link>
                <span>/</span>
                <Link href={familyHref}>{sectionLabel}</Link>
                <span>/</span>
                <Link href={`/family/${lesson.id}` as Route}>Week {lesson.lessonNumber ?? 1}</Link>
              </nav>
              <h1 className="resource-entry-title">{lesson.title}</h1>
              {lesson.scripture ? <p className="resource-entry-scripture">{lesson.scripture}</p> : null}
            </header>

            <div className="resource-entry-shell">
              <div className="resource-entry-main">
                <section className="resource-big-idea family-lesson-summary">
                  <span>At home</span>
                  <strong>Use these resources to help families revisit Week {lesson.lessonNumber ?? 1} together.</strong>
                </section>
                <section className="resource-entry-overview">
                  <h2>Family Resource Overview</h2>
                  <div className="resource-html resource-entry-description">
                    <p>
                      Download the discussion guide, activity sheet, and memory card for this lesson.
                      Each file is designed to connect the Sunday teaching with simple conversations and
                      activities at home.
                    </p>
                  </div>
                </section>
              </div>

              {familyFiles.length ? (
                <aside className="resource-entry-sidebar">
                  <FamilyLessonFiles files={familyFiles} lessonTitle={lesson.title} />
                </aside>
              ) : null}

              <div className="resource-entry-lesson-nav" aria-label="Family lesson navigation">
                <Link href={familyHref} className="resource-back-lessons-button">
                  <ArrowLeft size={16} />
                  <span>Family Resources</span>
                </Link>
                {previousLesson || nextLesson ? (
                  <div className="resource-week-nav">
                    {previousLesson ? (
                      <Link href={`/family/${previousLesson.id}` as Route} className="resource-week-button">
                        <ArrowLeft size={16} />
                        <span>{previousLesson.lessonNumber ? `Week ${previousLesson.lessonNumber}` : "Previous week"}</span>
                      </Link>
                    ) : null}
                    {nextLesson ? (
                      <Link href={`/family/${nextLesson.id}` as Route} className="resource-week-button">
                        <span>{nextLesson.lessonNumber ? `Week ${nextLesson.lessonNumber}` : "Next week"}</span>
                        <ArrowRight size={16} />
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
