import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import {
  CreditCard,
  Quote,
  Users
} from "lucide-react";

import { DashboardSeenMarker } from "@/components/dashboard-seen-marker";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getDashboardWelcomeSettings, getRotatingReturningWelcomeHtml } from "@/lib/dashboard-settings";
import { getDashboardStateSnapshot } from "@/lib/dashboard-state";
import {
  getCurrentUser,
  getMemberAccessSnapshot,
  getMembershipSnapshot,
  isCurrentUserOwner
} from "@/lib/portal";
import { getPublicResources } from "@/lib/public-resources";
import { getPlans } from "@/lib/plans";
import { buildPrivateMetadata } from "@/lib/metadata";
import { formatLongDateWithOrdinal } from "@/lib/time";
import { normalizeCurriculumSection, normalizeCurriculumYear } from "@/lib/curriculum";
import type { Resource } from "@/types";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Dashboard",
  description: "View your New Creation Kids dashboard and current curriculum."
});

type AccountPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    order?: string;
  }>;
};

function getTimeOfDayGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      hour12: false,
      timeZone: "Australia/Sydney"
    }).format(new Date())
  );

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatVolumeLabel(yearCycle?: string) {
  const year = normalizeCurriculumYear(yearCycle);
  return year.replace(/^Volume\s+/i, "Vol ");
}

function formatLastResourceLabel(resource: Resource) {
  const volume = formatVolumeLabel(resource.yearCycle);
  const unit = normalizeCurriculumSection(resource.term);
  const week = `Week ${resource.lessonNumber ?? 1}`;

  return `${resource.title} (${volume} / ${unit} / ${week})`;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) ?? {};
  const [membership, access, user, isOwner, isSuperAdmin, plans, settings, resources] = await Promise.all([
    getMembershipSnapshot(),
    getMemberAccessSnapshot(),
    getCurrentUser(),
    isCurrentUserOwner(),
    isCurrentUserSuperAdmin(),
    getPlans(),
    getDashboardWelcomeSettings(),
    getPublicResources()
  ]);
  const dashboardState = await getDashboardStateSnapshot(resources);

  const userFullName =
    user && "user_metadata" in user && typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;
  const ownerName =
    membership.accountHolderName ||
    userFullName ||
    user?.email?.split("@")[0] ||
    "Friend";
  const currentMemberName =
    userFullName ??
    user?.email?.split("@")[0] ??
    "Friend";
  const displayName = isOwner ? ownerName : currentMemberName;
  const greeting = getTimeOfDayGreeting();
  const plan = plans.find((entry) => entry.id === membership.planTier);
  const planLabel = plan?.name ?? "";
  const accountContextLabel = isSuperAdmin
    ? "Super admin access"
    : membership.subscriptionStatus === "inactive"
      ? "No active membership"
      : isOwner
        ? [membership.churchName, planLabel ? `${planLabel} plan` : ""].filter(Boolean).join(" · ")
        : membership.churchName;
  const canShowDashboardActions = isOwner || isSuperAdmin;
  const hasExpiredSubscription = Boolean(user && !access.hasActiveAccount && !isSuperAdmin);
  const expiredDate = formatLongDateWithOrdinal(membership.renewalDate);
  const expiredMessage = isOwner
    ? "Please renew subscription for access to content."
    : `Please contact account holder ${membership.accountHolderName ?? "Account holder"} from ${membership.churchName} for renewal.`;
  const showFirstTimeWelcome = user && !dashboardState.hasSeenDashboard;
  const verseOptions = settings.bibleVerses;
  const returningWelcomeHtml = getRotatingReturningWelcomeHtml(settings);
  const verseOfTheDay = verseOptions[
    ((new Date().getDate() + new Date().getMonth()) % verseOptions.length + verseOptions.length) %
      verseOptions.length
  ];
  const continueHref = dashboardState.lastResource
    ? (`/resources/${dashboardState.lastResource.id}` as Route)
    : null;
  const lastResourceLabel = dashboardState.lastResource
    ? formatLastResourceLabel(dashboardState.lastResource)
    : null;

  return (
    <main className="site-shell section account-page">
      {showFirstTimeWelcome ? <DashboardSeenMarker /> : null}
      {params.checkout === "success" ? (
        <div className="panel checkout-success-banner">
          <strong>Purchase successful.</strong> Your annual membership is now active
          {params.order ? ` · ${params.order}` : ""}.
        </div>
      ) : null}

      <section className="dashboard-hero">
        <div className="account-owner-hero-copy">
          <div className="section-head app-page-head">
            <div>
              <h1>{greeting}, {displayName}</h1>
            </div>
          </div>
          <p className="account-owner-hero-summary">{accountContextLabel}</p>
        </div>
      </section>

      {hasExpiredSubscription ? (
        <section className="account-expired-content-notice panel" role="status">
          <span className="eyebrow">Subscription expired</span>
          <h2>Subscription has expired ({expiredDate}).</h2>
          <p>{expiredMessage}</p>
          {isOwner ? (
            <Link href="/account/subscription" className="button button-primary account-expired-renew-button">
              <CreditCard size={18} />
              <span>Renew subscription</span>
            </Link>
          ) : null}
        </section>
      ) : null}

      {showFirstTimeWelcome ? (
        <section className="dashboard-onboarding-layout">
          <article
            className="dashboard-welcome-card dashboard-rich-content"
            dangerouslySetInnerHTML={{ __html: settings.firstTimeHtml }}
          />
          {settings.introVideoUrl ? (
            <a
              href={settings.introVideoUrl}
              className="dashboard-video-card"
              target="_blank"
              rel="noreferrer"
            >
              <span className="dashboard-video-play" aria-hidden="true" />
              <span className="dashboard-video-eyebrow">Watch</span>
              <strong>{settings.introVideoTitle}</strong>
            </a>
          ) : null}
        </section>
      ) : (
        <section className={`dashboard-returning-layout ${canShowDashboardActions ? "dashboard-returning-layout-owner" : ""}`}>
          <div className="dashboard-main-column">
            <article
              className="dashboard-welcome-card dashboard-rich-content dashboard-returning-card"
              dangerouslySetInnerHTML={{ __html: returningWelcomeHtml }}
            />
            {continueHref && dashboardState.lastResource ? (
              <Link href={continueHref} className="dashboard-continue-card">
                <span>Start with:</span>
                <strong>{lastResourceLabel}</strong>
              </Link>
            ) : (
              <Link href="/resources" className="dashboard-continue-card">
                <span>Start with:</span>
                <strong>Teach resources</strong>
              </Link>
            )}
          </div>
          {canShowDashboardActions ? (
            <aside className="dashboard-owner-actions" aria-label="Account holder shortcuts">
              <Link href="/account/team" className="dashboard-owner-action-card">
                <Users size={22} />
                <span>
                  <strong>Manage Team</strong>
                  <small>Add and edit accounts</small>
                </span>
              </Link>
              <Link href="/account/subscription" className="dashboard-owner-action-card">
                <CreditCard size={22} />
                <span>
                  <strong>Account</strong>
                  <small>Subscription &amp; invoices</small>
                </span>
              </Link>
            </aside>
          ) : null}
        </section>
      )}

      <section className="dashboard-grid account-history-links-grid account-history-links-grid-member">
        <article className="account-card account-card-verse">
          <span className="account-verse-icon" aria-hidden="true"><Quote size={24} fill="currentColor" /></span>
          <blockquote className="account-verse-quote">"{verseOfTheDay.text}"</blockquote>
          <p className="account-verse-reference">{verseOfTheDay.reference}</p>
        </article>
      </section>
    </main>
  );
}
