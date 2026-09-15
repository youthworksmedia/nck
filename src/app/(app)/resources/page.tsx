import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResourceLibrary } from "@/components/resource-library";
import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getMemberAccessSnapshot } from "@/lib/portal";
import { getPublicResources } from "@/lib/public-resources";
import { getPublishedUnitOverviews } from "@/lib/unit-overviews";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Curriculum Library",
  description: "Browse your curriculum library by year and term, with lesson manuals, worksheets, and music downloads."
});

type ResourcesPageProps = {
  searchParams?: Promise<{
    year?: string;
    section?: string;
    term?: string;
  }>;
};

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const params = (await searchParams) ?? {};
  const [resources, unitOverviews, access] = await Promise.all([
    getPublicResources(),
    getPublishedUnitOverviews(),
    getMemberAccessSnapshot()
  ]);
  const initialYear = normalizeCurriculumYear(params.year);
  const initialSection = normalizeCurriculumSection(params.section ?? params.term);

  if (access.user && !access.hasActiveAccount) {
    redirect("/account");
  }

  return (
    <main className="site-shell section resource-page">
      <ResourceLibrary
        canAccessPremiumMedia={Boolean(access.user && access.hasActiveAccount)}
        resources={resources}
        unitOverviews={unitOverviews}
        initialYear={initialYear}
        initialSection={initialSection}
      />
    </main>
  );
}
