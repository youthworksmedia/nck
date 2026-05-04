import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SuperAdminContentView } from "@/components/super-admin-content-view";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Content",
  description: "Manage curriculum content, years, terms, and file libraries as a super admin."
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

  const activeYear =
    params.year === "Year B" ? "Year B" : params.year === "Year C" ? "Year C" : "Year A";
  const activeTerm =
    params.term === "Term 2"
      ? "Term 2"
      : params.term === "Term 3"
        ? "Term 3"
        : params.term === "Term 4"
          ? "Term 4"
          : "Term 1";

  return <SuperAdminContentView activeTab={activeTab} activeYear={activeYear} activeTerm={activeTerm} />;
}
