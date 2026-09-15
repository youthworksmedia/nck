import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import { AdminFamilyUnitEditForm } from "@/components/admin-family-unit-edit-form";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getAdminFamilyResources } from "@/lib/family-resources";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/portal";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Edit Unit Resources",
  description: "Edit New Creation Kids family unit resources."
});

type AdminFamilyUnitEditPageProps = {
  params: Promise<{
    term: string;
  }>;
};

function getSectionLabel(term: number) {
  if (term === 5) return "Holiday";
  if (term === 6) return "Advent";
  return `Unit ${term}`;
}

export default async function AdminFamilyUnitEditPage({ params }: AdminFamilyUnitEditPageProps) {
  const [{ term: termParam }, user, isSuperAdmin, resources] = await Promise.all([
    params,
    getCurrentUser(),
    isCurrentUserSuperAdmin(),
    getAdminFamilyResources()
  ]);
  const termNumber = Number(termParam);

  if (!Number.isInteger(termNumber) || termNumber < 1 || termNumber > 6) {
    notFound();
  }

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const term = resources.terms.find((entry) => entry.term === termNumber);

  return (
    <AdminConsoleShell activeSection="family" userEmail={user.email}>
      <section className="panel admin-console-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Family resources</p>
            <h1>Edit unit resources</h1>
            <p>{getSectionLabel(termNumber)}</p>
          </div>
          <Link href="/admin?section=family" className="button button-secondary">
            <ArrowLeft size={16} />
            <span>Back to Family</span>
          </Link>
        </div>
        <AdminFamilyUnitEditForm termNumber={termNumber} term={term} />
      </section>
    </AdminConsoleShell>
  );
}
