import type { Metadata } from "next";
import Image from "next/image";

import { DeleteMemberButton } from "@/components/delete-member-button";
import { InviteTeamForm } from "@/components/invite-team-form";
import { ReinviteMemberButton } from "@/components/reinvite-member-button";
import { TeamPasswordForm } from "@/components/team-password-form";
import { getSuperAdminEmails, isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  getCurrentUser,
  getMembershipSnapshot,
  getTeamMembers,
  isCurrentUserOwner
} from "@/lib/portal";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Team",
  description: "Manage your New Creation Kids ministry team accounts."
});

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "TM"
  );
}

export default async function AccountTeamPage() {
  const [membership, user, isOwner, teamMembers, isSuperAdmin] = await Promise.all([
    getMembershipSnapshot(),
    getCurrentUser(),
    isCurrentUserOwner(),
    getTeamMembers(),
    isCurrentUserSuperAdmin()
  ]);
  const adminUsers = isSuperAdmin ? await getSuperAdminEmails() : [];
  const remainingAdditionalTeamMembers = Number.POSITIVE_INFINITY;

  return (
    <main className="site-shell section account-page account-subpage">
      <section className="account-subpage-head">
        <span className="eyebrow">{isSuperAdmin ? "Admin" : "Team"}</span>
        <h1>{isSuperAdmin ? "Admin Group" : "Your Ministry Team"}</h1>
        <p>
          {isSuperAdmin
            ? "People with full New Creation Kids admin access."
            : `Invite and manage the accounts connected to ${membership.churchName}.`}
        </p>
      </section>

      <section className="dashboard-grid account-team-page-grid">
        {isSuperAdmin ? (
          <article className="account-card account-card-team">
            <div className="account-team-head">
              <div className="account-team-title-wrap">
                <div className="account-team-title-icon" aria-hidden="true">
                  <Image
                    src="/account-team-header.png"
                    alt=""
                    width={46}
                    height={46}
                    className="account-team-title-image"
                  />
                </div>
                <h2>Admin Group</h2>
              </div>
            </div>
            <div className="account-team-list">
              {adminUsers.map((admin, index) => (
                <div key={admin.userId} className="account-team-member-row">
                  <div className={`account-team-member-avatar account-team-member-avatar-${index % 4}`}>
                    {getInitials(admin.displayName || admin.email)}
                  </div>
                  <div className="account-team-member-copy">
                    <div className="account-team-member-main">
                      <strong>{admin.displayName}</strong>
                      <span className="account-team-role-badge account-team-role-badge-owner">
                        Admin
                      </span>
                    </div>
                    <span className="account-team-member-joined">{admin.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : (
          <article className="account-card account-card-team">
            <div className="account-team-head">
              <div className="account-team-title-wrap">
                <div className="account-team-title-icon" aria-hidden="true">
                  <Image
                    src="/account-team-header.png"
                    alt=""
                    width={46}
                    height={46}
                    className="account-team-title-image"
                  />
                </div>
                <h2>Your Ministry Team</h2>
              </div>
            </div>
            <div className="account-team-list">
              {teamMembers.map((member, index) => {
                const isSelf =
                  member.userId === user?.id ||
                  member.email.toLowerCase() === user?.email?.toLowerCase();

                return (
                  <div key={member.id} className="account-team-member-row">
                    <div className={`account-team-member-avatar account-team-member-avatar-${index % 4}`}>
                      {getInitials(member.name)}
                    </div>
                    <div className="account-team-member-copy">
                      <div className="account-team-member-main">
                        <strong>{member.name}</strong>
                        <span
                          className={`account-team-role-badge ${
                            member.role === "owner"
                              ? "account-team-role-badge-owner"
                              : "account-team-role-badge-member"
                          }`}
                        >
                          {member.role === "owner" ? "Account holder" : "Team member"}
                        </span>
                        {member.role !== "owner" ? (
                          <span
                            className={`account-team-status-badge ${
                              member.status === "invited"
                                ? "account-team-status-badge-invited"
                                : "account-team-status-badge-active"
                            }`}
                          >
                            {member.status === "invited" ? "Invited" : "Active"}
                          </span>
                        ) : null}
                      </div>
                      <span className="account-team-member-joined">
                        {member.email}
                        {member.role === "owner"
                          ? member.joinedAt
                            ? ` · Joined ${member.joinedAt}`
                            : ""
                          : member.status === "invited"
                            ? " · Invitation pending"
                            : member.joinedAt
                              ? ` · Joined ${member.joinedAt}`
                              : " · Active"}
                      </span>
                    </div>
                    {isOwner ? (
                      <div className="account-team-member-actions">
                        {member.status === "invited" && member.role !== "owner" ? (
                          <ReinviteMemberButton memberId={member.id} email={member.email} />
                        ) : null}
                        <TeamPasswordForm
                          memberId={member.id}
                          name={member.name}
                          email={member.email}
                          isSelf={isSelf}
                        />
                        <DeleteMemberButton
                          memberId={member.id}
                          email={member.email}
                          disabled={isSelf || member.role === "owner"}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {isOwner ? (
              <div className="account-team-add">
                <InviteTeamForm remainingAdditionalTeamMembers={remainingAdditionalTeamMembers} />
              </div>
            ) : null}
          </article>
        )}
      </section>
    </main>
  );
}
