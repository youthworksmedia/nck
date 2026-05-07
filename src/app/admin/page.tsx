import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpenText,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Plus,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

import { AdminEmailSettingsForm } from "@/components/admin-email-settings-form";
import { AdminFileLibrary } from "@/components/admin-file-library";
import { AdminResourceForm } from "@/components/admin-resource-form";
import { AdminResourceList } from "@/components/admin-resource-list";
import { LogoutButton } from "@/components/logout-button";
import { SuperAdminForm } from "@/components/super-admin-form";
import { SuperAdminNameForm } from "@/components/super-admin-name-form";
import {
  getAccountHolderSummaries,
  getAdminResources,
  getAdminTermNotes,
  getPurchaseOrders,
  getSuperAdminEmails,
  isCurrentUserSuperAdmin
} from "@/lib/admin-access";
import { getEmailTemplates } from "@/lib/email-settings";
import { buildPrivateMetadata } from "@/lib/metadata";
import { plans } from "@/lib/plans";
import { getCurrentUser } from "@/lib/portal";
import { listStoredResourceFiles } from "@/lib/resource-assets";
import { formatDateTime } from "@/lib/time";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Admin",
  description: "Admin area for New Creation Kids."
});

type AdminPageProps = {
  searchParams: Promise<{
    section?: string;
    tab?: string;
    year?: string;
    term?: string;
  }>;
};

const years = ["Year A", "Year B", "Year C"] as const;

function getSection(value?: string) {
  if (
    value === "content" ||
    value === "accounts" ||
    value === "transactions" ||
    value === "media" ||
    value === "admins" ||
    value === "settings"
  ) {
    return value;
  }

  return "overview";
}

function getYear(value?: string) {
  return value === "Year B" || value === "Year C" ? value : "Year A";
}

function getTerm(value?: string) {
  return value === "Term 2" || value === "Term 3" || value === "Term 4" ? value : "Term 1";
}

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

