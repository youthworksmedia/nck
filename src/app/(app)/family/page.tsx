import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Home } from "lucide-react";

import { getPublishedFamilyResources } from "@/lib/family-resources";
import {
  curriculumSections,
  getCurriculumSectionMeta,
  normalizeCurriculumSection,
  normalizeCurriculumYear,
  type CurriculumSection
} from "@/lib/curriculum";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";
import { getPublicResources } from "@/lib/public-resources";
import { getResourceIconPath } from "@/lib/resource-icon-paths";
import { getPublishedUnitOverviews } from "@/lib/unit-overviews";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Family Resources",
  description: "Printable family resources for continuing the conversation at home."
});

type FamilyPageProps = {
  searchParams?: Promise<{
    year?: string;
    section?: string;
    term?: string;
  }>;
};

const familySections = [...curriculumSections] as CurriculumSection[];

function getTerm(section: CurriculumSection) {
  if (section === "Holiday") {
    return 5;
  }

  if (section === "Advent") {
    return 6;
  }

  return Number(section.replace("Unit ", ""));
}

function getFallbackPassage(index: number) {
  const passages = ["Luke 4:1-30", "Luke 5:12-32", "Luke 7:1-23", "Luke 8:22-39"];

  return passages[index % passages.length];
}

function isExternalFileUrl(url?: string | null) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://") || url?.startsWith("/"));
}

function ResourceButton({
  url,
  href,
  iconLabel,
  label
}: {
  url?: string | null;
  href: Route;
  iconLabel: string;
  label: string;
}) {
  if (!url) {
    return <span className="family-table-empty">–</span>;
  }

  const downloadHref = isExternalFileUrl(url) ? url : href;
  const iconPath = getResourceIconPath(iconLabel, url, "family");

  return (
    <Link href={downloadHref as Route} className="family-table-download" target="_blank" rel="noreferrer" aria-label={label}>
      {iconPath ? <img src={iconPath} alt="" /> : <span aria-hidden="true">{iconLabel}</span>}
    </Link>
  );
}

function memoryCardItems(termMemory: Awaited<ReturnType<typeof getPublishedFamilyResources>>["terms"][number] | undefined) {
  return [
    { text: termMemory?.memoryText, url: termMemory?.memoryUrl, slot: 1 },
    { text: termMemory?.memoryText2, url: termMemory?.memoryUrl2, slot: 2 }
  ].filter((item) => item.text || item.url);
}

