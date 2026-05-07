import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Blocks,
  LibraryBig,
  BadgeDollarSign,
  Users,
  Download,
  BookOpenText,
  CalendarDays,
  Crown,
  StarIcon,
  Check,
  CircleCheckBig,
  X,
  ReceiptText,
} from "lucide-react";

import { DeleteMemberButton } from "@/components/delete-member-button";
import { InviteTeamForm } from "@/components/invite-team-form";
import { SuperAdminAccountView } from "@/components/super-admin-account-view";
import { TeamPasswordForm } from "@/components/team-password-form";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { planAllowsLessonBuilder } from "@/lib/plans";
import {
  getAccountHolderEmail,
  getAccountPurchaseOrders,
  getMembershipSnapshot,
  getCurrentUser,
  getTeamMembers,
  isCurrentUserOwner
} from "@/lib/portal";
import { formatLongDate, formatLongDateWithOrdinal, getDaysUntil } from "@/lib/time";
import { plans } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";
import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Dashboard",
  description: "View your New Creation Kids dashboard, subscription details, team tools, and purchase history."
});

type AccountPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    order?: string;
  }>;
};

const verseOptions = [
  {
    text: "Train up a child in the way he should go; even when he is old he will not depart from it.",
    reference: "Proverbs 22:6"
  },
  {
    text: "Let the little children come to me and do not hinder them, for to such belongs the kingdom of heaven.",
    reference: "Matthew 19:14"
  },
  {
    text: "Children are a heritage from the Lord, offspring a reward from him.",
    reference: "Psalm 127:3"
  },
  {
    text: "We will tell the next generation the praiseworthy deeds of the Lord, his power, and the wonders he has done.",
    reference: "Psalm 78:4"
  }
];

const currentCurriculumYear = "Year A";
const currentTerms = ["Term 1", "Term 2", "Term 3", "Term 4"] as const;

function parseShortDateValue(value: string) {
  const [day = "1", month = "1", year = "00"] = value.split("/");
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);

  return new Date(fullYear, Number(month) - 1, Number(day));
}

