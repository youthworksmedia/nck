import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import { AdminFamilyLessonEditForm } from "@/components/admin-family-lesson-edit-form";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/portal";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Add Weekly Resource",
  description: "Add a New Creation Kids weekly family resource."
});

export default async function AdminFamilyNewLessonPage() {
  const [user, isSuperAdmin] = await Promise.all([getCurrentUser(), isCurrentUserSuperAdmin()]);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  return (
    <AdminConsoleShell activeSection="family" userEmail={user.email}>
      <section className="panel admin-console-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Family resources</p>
            <h1>Add weekly resource</h1>
            <p>Create a weekly family download entry and set it open or closed.</p>
          </div>
          <Link href="/admin?section=family" className="button button-secondary">
            <ArrowLeft size={16} />
            <span>Back to Family</span>
          </Link>
        </div>
        <AdminFamilyLessonEditForm />
      </section>
    </AdminConsoleShell>
  );
}
