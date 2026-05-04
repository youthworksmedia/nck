import Link from "next/link";
import {
  BookOpenText,
  CreditCard,
  LayoutDashboard,
  LibraryBig,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { getCurrentUser } from "@/lib/portal";

export async function MemberShell({ children }: { children: React.ReactNode }) {
  const [user, isSuperAdmin] = await Promise.all([getCurrentUser(), isCurrentUserSuperAdmin()]);
  const displayName =
    user && "user_metadata" in user && typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user?.email?.split("@")[0] ?? "Member";

  const navItems = [
    { href: "/account", label: "Dashboard", icon: LayoutDashboard },
    { href: "/resources", label: "Lessons", icon: BookOpenText },
    { href: "/team", label: "Team", icon: Users },
    { href: "/subscribe", label: "Subscription", icon: CreditCard }
  ] as const;

  return (
    <div className="member-shell">
      <aside className="member-sidebar" aria-label="Member navigation">
        <Link href="/account" className="member-brand">
          <span className="member-brand-mark">NCK</span>
          <span>
            <strong>New Creation Kids</strong>
            <small>Member portal</small>
          </span>
        </Link>
        <nav className="member-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="member-nav-link">
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isSuperAdmin ? (
            <Link href="/content" className="member-nav-link member-nav-link-admin">
              <ShieldCheck size={18} />
              <span>Admin Content</span>
            </Link>
          ) : null}
        </nav>
      </aside>
      <div className="member-workspace">
        <header className="member-topbar">
          <div>
            <span className="member-topbar-kicker">Signed in</span>
            <strong>{displayName}</strong>
          </div>
          <div className="member-topbar-actions">
            <Link href="/account" className="member-icon-link" aria-label="Account settings">
              <Settings size={18} />
            </Link>
            <LogoutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
