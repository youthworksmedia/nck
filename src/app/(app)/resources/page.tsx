import type { Metadata } from "next";

import { ResourceLibrary } from "@/components/resource-library";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurriculumTermNotes, getResources } from "@/lib/portal";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Curriculum Library",
  description: "Browse your curriculum library by year and term, with lesson manuals, worksheets, and music downloads."
});

export default async function ResourcesPage() {
  const [resources, termNotes] = await Promise.all([getResources(), getCurriculumTermNotes()]);

  return (
    <main className="site-shell section">
      <ResourceLibrary resources={resources} termNotes={termNotes} />
    </main>
  );
}
