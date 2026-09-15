import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import { AdminFamilyLessonEditForm } from "@/components/admin-family-lesson-edit-form";
import { getAdminFamilyResources } from "@/lib/family-resources";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/portal";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Edit Family Lesson",
  description: "Edit a New Creation Kids family lesson resource."
});

type AdminFamilyLessonEditPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

function getSectionLabel(term: number) {
  if (term === 5) return "Holiday";
  if (term === 6) return "Advent";
  return `Unit ${term}`;
}

export default async function AdminFamilyLessonEditPage({ params }: AdminFamilyLessonEditPageProps) {
  const [{ lessonId }, user, isSuperAdmin, resources] = await Promise.all([
    params,
    getCurrentUser(),
    isCurrentUserSuperAdmin(),
    getAdminFamilyResources()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const lesson = resources.lessons.find((entry) => entry.id === lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <AdminConsoleShell activeSection="family" userEmail={user.email}>
      <section className="panel admin-console-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Family resources</p>
            <h1>Edit weekly resource</h1>
            <p>
              {getSectionLabel(lesson.term)} / Lesson {lesson.lessonNumber}
            </p>
          </div>
          <Link href="/admin?section=family" className="button button-secondary">
            <ArrowLeft size={16} />
            <span>Back to Family</span>
          </Link>
        </div>
        <AdminFamilyLessonEditForm lesson={lesson} />
      </section>
    </AdminConsoleShell>
  );
}
