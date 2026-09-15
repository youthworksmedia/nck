import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SuperAdminContentView } from "@/components/super-admin-content-view";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Content",
  description: "Manage curriculum content, years, terms, and file libraries as an Admin."
});

type ContentPageProps = {
  searchParams: Promise<{
    tab?: string;
    year?: string;
    term?: string;
  }>;
};

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const isSuperAdmin = await isCurrentUserSuperAdmin();
  const params = await searchParams;

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const activeTab =
    params.tab === "add" ? "add" : params.tab === "files" ? "files" : "library";

  const activeYear = normalizeCurriculumYear(params.year);
  const activeTerm = normalizeCurriculumSection(params.term);

  return <SuperAdminContentView activeTab={activeTab} activeYear={activeYear} activeTerm={activeTerm} />;
}