function planName(tier: string) {
  return plans.find((plan) => plan.id === tier)?.name ?? tier;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [params, user, isSuperAdmin] = await Promise.all([
    searchParams,
    getCurrentUser(),
    isCurrentUserSuperAdmin()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/account");
  }

  const activeSection = getSection(params.section);
  const activeYear = getYear(params.year);
  const activeTerm = getTerm(params.term);
  const activeTab = params.tab === "add" ? "add" : "library";
  const [resources, files, termNotes, accountHolders, orders, admins, emailTemplates] = await Promise.all([
    getAdminResources(),
    listStoredResourceFiles(),
    getAdminTermNotes(),
    getAccountHolderSummaries(),
    getPurchaseOrders(),
    getSuperAdminEmails(),
    getEmailTemplates()
  ]);
  const selectedLessons = resources.filter(
    (resource) => (resource.yearCycle ?? "Year A") === activeYear && (resource.term ?? "Term 1") === activeTerm
  );

  return (
    <div className="admin-console">
      <aside className="admin-console-sidebar" aria-label="Admin navigation">
        <Link href="/admin" className="member-brand admin-console-brand">
          <span className="member-brand-mark">NCK</span>
          <span>
            <strong>New Creation Kids</strong>
            <small>Admin console</small>
          </span>
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
              href={adminHref({ section: "content", year: activeYear })}
              className={`admin-console-link ${activeSection === "content" ? "admin-console-link-active" : ""}`}
            >
              <BookOpenText size={18} />
              <span>Content</span>
            </Link>
            <div className="admin-console-year-links" aria-label="Content years">
              {years.map((year) => (
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

          <Link
            href={adminHref({ section: "accounts" })}
            className={`admin-console-link ${activeSection === "accounts" ? "admin-console-link-active" : ""}`}
          >
            <Users size={18} />
            <span>Account holders</span>
          </Link>
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
            href={adminHref({ section: "admins" })}
            className={`admin-console-link ${activeSection === "admins" ? "admin-console-link-active" : ""}`}
          >
            <ShieldCheck size={18} />
            <span>Admin accounts</span>
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
            <strong>{user.email ?? "Super admin"}</strong>
          </div>
          <div className="member-topbar-actions">
            <Link href="/account" className="button button-secondary">
              Member area
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main className="admin-console-main">
          {activeSection === "overview" ? (
            <>
              <div className="section-head app-page-head admin-console-head">
                <div>
                  <span className="eyebrow">Admin</span>
                  <h1>Admin console</h1>
                  <p>Manage curriculum content, accounts, transactions, media, and admin access.</p>
                </div>
              </div>
              <section className="admin-metric-grid">
                <article>
                  <span>Lessons</span>
                  <strong>{resources.length}</strong>
                  <small>Across Year A to Year C</small>
                </article>
                <article>
                  <span>Account holders</span>
                  <strong>{accountHolders.length}</strong>
                  <small>{accountHolders.reduce((total, account) => total + account.teamMembers.length, 0)} invited sub accounts</small>
                </article>
                <article>
                  <span>Transactions</span>
                  <strong>{orders.length}</strong>
                  <small>{orders.filter((order) => order.paymentStatus === "paid").length} paid</small>
                </article>
                <article>
                  <span>Media files</span>
                  <strong>{files.length}</strong>
                  <small>General</small>
                </article>
              </section>
              <section className="panel admin-console-card">
                <div className="section-head">
                  <div>
                    <h2>Current content area</h2>
                    <p>{activeYear} {activeTerm} has {selectedLessons.length} lesson entries.</p>
                  </div>
                  <Link href={adminHref({ section: "content", year: activeYear, term: activeTerm })} className="button button-primary">
                    <FileText size={16} />
                    <span>Open content</span>
                  </Link>
                </div>
              </section>
            </>
          ) : null}

          {activeSection === "content" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Content</h1>
                  <p>{activeYear} {activeTerm}: add, edit, reorder, or delete lesson content.</p>
                </div>
                {activeTab === "add" ? (
                  <Link
                    href={adminHref({ section: "content", year: activeYear, term: activeTerm })}
                    className="button button-secondary"
                  >
                    <FileText size={16} />
                    <span>Back to content</span>
                  </Link>
                ) : (
                  <Link
                    href={adminHref({ section: "content", tab: "add", year: activeYear, term: activeTerm })}
                    className="button button-primary"
                  >
                    <Plus size={16} />
                    <span>Add content</span>
                  </Link>
                )}
              </div>

              {activeTab === "add" ? (
                <AdminResourceForm
                  files={files}
                  initialYearCycle={activeYear}
                  initialTerm={activeTerm}
                  basePath="/admin"
                />
              ) : (
                <AdminResourceList
                  resources={resources}
                  files={files}
                  activeYear={activeYear}
                  activeTerm={activeTerm}
                  termNotes={termNotes}
                  basePath="/admin"
                />
              )}
            </section>
          ) : null}

          {activeSection === "accounts" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Account holders</h1>
                  <p>Open an account holder to see every invited sub account.</p>
                </div>
              </div>
              <div className="account-expand-summary account-expand-summary-head" aria-hidden="true">
                <span />
                <span>Name</span>
                <span>Account holder</span>
                <span>Plan</span>
                <span>Started</span>
                <span>Status</span>
              </div>
              <div className="stack-sm">
                {accountHolders.length ? (
                  accountHolders.map((account) => (
                    <details className="account-expand" key={account.organizationId}>
                      <summary className="account-expand-summary">
                        <span className="expand-mark">+</span>
                        <strong>{account.accountHolderName}</strong>
                        <span>{account.accountHolderEmail}</span>
                        <span>{planName(account.planTier)}</span>
                        <span>{account.joinedAt}</span>
                        <span>{account.subscriptionStatus}</span>
                      </summary>
                      <div className="account-expand-body">
                        <p><strong>Church:</strong> {account.churchName}</p>
                        <table className="list-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.teamMembers.length ? (
                              account.teamMembers.map((member) => (
                                <tr key={member.id}>
                                  <td>{member.name}</td>
                                  <td>{member.email}</td>
                                  <td>{member.role}</td>
                                  <td>{member.status}</td>
                                  <td>{member.joinedAt}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5}>No sub accounts invited yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))
                ) : (
                  <p>No account holders yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeSection === "transactions" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Transactions</h1>
                  <p>All checkout orders and payment records.</p>
                </div>
              </div>
              <div className="order-expand-summary account-expand-summary-head" aria-hidden="true">
                <span />
                <span>Order</span>
                <span>Account holder</span>
                <span>Plan</span>
                <span>Total</span>
                <span>Purchased</span>
                <span>Status</span>
              </div>
              <div className="stack-sm">
                {orders.length ? (
                  orders.map((order) => (
                    <details className="account-expand" key={order.id}>
                      <summary className="order-expand-summary">
                        <span className="expand-mark">+</span>
                        <strong>{order.orderNumber}</strong>
                        <span>{order.accountHolderEmail}</span>
                        <span>{planName(order.planTier)}</span>
                        <span>{formatCurrency(order.amount)}</span>
                        <span>{formatDateTime(order.createdAt)}</span>
                        <span>{order.paymentStatus}</span>
                      </summary>
                      <div className="account-expand-body order-expand-body">
                        <div className="order-detail-grid">
                          <p><strong>Account holder:</strong> {order.accountHolderName}</p>
                          <p><strong>Church:</strong> {order.churchName}</p>
                          <p><strong>Payment:</strong> {order.cardBrand} ending in {order.cardLast4}</p>
                          <p><strong>Provider:</strong> {order.paymentProvider}</p>
                          <p className="order-detail-address">
                            <strong>Billing address:</strong> {order.billingAddressLine1}, {order.billingSuburb}, {order.billingState} {order.billingPostcode}, {order.billingCountry}
                          </p>
                        </div>
                      </div>
                    </details>
                  ))
                ) : (
                  <p>No transactions yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeSection === "media" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Media folder</h1>
                  <p>Upload lesson resource files to the General folder.</p>
                </div>
              </div>
              <AdminFileLibrary files={files} />
            </section>
          ) : null}

          {activeSection === "admins" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Admin accounts</h1>
                  <p>Admin users sign in from the same login page and land in this console.</p>
                </div>
              </div>
              <SuperAdminForm />
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th aria-label="Name actions" />
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.userId}>
                      <td>{admin.displayName}</td>
                      <td>{admin.email}</td>
                      <td>{admin.role}</td>
                      <td>
                        <SuperAdminNameForm
                          userId={admin.userId}
                          email={admin.email}
                          initialName={admin.displayName}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {activeSection === "settings" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Settings</h1>
                  <p>Update global settings for New Creation Kids.</p>
                </div>
              </div>
              <div className="admin-top-tabs" role="tablist" aria-label="Settings tabs">
                <span className="admin-top-tab admin-top-tab-active">Emails</span>
              </div>
              <AdminEmailSettingsForm templates={emailTemplates} />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
