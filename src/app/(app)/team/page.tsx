import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DeleteMemberButton } from "@/components/delete-member-button";
import { InviteTeamForm } from "@/components/invite-team-form";
import { TeamPasswordForm } from "@/components/team-password-form";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getCurrentUser, getTeamMembers, isCurrentUserOwner } from "@/lib/portal";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Team",
  description: "Manage team members, passwords, and access for your New Creation Kids account."
});

export default async function TeamPage() {
  const [teamMembers, user, isOwner] = await Promise.all([
    getTeamMembers(),
    getCurrentUser(),
    isCurrentUserOwner()
  ]);
  const remainingAdditionalTeamMembers = Number.POSITIVE_INFINITY;

  if (!isOwner) {
    redirect("/account");
  }

  return (
    <main className="site-shell section">
      <div className="section-head app-page-head">
        <div>
          <h1>Team</h1>
          <p>
            Signed in as {user?.email}. Team members inherit the account holder&apos;s
            access. When the owner&apos;s subscription ends, team access ends too.
          </p>
        </div>
      </div>

      <section className="dashboard-grid">
        <article>
          <h2>Members</h2>
          <table className="list-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th aria-label="Edit actions" />
                <th aria-label="Delete actions" />
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => {
                const isSelf =
                  member.userId === user?.id ||
                  member.email.toLowerCase() === user?.email?.toLowerCase();

                return (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.role === "owner" ? "Account holder" : "Team member"}</td>
                    <td>{member.joinedAt}</td>
                    <td>
                      <TeamPasswordForm
                        memberId={member.id}
                        name={member.name}
                        email={member.email}
                        isSelf={isSelf}
                        disabled={member.role === "owner" && !isSelf}
                      />
                    </td>
                    <td>
                      <DeleteMemberButton
                        memberId={member.id}
                        email={member.email}
                        disabled={isSelf || member.role === "owner"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        <article>
          <h2>Create team member</h2>
          <p>
            Invite team accounts, or reset team passwords. Team members cannot view team
            access settings.
          </p>
          <InviteTeamForm remainingAdditionalTeamMembers={remainingAdditionalTeamMembers} />
        </article>
      </section>
    </main>
  );
}
