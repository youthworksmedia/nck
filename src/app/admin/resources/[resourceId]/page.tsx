import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import { AdminResourceEditForm } from "@/components/admin-resource-edit-form";
import { getAdminResources, isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/portal";
import { listStoredResourceFiles } from "@/lib/resource-assets";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Edit Lesson",
  description: "Edit a New Creation Kids lesson."
});

type AdminResourceEditPageProps = {
  params: Promise<{
    resourceId: string;
  }>;
};

function adminContentHref(year?: string, term?: string) {
  const searchParams = new URLSearchParams({
    section: "content"
  });

  if (year) {
    searchParams.set("year", year);
  }

  if (term) {
    searchParams.set("term", term);
  }

  return `/admin?${searchParams.toString()}` as Route;
}

export default async function AdminResourceEditPage({ params }: AdminResourceEditPageProps) {
  const [{ resourceId }, user, isSuperAdmin] = await Promise.all([
    params,
    getCurrentUser(),
    isCurrentUserSuperAdmin()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const [resources, files] = await Promise.all([getAdminResources(), listStoredResourceFiles()]);
  const resource = resources.find((entry) => entry.id === resourceId);

  if (!resource) {
    notFound();
  }

  return (
    <AdminConsoleShell activeSection="content" activeYear={resource.yearCycle} userEmail={user.email}>
      <section className="panel admin-console-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Curriculum content</p>
            <h1>Edit lesson</h1>
            <p>
              {resource.yearCycle} / {resource.term}
            </p>
          </div>
          <Link href={adminContentHref(resource.yearCycle, resource.term)} className="button button-secondary">
            <ArrowLeft size={16} />
            <span>Back to lessons</span>
          </Link>
        </div>
        <AdminResourceEditForm resource={resource} files={files} basePath="/admin" />
      </section>
    </AdminConsoleShell>
  );
}
