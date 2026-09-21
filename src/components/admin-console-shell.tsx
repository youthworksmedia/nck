import type { Route } from "next";
import Link from "next/link";
import {
  BookOpenText,
  CreditCard,
  FolderOpen,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Package,
  Settings,
  Users
} from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { curriculumYears } from "@/lib/curriculum";

type AdminSection =
  | "overview"
  | "content"
  | "products"
  | "leaders"
  | "leader-games"
  | "family"
  | "leader-resources"
  | "faqs"
  | "accounts"
  | "transactions"
  | "media"
  | "performance"
  | "settings";

type Props = {
  activeSection: AdminSection;
  activeAccountsTab?: "account-holders" | "admins" | "discounts";
  activeYear?: string;
  children: React.ReactNode;
  userEmail?: string | null;
};

function adminHref(params: {
  section?: string;
  tab?: string;
  year?: string;
  term?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.section) searchParams.set("section", params.section);
  if (params.tab) searchParams.set("tab", params.tab);
  if (params.year) searchParams.set("year", params.year);
  if (params.term) searchParams.set("term", params.term);

  const query = searchParams.toString();
  return (query ? `/admin?${query}` : "/admin") as Route;
}

export function AdminConsoleShell({
  activeSection,
  activeAccountsTab = "account-holders",
  activeYear,
  children,
  userEmail
}: Props) {
  const selectedYear = activeYear ?? curriculumYears[0];

  return (
    <div className="admin-console">
      <aside className="admin-console-sidebar" aria-label="Admin navigation">
        <Link href="/admin" className="member-brand admin-console-brand">
          <strong>New Creation Kids</strong>
        </Link>

        <nav className="admin-console-nav">
          <Link
            href="/admin"
            className={`admin-console-link ${activeSection === "overview" ? "admin-console-link-active" : ""}`}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </Link>

          <div className="admin-console-nav-group">
            <Link
              href={adminHref({ section: "content", year: selectedYear })}
              className={`admin-console-link ${activeSection === "content" ? "admin-console-link-active" : ""}`}
            >
              <BookOpenText size={18} />
              <span>Teach</span>
            </Link>
            <div className="admin-console-year-links" aria-label="Content years">
              {curriculumYears.map((year) => (
                <Link
                  key={year}
                  href={adminHref({ section: "content", year })}
                  className={activeSection === "content" && activeYear === year ? "is-active" : ""}
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>

          <div className="admin-console-nav-group">
            <Link
              href={adminHref({ section: "leaders" })}
              className={`admin-console-link ${
                activeSection === "leaders" || activeSection === "leader-games"
                  ? "admin-console-link-active"
                  : ""
              }`}
            >
              <Users size={18} />
              <span>Leaders</span>
            </Link>
            {activeSection === "leaders" || activeSection === "leader-games" ? (
              <div className="admin-console-year-links" aria-label="Leader resource sections">
                <Link
                  href={adminHref({ section: "leaders" })}
                  className={activeSection === "leaders" ? "is-active" : ""}
                >
                  Resources
                </Link>
                <Link
                  href={adminHref({ section: "leader-games" })}
                  className={activeSection === "leader-games" ? "is-active" : ""}
                >
                  Games
                </Link>
              </div>
            ) : null}
          </div>

          <Link
            href={adminHref({ section: "leader-resources" })}
            className={`admin-console-link ${activeSection === "leader-resources" ? "admin-console-link-active" : ""}`}
          >
            <Users size={18} />
            <span>Ministry Leaders</span>
          </Link>
          <div className="admin-console-nav-group">
            <Link
              href={adminHref({ section: "family", year: selectedYear })}
              className={`admin-console-link ${activeSection === "family" ? "admin-console-link-active" : ""}`}
            >
              <Users size={18} />
              <span>Family</span>
            </Link>
            <div className="admin-console-year-links" aria-label="Family resource volumes">
              {curriculumYears.map((year) => (
                <Link
                  key={year}
                  href={adminHref({ section: "family", year })}
                  className={activeSection === "family" && selectedYear === year ? "is-active" : ""}
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href={adminHref({ section: "products" })}
            className={`admin-console-link ${activeSection === "products" ? "admin-console-link-active" : ""}`}
          >
            <Package size={18} />
            <span>Products</span>
          </Link>
          <Link
            href={adminHref({ section: "faqs" })}
            className={`admin-console-link ${activeSection === "faqs" ? "admin-console-link-active" : ""}`}
          >
            <HelpCircle size={18} />
            <span>Help &amp; FAQs</span>
          </Link>
          <div className="admin-console-nav-group">
            <Link
              href={adminHref({ section: "accounts" })}
              className={`admin-console-link ${activeSection === "accounts" ? "admin-console-link-active" : ""}`}
            >
              <Users size={18} />
              <span>Accounts</span>
            </Link>
            <div className="admin-console-year-links" aria-label="Account sections">
              <Link
                href={adminHref({ section: "accounts" })}
                className={activeSection === "accounts" && activeAccountsTab === "account-holders" ? "is-active" : ""}
              >
                Account holders
              </Link>
              <Link
                href={adminHref({ section: "accounts", tab: "discounts" })}
                className={activeSection === "accounts" && activeAccountsTab === "discounts" ? "is-active" : ""}
              >
                Discounts
              </Link>
              <Link
                href={adminHref({ section: "accounts", tab: "admins" })}
                className={activeSection === "accounts" && activeAccountsTab === "admins" ? "is-active" : ""}
              >
                Admin
              </Link>
            </div>
          </div>
          <Link
            href={adminHref({ section: "transactions" })}
            className={`admin-console-link ${activeSection === "transactions" ? "admin-console-link-active" : ""}`}
          >
            <CreditCard size={18} />
            <span>Transactions</span>
          </Link>
          <Link
            href={adminHref({ section: "media" })}
            className={`admin-console-link ${activeSection === "media" ? "admin-console-link-active" : ""}`}
          >
            <FolderOpen size={18} />
            <span>Media folder</span>
          </Link>
          <Link
            href={adminHref({ section: "performance" })}
            className={`admin-console-link ${activeSection === "performance" ? "admin-console-link-active" : ""}`}
          >
            <Gauge size={18} />
            <span>Performance</span>
          </Link>
          <Link
            href={adminHref({ section: "settings" })}
            className={`admin-console-link ${activeSection === "settings" ? "admin-console-link-active" : ""}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      <div className="admin-console-workspace">
        <header className="admin-console-topbar">
          <div>
            <span className="member-topbar-kicker">Admin signed in</span>
            <strong>{userEmail ?? "Admin"}</strong>
          </div>
          <div className="member-topbar-actions">
            <Link href="/account" className="button button-secondary" target="_blank" rel="noreferrer">
              Member area
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main className="admin-console-main">{children}</main>
      </div>
    </div>
  );
}
