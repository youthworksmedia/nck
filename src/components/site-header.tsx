import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/portal";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const navItems = [
    { href: "/pricing", label: "Pricing" },
    { href: "/resources", label: "Lessons" },
    { href: "/account", label: "Dashboard" }
  ] as const;

  return (
    <header className="site-shell">
      <div className="nav-card">
        <Link href="/" className="brand-mark">
          <span className="brand-placeholder-logo" aria-hidden="true">NCK</span>
          <span className="brand-placeholder-text">New Creation Kids</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {navItems.map((item, index) => (
            <span key={`${item.href}-${item.label}`} className="nav-item-wrap">
              <Link href={item.href}>{item.label}</Link>
              {index < navItems.length - 1 ? <span className="nav-dot">•</span> : null}
            </span>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/account" className="nav-dashboard-button">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          {user ? <LogoutButton /> : <Link href="/login">Login</Link>}
        </div>
        <MobileNavMenu items={navItems} isLoggedIn={Boolean(user)} />
      </div>
    </header>
  );
}
