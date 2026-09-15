import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import { AdminGameEditForm } from "@/components/admin-game-edit-form";
import { getAdminGames } from "@/lib/games-library";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/portal";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";

type Props = {
  params: Promise<{ gameId: string }>;
};

export const metadata: Metadata = buildPrivateMetadata({
  title: "Edit Game",
  description: "Edit a Games Library entry."
});

export default async function AdminGameEditPage({ params }: Props) {
  const [{ gameId }, user, isSuperAdmin, games] = await Promise.all([
    params,
    getCurrentUser(),
    isCurrentUserSuperAdmin(),
    getAdminGames()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const game = games.find((entry) => entry.dbId === gameId || entry.id === gameId);

  if (!game) {
    notFound();
  }

  return (
    <AdminConsoleShell activeSection="leader-games" userEmail={user.email}>
      <section className="panel admin-console-card">
        <AdminGameEditForm game={game} />
      </section>
    </AdminConsoleShell>
  );
}
