import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import { AdminPhotoEditForm } from "@/components/admin-photo-edit-form";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getAdminPhotos } from "@/lib/photo-library";
import { getCurrentUser } from "@/lib/portal";

type Props = {
  params: Promise<{ photoId: string }>;
};

export const metadata: Metadata = buildPrivateMetadata({
  title: "Edit Image Library Photo",
  description: "Edit an Image Library entry."
});

export default async function AdminPhotoEditPage({ params }: Props) {
  const [{ photoId }, user, isSuperAdmin, photos] = await Promise.all([
    params,
    getCurrentUser(),
    isCurrentUserSuperAdmin(),
    getAdminPhotos()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const photo = photos.find((entry) => entry.dbId === photoId || entry.id === photoId);

  if (!photo) {
    notFound();
  }

  return (
    <AdminConsoleShell activeSection="leader-photos" userEmail={user.email}>
      <section className="panel admin-console-card">
        <AdminPhotoEditForm photo={photo} />
      </section>
    </AdminConsoleShell>
  );
}
