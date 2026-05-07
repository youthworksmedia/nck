import Link from "next/link";
import { CreditCard, LayoutDashboard } from "lucide-react";

import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/portal";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-shell">
      <div className="nav-card">
        <Link href="/" className="brand-mark">
          <span className="brand-placeholder-logo" aria-hidden="true">NCK</span>
          <span className="brand-placeholder-text">New Creation Kids</span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <>
              <Link href="/account" className="nav-dashboard-button">
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/subscribe" className="nav-dashboard-button">
                <CreditCard size={16} />
                <span>Subscribe</span>
              </Link>
              <Link href="/login">Login</Link>
            </>
          )}
        </div>
        <MobileNavMenu items={[]} isLoggedIn={Boolean(user)} />
      </div>
    </header>
  );
}