export default async function FamilyPage({ searchParams }: FamilyPageProps) {
  const params = (await searchParams) ?? {};
  const activeYear = normalizeCurriculumYear(params.year);
  const requestedSection = normalizeCurriculumSection(params.section ?? params.term);
  const activeSection = familySections.includes(requestedSection) ? requestedSection : "Unit 1";
  const activeTerm = getTerm(activeSection);
  const [access, resources, teachResources, unitOverviews] = await Promise.all([
    getMemberAccessSnapshot(),
    getPublishedFamilyResources(),
    getPublicResources(),
    getPublishedUnitOverviews()
  ]);

  if (!access.user) {
    redirect("/login");
  }

  if (!access.hasActiveAccount) {
    redirect("/account");
  }

  const familyLessons = resources.lessons
    .filter((lesson) => lesson.term === activeTerm)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const familyLessonsByWeek = new Map(familyLessons.map((lesson) => [lesson.lessonNumber, lesson]));
  const lessons = teachResources
    .filter(
      (lesson) =>
        normalizeCurriculumYear(lesson.yearCycle) === activeYear &&
        normalizeCurriculumSection(lesson.term) === activeSection
    )
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));
  const activeUnitOverview = unitOverviews.find(
    (overview) =>
      normalizeCurriculumYear(overview.yearCycle) === activeYear &&
      normalizeCurriculumSection(overview.term) === activeSection
  );
  const termMemory = resources.terms.find((term) => term.term === activeTerm);
  const memoryLesson = familyLessons.find((lesson) => lesson.memoryText || lesson.memoryUrl);
  const unitMemoryCards = memoryCardItems(termMemory);
  if (!unitMemoryCards.length && (memoryLesson?.memoryText || memoryLesson?.memoryUrl)) {
    unitMemoryCards.push({
      text: memoryLesson.memoryText,
      url: memoryLesson.memoryUrl,
      slot: 1
    });
  }

  return (
    <main className="site-shell section account-page family-page">
      <section className="family-page-head">
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

      <section className="family-card-grid">
        {resources.cards.map((card) => (
          <article className="family-resource-card" key={card.id}>
            <span className="family-card-icon" aria-hidden="true">{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <div className="family-card-meta">
              <span>{card.badge}</span>
              <small>{card.meta}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="family-week-section">
        <div className="family-unit-menu-top">
          <div className="resource-term-tabs-inline family-term-tabs" aria-label={`${activeYear} family resource units`}>
            {familySections.map((section) => {
              const isActive = activeSection === section;

              return (
                <Link
                  key={section}
                  href={{ pathname: "/family", query: { year: activeYear, section } }}
                  aria-current={isActive ? "page" : undefined}
                  className={`resource-term-pill family-term-tab ${isActive ? "resource-term-pill-active family-term-tab-active" : ""}`}
                >
                  <span>{section}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {activeUnitOverview ? (
          <div
            className={`unit-hero-card family-unit-hero ${activeUnitOverview.heroImagePath ? "unit-hero-card-with-image" : ""}`}
            style={
              activeUnitOverview.heroImagePath
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(33, 31, 38, 0.96) 0%, rgba(33, 31, 38, 0.78) 46%, rgba(33, 31, 38, 0.16) 100%), url("/api/resources/unit-overviews/hero-image?year=${encodeURIComponent(activeUnitOverview.yearCycle)}&term=${encodeURIComponent(activeUnitOverview.term)}")`
                  }
                : undefined
            }
          >
            <h2>{activeUnitOverview.title}</h2>
            <strong>{activeUnitOverview.subtitle}</strong>
          </div>
        ) : null}

        {unitMemoryCards.length ? (
          <div className="family-memory-grid">
            {unitMemoryCards.map((memoryCard) => (
              <div className="family-memory-banner" key={memoryCard.slot}>
                <span aria-hidden="true">
                  <img src={getResourceIconPath("Memory Verse", "memory-verse-family.png", "family") ?? ""} alt="" />
                </span>
                <div>
                  <small>{activeSection} · Memory Verse Card {memoryCard.slot}</small>
                  <strong>{memoryCard.text || "Memory verse card"}</strong>
                </div>
                {memoryCard.url ? (
                  <Link
                    href={
                      (isExternalFileUrl(memoryCard.url)
                        ? memoryCard.url
                        : `/api/family-resources/terms/${activeTerm}/download?slot=${memoryCard.slot}`) as Route
                    }
                    className="button button-primary"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} />
                    <span>Download card</span>
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {
          <div className="family-unit-extra-grid">
            <section className="family-unit-extra-card">
              <span className="family-unit-extra-icon" aria-hidden="true">
                <img src={getResourceIconPath("Family Discussion Guide", "discussion-guide-family.png", "family") ?? ""} alt="" />
              </span>
              <h2>Family Reading Guide</h2>
              <div className="family-unit-extra-actions">
                {termMemory?.readingGuideUrl ? (
                  <Link
                    href={
                      (isExternalFileUrl(termMemory.readingGuideUrl)
                        ? termMemory.readingGuideUrl
                        : `/api/family-resources/terms/${activeTerm}/download?type=reading-guide`) as Route
                    }
                    className="button button-secondary family-unit-extra-button"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} />
                    <span>Download PDF</span>
                  </Link>
                ) : (
                  <span className="button button-secondary family-unit-extra-button family-unit-extra-button-disabled" aria-disabled="true">
                    <Download size={16} />
                    <span>Download PDF</span>
                  </span>
                )}
                {termMemory?.readingGuideCanvaUrl ? (
                  <Link
                    href={termMemory.readingGuideCanvaUrl as Route}
                    className="button button-secondary family-unit-extra-button"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="canva-button-mark" aria-hidden="true">C</span>
                    <span>Canva template</span>
                  </Link>
                ) : (
                  <span className="button button-secondary family-unit-extra-button family-unit-extra-button-disabled" aria-disabled="true">
                    <span className="canva-button-mark" aria-hidden="true">C</span>
                    <span>Canva template</span>
                  </span>
                )}
              </div>
            </section>
            <section className="family-unit-extra-card">
              <span className="family-unit-extra-icon" aria-hidden="true">
                <img src={getResourceIconPath("Parent Devotions", "parent-devotion-family.png", "family") ?? ""} alt="" />
              </span>
              <h2>Parent Devotions</h2>
              <div className="family-unit-extra-actions">
                {termMemory?.parentDevotionUrl ? (
                  <Link
                    href={
                      (isExternalFileUrl(termMemory.parentDevotionUrl)
                        ? termMemory.parentDevotionUrl
                        : `/api/family-resources/terms/${activeTerm}/download?type=parent-devotion`) as Route
                    }
                    className="button button-secondary family-unit-extra-button"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} />
                    <span>Download PDF</span>
                  </Link>
                ) : (
                  <span className="button button-secondary family-unit-extra-button family-unit-extra-button-disabled" aria-disabled="true">
                    <Download size={16} />
                    <span>Download PDF</span>
                  </span>
                )}
                {termMemory?.parentDevotionCanvaUrl ? (
                  <Link
                    href={termMemory.parentDevotionCanvaUrl as Route}
                    className="button button-secondary family-unit-extra-button"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="canva-button-mark" aria-hidden="true">C</span>
                    <span>Canva template</span>
                  </Link>
                ) : (
                  <span className="button button-secondary family-unit-extra-button family-unit-extra-button-disabled" aria-disabled="true">
                    <span className="canva-button-mark" aria-hidden="true">C</span>
                    <span>Canva template</span>
                  </span>
                )}
              </div>
            </section>
          </div>
        }

        <div className="family-table">
          <div className="family-table-row family-table-head" aria-hidden="true">
            <span>#</span>
            <span>Lesson</span>
            <span>Discussion</span>
            <span>Activity</span>
            <span>Memory</span>
          </div>
          {lessons.map((lesson) => (
            <div className="family-table-row" key={lesson.id}>
              <span className="family-lesson-number">{lesson.lessonNumber ?? 1}</span>
              <span className="family-lesson-copy">
                <Link href={`/family/${lesson.id}` as Route}>{lesson.title}</Link>
                <small>{lesson.scripture || getFallbackPassage(lessons.indexOf(lesson))}</small>
              </span>
              <ResourceButton
                url={familyLessonsByWeek.get(lesson.lessonNumber ?? 1)?.discussionUrl}
                href={`/api/family-resources/lessons/${familyLessonsByWeek.get(lesson.lessonNumber ?? 1)?.id ?? lesson.id}/download?type=discussion` as Route}
                iconLabel="Family Discussion Guide"
                label={`Download discussion guide for ${lesson.title}`}
              />
              <ResourceButton
                url={familyLessonsByWeek.get(lesson.lessonNumber ?? 1)?.activityUrl}
                href={`/api/family-resources/lessons/${familyLessonsByWeek.get(lesson.lessonNumber ?? 1)?.id ?? lesson.id}/download?type=activity` as Route}
                iconLabel="Activity Sheet"
                label={`Download activity sheet for ${lesson.title}`}
              />
              <ResourceButton
                url={familyLessonsByWeek.get(lesson.lessonNumber ?? 1)?.memoryUrl}
                href={`/api/family-resources/lessons/${familyLessonsByWeek.get(lesson.lessonNumber ?? 1)?.id ?? lesson.id}/download?type=memory` as Route}
                iconLabel="Memory Verse"
                label={`Download memory card for ${lesson.title}`}
              />
            </div>
          ))}
          {!lessons.length ? (
            <p className="family-table-empty-state">
              No family resources have been added for {activeYear} {activeSection} yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