function formatRelativeActivityTime(value: string) {
  const joinedDate = parseShortDateValue(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfJoined = new Date(joinedDate.getFullYear(), joinedDate.getMonth(), joinedDate.getDate());
  const diffInDays = Math.max(
    0,
    Math.round((startOfToday.getTime() - startOfJoined.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (diffInDays === 0) {
    return "Today";
  }

  if (diffInDays === 1) {
    return "Yesterday";
  }

  return `${diffInDays} days ago`;
}

function formatShortOrderNumber(orderNumber: string) {
  const trimmed = orderNumber.trim();
  if (trimmed.length <= 7) {
    return trimmed;
  }

  return `...${trimmed.slice(-7)}`;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) ?? {};
  const [membership, user, isOwner, teamMembers, accountHolderEmail, isSuperAdmin, purchaseOrders] = await Promise.all([
    getMembershipSnapshot(),
    getCurrentUser(),
    isCurrentUserOwner(),
    getTeamMembers(),
    getAccountHolderEmail(),
    isCurrentUserSuperAdmin(),
    getAccountPurchaseOrders()
  ]);

  if (isSuperAdmin) {
    return <SuperAdminAccountView user={user} />;
  }

  const plan = plans.find((entry) => entry.id === membership.planTier);
  const memberCount = isOwner ? teamMembers.length : membership.memberCount;
  const daysRemaining = getDaysUntil(membership.renewalDate);
  const canUseLessonBuilder = planAllowsLessonBuilder(membership.planTier);
  const additionalTeamMembersAdded = teamMembers.filter((member) => member.role === "member").length;
  const remainingAdditionalTeamMembers = Number.POSITIVE_INFINITY;
  const renewNeedsAttention =
    membership.subscriptionStatus !== "active" || daysRemaining <= 92;
  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "TM";
  const currentTeamMember = teamMembers.find(
    (member) =>
      member.userId === user?.id ||
      member.email.toLowerCase() === user?.email?.toLowerCase()
  );
  const ownerTeamMember = teamMembers.find((member) => member.role === "owner");
  const ownerName =
    membership.accountHolderName ||
    ownerTeamMember?.name ||
    user?.email?.split("@")[0] ||
    "Friend";
  const accountHolderName = membership.accountHolderName || ownerTeamMember?.name || ownerName;
  const userFullName =
    user && "user_metadata" in user && typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;
  const currentMemberName =
    currentTeamMember?.name ??
    userFullName ??
    user?.email?.split("@")[0] ??
    "Friend";
  const planLabel = plan?.name ?? membership.planTier;
  const accountContextLabel =
    membership.subscriptionStatus === "inactive"
      ? "No active membership"
      : `${membership.churchName} · ${planLabel} plan`;
  const recentTeamActivities = isOwner
    ? [
        {
          name: ownerName,
          initials: getInitials(ownerName),
          avatarClassName: "account-team-member-avatar-0",
          text: `${ownerName} opened the Curriculum Library`,
          timeLabel: "Today"
        },
        ...teamMembers
          .filter((member) => member.role !== "owner")
          .slice(0, 2)
          .map((member, index) => ({
            name: member.name,
            initials: getInitials(member.name),
            avatarClassName: `account-team-member-avatar-${(index % 3) + 1}`,
            text:
              index === 0
                ? `${member.name} joined your team`
                : `${member.name} opened the curriculum library`,
            timeLabel: formatRelativeActivityTime(member.joinedAt)
          }))
      ]
    : [];
  const verseOfTheDay =
    verseOptions[
      ((new Date().getDate() + new Date().getMonth()) % verseOptions.length + verseOptions.length) %
        verseOptions.length
    ];
  return (
    <main className="site-shell section account-page">
      {params.checkout === "success" ? (
        <div className="panel checkout-success-banner">
          <strong>Purchase successful.</strong> Your annual membership is now active
          {params.order ? ` · ${params.order}` : ""}.
        </div>
      ) : null}

      {isOwner ? (
        <section className="account-owner-hero">
          <div className="account-owner-hero-copy">
            <p className="account-owner-hero-kicker">Welcome back,</p>
            <div className="section-head app-page-head">
              <div>
                <h1>{ownerName}</h1>
              </div>
            </div>
            <p className="account-owner-hero-summary">
              {accountContextLabel}
            </p>
          </div>
          <div className="account-owner-hero-illustration" aria-hidden="true" />
          <div className="button-row account-dashboard-actions">
            <Link href="/resources" className="button button-primary">
              <BookOpenText size={18} />
              <span className="account-dashboard-action-copy">
                <strong>Browse Library</strong>
                <small>Curriculum &amp; resources</small>
              </span>
            </Link>
            {canUseLessonBuilder ? (
              <Link href="/lesson-builder" className="button button-primary">
                <Blocks size={18} />
                <span className="account-dashboard-action-copy">
                  <strong>Create Lesson</strong>
                  <small>Start a new lesson</small>
                </span>
              </Link>
            ) : null}
            <a href="#team-members-panel" className="button button-primary">
              <Users size={18} />
              <span className="account-dashboard-action-copy">
                <strong>Manage Team</strong>
                <small>{memberCount} invited accounts</small>
              </span>
            </a>
            <Link
              href="/resources"
              className={`button button-primary${renewNeedsAttention ? " account-renew-button-alert" : ""}`}
            >
              <CalendarDays size={18} />
              <span className="account-dashboard-action-copy">
                <strong>This Sunday</strong>
                <small>Plan your session</small>
              </span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="account-owner-hero account-member-hero">
          <div className="account-owner-hero-copy">
            <p className="account-owner-hero-kicker">Welcome back,</p>
            <div className="section-head app-page-head">
              <div>
                <h1>{currentMemberName}</h1>
              </div>
            </div>
            <p className="account-owner-hero-summary">
              {accountContextLabel}
            </p>
          </div>
          <div className="account-owner-hero-illustration" aria-hidden="true" />
          <div className="button-row account-dashboard-actions">
            <Link href="/resources" className="button button-primary">
              <BookOpenText size={18} />
              <span className="account-dashboard-action-copy">
                <strong>Browse Library</strong>
                <small>Curriculum &amp; resources</small>
              </span>
            </Link>
            {canUseLessonBuilder ? (
              <Link href="/lesson-builder" className="button button-primary">
                <Blocks size={18} />
                <span className="account-dashboard-action-copy">
                  <strong>Create Lesson</strong>
                  <small>Start a new lesson</small>
                </span>
              </Link>
            ) : null}
            <a href="#team-members-panel" className="button button-primary">
              <Users size={18} />
              <span className="account-dashboard-action-copy">
                <strong>My Team</strong>
                <small>{membership.churchName}</small>
              </span>
            </a>
            <Link href="/resources" className="button button-primary">
              <CalendarDays size={18} />
              <span className="account-dashboard-action-copy">
                <strong>This Sunday</strong>
                <small>Plan your session</small>
              </span>
            </Link>
          </div>
        </section>
      )}

      <section className="account-current-lessons panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Current curriculum</span>
            <h2>{currentCurriculumYear}</h2>
          </div>
          <p>Admins can update which year is current. Choose a term to see the available lessons.</p>
        </div>
        <div className="account-current-term-grid">
          {currentTerms.map((term) => (
            <Link key={term} href="/resources" className="account-current-term-link">
              <CalendarDays size={18} />
              <span>{term}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-grid account-owner-grid">
        {isOwner ? (
          <article id="team-members-panel" className="account-card account-card-team">
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
                      </div>
                      <span className="account-team-member-joined">Joined {member.joinedAt}</span>
                    </div>
                    <div className="account-team-member-actions">
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
                  </div>
                );
              })}
            </div>
            <div className="account-team-add">
              <div className="account-team-add-copy-wrap">
                <p className="account-team-add-copy">
                  <span>
                    {memberCount} team members. Invited accounts are unlimited.
                  </span>
                </p>
              </div>
              <InviteTeamForm remainingAdditionalTeamMembers={remainingAdditionalTeamMembers} />
            </div>
          </article>
        ) : (
          <article id="team-members-panel" className="account-card account-card-team">
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
              {teamMembers.map((member, index) => (
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}

        <article className="account-card account-card-overview">
          {isOwner ? (
            <>
              <div className="account-card-heading">
                <h2>Subscription overview</h2>
                <div className="account-card-heading-icon">
                  <StarIcon size={18} fill="currentColor" strokeWidth={1.5} />
                </div>
              </div>
              <div className="meta-grid account-overview-grid">
                <div className="account-overview-tile account-overview-tile-wide">
                  <div className="account-overview-plan-icon" aria-hidden="true">
                    <Crown size={18} fill="currentColor" strokeWidth={1.5} />
                  </div>
                  <div className="account-overview-plan-copy">
                    <strong>{plan?.name ?? membership.planTier}</strong>
                    <span>{membership.churchName}</span>
                  </div>
                </div>
                <div className="account-overview-tile account-overview-tile-highlight">
                  <span className="pill">Invited accounts</span>
                  <strong>
                    {memberCount} <span className="account-overview-count-separator">of</span> unlimited
                  </strong>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Next renewal</span>
                  <strong>{formatLongDateWithOrdinal(membership.renewalDate)}</strong>
                  <span className="account-overview-note">({daysRemaining} days)</span>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Lesson tools</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      <span
                        className={`account-overview-status-icon ${
                          canUseLessonBuilder
                            ? "account-overview-status-icon-included"
                            : "account-overview-status-icon-excluded"
                        }`}
                        aria-hidden="true"
                      >
                        {canUseLessonBuilder ? <Check size={14} /> : <X size={14} />}
                      </span>
                      <span>{canUseLessonBuilder ? "Included" : "Library resources"}</span>
                    </strong>
                  </div>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Status</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      {membership.subscriptionStatus === "active" ? (
                        <span
                          className="account-overview-status-dot account-overview-status-dot-active"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span>{membership.subscriptionStatus}</span>
                    </strong>
                  </div>
                </div>
              </div>
              <div className="account-overview-actions">
                {purchaseOrders[0] ? (
                  <a href={`/api/account/invoices/${purchaseOrders[0].id}`} className="account-overview-action">
                    <ReceiptText size={16} />
                    <span>Latest invoice</span>
                  </a>
                ) : (
                  <span className="account-overview-action">
                    <ReceiptText size={16} />
                    <span>No invoice yet</span>
                  </span>
                )}
                <Link href={`/subscribe?tier=${membership.planTier}`} className="account-overview-action">
                  <BadgeDollarSign size={16} />
                  <span>Update plan</span>
                </Link>
                <Link href="/resources" className="account-overview-action">
                  <BookOpenText size={16} />
                  <span>View details</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="account-card-heading">
                <h2>Subscription overview</h2>
                <div className="account-card-heading-icon">
                  <StarIcon size={18} fill="currentColor" strokeWidth={1.5} />
                </div>
              </div>
              <div className="meta-grid account-overview-grid">
                <div className="account-overview-tile account-overview-tile-wide">
                  <div className="account-overview-plan-icon" aria-hidden="true">
                    <Crown size={18} fill="currentColor" strokeWidth={1.5} />
                  </div>
                  <div className="account-overview-plan-copy">
                    <strong>{plan?.name ?? membership.planTier}</strong>
                    <span>{membership.churchName}</span>
                  </div>
                </div>
                <div className="account-overview-tile account-overview-tile-highlight">
                  <span className="pill">Name</span>
                  <span className="account-overview-note account-overview-note-strong">
                    {accountHolderName}
                  </span>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Access</span>
                  <strong>{formatLongDateWithOrdinal(membership.renewalDate)}</strong>
                  <span className="account-overview-note">
                    ({membership.subscriptionStatus === "active" ? `${daysRemaining} days` : "Inactive"})
                  </span>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Lesson tools</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      <span
                        className={`account-overview-status-icon ${
                          canUseLessonBuilder
                            ? "account-overview-status-icon-included"
                            : "account-overview-status-icon-excluded"
                        }`}
                        aria-hidden="true"
                      >
                        {canUseLessonBuilder ? <Check size={14} /> : <X size={14} />}
                      </span>
                      <span>{canUseLessonBuilder ? "Included" : "Library resources"}</span>
                    </strong>
                  </div>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Status</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      {membership.subscriptionStatus === "active" ? (
                        <span
                          className="account-overview-status-dot account-overview-status-dot-active"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span>{membership.subscriptionStatus}</span>
                    </strong>
                  </div>
                </div>
              </div>
              <div className="account-overview-actions">
                <Link href="/resources" className="account-overview-action">
                  <LibraryBig size={16} />
                  <span>Curriculum library</span>
                </Link>
                {canUseLessonBuilder ? (
                  <Link href="/lesson-builder" className="account-overview-action">
                    <Blocks size={16} />
                    <span>Lesson tools</span>
                  </Link>
                ) : (
                  <span className="account-overview-action">
                    <Blocks size={16} />
                    <span>Library resources</span>
                  </span>
                )}
                <a
                  href={accountHolderEmail ? `mailto:${accountHolderEmail}` : undefined}
                  className="account-overview-action"
                >
                  <Users size={16} />
                  <span>Contact owner</span>
                </a>
              </div>
            </>
          )}
        </article>
      </section>

      {isOwner ? (
        <>
        <section className="dashboard-grid account-history-links-grid">
          <article className="account-card account-card-purchases">
            <div className="section-head account-purchases-head">
              <div className="account-purchases-title">
                <div className="account-purchases-title-icon" aria-hidden="true">
                  <Image
                    src="/account-purchase-header.png"
                    alt=""
                    width={46}
                    height={46}
                    className="account-purchases-title-image"
                  />
                </div>
                <h2>Purchase history</h2>
              </div>
            </div>
            {purchaseOrders.length ? (
              <table className="list-table account-purchase-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order</th>
                    <th>Plan</th>
                    <th>Total</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{formatLongDate(order.createdAt)}</td>
                      <td>{formatShortOrderNumber(order.orderNumber)}</td>
                      <td>{plans.find((entry) => entry.id === order.planTier)?.name ?? order.planTier}</td>
                      <td>{formatCurrency(order.amount)}</td>
                      <td>
                        <a
                          href={`/api/account/invoices/${order.id}`}
                          className="button button-secondary account-invoice-button"
                          title="Download invoice"
                          aria-label="Download invoice"
                        >
                          <Download size={14} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="account-purchases-empty">No purchase history yet.</p>
            )}
          </article>
          <div className="account-links-stack">
            <article className="account-card account-card-links">
              <div className="account-card-heading">
                <h2>Quick links</h2>
              </div>
              <div className="account-quick-links">
                <Link href="/resources" className="account-quick-link">
                  <LibraryBig size={20} />
                  <span>Curriculum Library</span>
                </Link>
                {canUseLessonBuilder ? (
                  <Link href="/lesson-builder" className="account-quick-link">
                    <Blocks size={20} />
                    <span>Lesson tools</span>
                  </Link>
                ) : null}
                <a href="#team-members-panel" className="account-quick-link">
                  <Users size={20} />
                  <span>Invited accounts</span>
                </a>
                <Link href={`/subscribe?tier=${membership.planTier}`} className="account-quick-link">
                  <BadgeDollarSign size={20} />
                  <span>Renew plan</span>
                </Link>
              </div>
            </article>

            <article className="account-card account-card-verse">
              <blockquote className="account-verse-quote">“{verseOfTheDay.text}”</blockquote>
              <p className="account-verse-reference">{verseOfTheDay.reference}</p>
            </article>
          </div>
        </section>
        <section className="dashboard-grid account-bottom-grid">
          <article className="account-card account-card-glance">
            <div className="account-card-heading">
              <h2>This week at a glance</h2>
            </div>
            <div className="account-glance-layout">
              <div className="account-glance-grid">
                <div className="account-glance-item account-glance-item-purple">
                  <BookOpenText size={18} />
                  <strong>Continue last lesson</strong>
                  <span>
                    {purchaseOrders[0]?.orderNumber
                      ? formatShortOrderNumber(purchaseOrders[0].orderNumber)
                      : "Curriculum ready to explore"}
                  </span>
                </div>
                <div className="account-glance-item account-glance-item-green">
                  <CalendarDays size={18} />
                  <strong>Plan Sunday session</strong>
                  <span>{plan?.name ?? "Membership active"}</span>
                </div>
                <div className="account-glance-item account-glance-item-pink">
                  <Users size={18} />
                  <strong>Assign team tasks</strong>
                  <span>{additionalTeamMembersAdded} active team members</span>
                </div>
              </div>

              <div className="account-glance-side">
                <div className="account-card-heading">
                  <h2>Recent activity</h2>
                </div>
                <ul className="account-activity-list">
                  {recentTeamActivities.map((activity) => (
                    <li key={`${activity.name}-${activity.timeLabel}`}>
                      <span
                        className={`account-activity-avatar ${activity.avatarClassName}`}
                        aria-hidden="true"
                      >
                        {activity.initials}
                      </span>
                      <span className="account-activity-copy">{activity.text}</span>
                      <span className="account-activity-time">{activity.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </section>
        </>
      ) : (
        <>
        <section className="dashboard-grid account-history-links-grid account-history-links-grid-member">
          <article className="account-card account-card-links">
            <div className="account-card-heading">
              <h2>Quick links</h2>
            </div>
            <div className="account-quick-links">
              <Link href="/resources" className="account-quick-link">
                <LibraryBig size={20} />
                <span>Curriculum Library</span>
              </Link>
              {canUseLessonBuilder ? (
                <Link href="/lesson-builder" className="account-quick-link">
                  <Blocks size={20} />
                  <span>Lesson tools</span>
                </Link>
              ) : null}
              <a href="#team-members-panel" className="account-quick-link">
                <Users size={20} />
                <span>Team access</span>
              </a>
              <Link href="/resources" className="account-quick-link">
                <BadgeDollarSign size={20} />
                <span>Browse plans</span>
              </Link>
            </div>
          </article>
          <article className="account-card account-card-verse">
            <blockquote className="account-verse-quote">“{verseOfTheDay.text}”</blockquote>
            <p className="account-verse-reference">{verseOfTheDay.reference}</p>
          </article>
        </section>
        <section className="dashboard-grid account-bottom-grid">
          <article className="account-card account-card-glance">
            <div className="account-card-heading">
              <h2>This week at a glance</h2>
            </div>
            <div className="account-glance-layout">
              <div className="account-glance-grid">
                <div className="account-glance-item account-glance-item-purple">
                  <BookOpenText size={18} />
                  <strong>Explore this week</strong>
                  <span>{membership.churchName}</span>
                </div>
                <div className="account-glance-item account-glance-item-green">
                  <CalendarDays size={18} />
                  <strong>Plan Sunday session</strong>
                  <span>{plan?.name ?? "Membership active"}</span>
                </div>
                <div className="account-glance-item account-glance-item-pink">
                  <Users size={18} />
                  <strong>Stay connected</strong>
                  <span>{accountHolderEmail ?? "Your account holder is here to help"}</span>
                </div>
              </div>
              <div className="account-glance-side">
                <div className="account-card-heading">
                  <h2>Recent activity</h2>
                </div>
                <ul className="account-activity-list">
                  <li>
                    <CircleCheckBig size={16} />
                    <span>{currentMemberName} opened the dashboard today.</span>
                  </li>
                  <li>
                    <CircleCheckBig size={16} />
                    <span>Curriculum access is ready for your next lesson.</span>
                  </li>
                  <li>
                    <CircleCheckBig size={16} />
                    <span>Lesson planning tools are ready when your team needs them.</span>
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </section>
        </>
      )}
    </main>
  );
}
