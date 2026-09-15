import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { CreditCard, Eye, LayoutDashboard } from "lucide-react";

import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/portal";

type SiteHeaderViewProps = {
  isLoggedIn: boolean;
  showMarketingNav?: boolean;
};

const publicMarketingNavItems = [
  { href: "/#teaching-cycle", label: "Curriculum" },
  { href: "/#platform", label: "Platform" },
  { href: "/#subscription-plans", label: "Buy" },
  { href: "/#questions", label: "FAQ" }
] satisfies Array<{ href: Route; label: string }>;

function SiteHeaderView({ isLoggedIn, showMarketingNav = false }: SiteHeaderViewProps) {
  return (
    <header className="site-shell">
      <div className="nav-card">
        <Link href="/" className="brand-mark" aria-label="New Creation Kids homepage">
          <Image
            src={isLoggedIn ? "/nck-logo-horiz.svg" : "/nck-logo-horiz-public.svg"}
            alt="New Creation Kids"
            width={226}
            height={61}
            className="brand-logo-image"
            priority
          />
        </Link>
        {showMarketingNav ? (
          <nav className="nav-links public-marketing-nav" aria-label="Primary">
            {publicMarketingNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <Link href="/account" className="nav-dashboard-button">
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/#subscription-plans" className="nav-dashboard-button">
                <CreditCard size={16} />
                <span>Subscribe</span>
              </Link>
              <Link href="/resources" className="nav-dashboard-button nav-preview-button">
                <Eye size={16} />
                <span>Preview</span>
              </Link>
              <Link href="/login">Login</Link>
            </>
          )}
        </div>
        <MobileNavMenu items={showMarketingNav ? publicMarketingNavItems : []} isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}

export function PublicSiteHeader() {
  return <SiteHeaderView isLoggedIn={false} showMarketingNav />;
}

export async function SiteHeader({
  showMarketingNav = false
}: {
  showMarketingNav?: boolean;
}) {
  const user = await getCurrentUser();

  return <SiteHeaderView isLoggedIn={Boolean(user)} showMarketingNav={showMarketingNav} />;
}
