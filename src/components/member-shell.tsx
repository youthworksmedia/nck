import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { CreditCard, Eye, HelpCircle } from "lucide-react";

import { MemberMobileMenu } from "@/components/member-mobile-menu";
import { LogoutButton } from "@/components/logout-button";
import { MemberSidebarNav } from "@/components/member-sidebar-nav";
import { getMemberAccessSnapshot } from "@/lib/portal";
import { formatLongDateWithOrdinal } from "@/lib/time";

function getInitials(name?: string | null) {
  if (!name) {
    return "NK";
  }

  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "NK"
  );
}

export async function MemberShell({ children }: { children: React.ReactNode }) {
  const access = await getMemberAccessSnapshot();
  const { user, isOwner, isSuperAdmin } = access;
  const metadataName =
    user && "user_metadata" in user && typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;
  const userName =
    access.displayName ||
    metadataName ||
    user?.email?.split("@")[0] ||
    "Guest";
  const churchLabel = access.churchName && access.churchName !== "No active membership"
    ? access.churchName
    : "New Creation Kids";
  const userRoleLabel = isSuperAdmin ? "Admin" : "Member";
  const renewHref = "/account/subscription" as Route;
  const currentYear = new Date().getFullYear();
  const expiredDate = formatLongDateWithOrdinal(access.renewalDate);

  return (
    <div className="member-shell">
      <aside className="member-sidebar" aria-label="Member navigation">
        <div className="member-sidebar-brand">
          <Link href="/" className="member-sidebar-logo" aria-label="New Creation Kids homepage">
            <Image
              src="/nck-logo-horiz.svg"
              alt="New Creation Kids"
              width={226}
              height={61}
              className="member-sidebar-logo-image"
              priority
            />
          </Link>
          <span className="member-account-name">
            {churchLabel}
            {user && access.hasActiveAccount ? <span className="member-account-active-dot" aria-label="Active account" /> : null}
          </span>
          {user && !access.hasActiveAccount ? (
            <span className="member-account-expired">
              Subscription expired ({expiredDate})
              {isOwner ? (
                <>
                  , please <Link href={renewHref}>renew</Link>
                </>
              ) : null}
            </span>
          ) : null}
        </div>

        <MemberSidebarNav isSuperAdmin={isSuperAdmin} isOwner={isOwner} />

        <div className="member-sidebar-bottom">
          {user ? (
            <Link href={"/help" as Route} className="member-sidebar-help-link">
              <HelpCircle size={18} />
              <span>Help &amp; FAQs</span>
            </Link>
          ) : null}
          {user ? (
            <div className="member-sidebar-footer">
              <span className="member-avatar">{getInitials(userName)}</span>
              <span className="member-sidebar-user">
                <strong>{userName}</strong>
                <small>{userRoleLabel}</small>
              </span>
              <LogoutButton />
            </div>
          ) : null}
        </div>
      </aside>

      <div className="member-workspace">
        <header className={`member-topbar ${user ? "member-topbar-member" : "member-topbar-guest"}`}>
          <div className="member-topbar-menu-slot">
            <MemberMobileMenu
              churchLabel={churchLabel}
              hasActiveAccount={access.hasActiveAccount}
              isLoggedIn={Boolean(user)}
              isOwner={isOwner}
              planTier={access.planTier}
              renewalDate={expiredDate}
              isSuperAdmin={isSuperAdmin}
              userName={userName}
              userRoleLabel={userRoleLabel}
            />
          </div>
          {!user ? (
            <div className="member-topbar-actions">
              <Link href="/#subscription-plans" className="nav-dashboard-button">
                <CreditCard size={16} />
                <span>Subscribe</span>
              </Link>
              <Link href="/resources" className="nav-dashboard-button nav-preview-button">
                <Eye size={16} />
                <span>Preview</span>
              </Link>
              <Link href="/login" className="member-login-link">
                Login
              </Link>
            </div>
          ) : null}
        </header>
        {children}
        {user ? (
          <footer className="member-copyright-footer">
            <strong>
              © {currentYear} Youthworks.{" "}
              <Link href={"/help?item=technical-copyright#technical-copyright" as Route}>All rights reserved.</Link>
            </strong>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
