import type { Metadata } from "next";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Gamepad2, Image as ImageIcon, Plus } from "lucide-react";

import { AdminConsoleShell } from "@/components/admin-console-shell";
import {
  getAccountHolderSummaries,
  getAdminDiscountCodes,
  getAdminOverviewMetrics,
  getAdminProducts,
  getAdminResources,
  getPurchaseOrders,
  getSuperAdminEmails,
  isCurrentUserSuperAdmin
} from "@/lib/admin-access";
import {
  defaultHomepageSettings,
  getEmailTemplates,
  getGeneralEmailSettings,
  getHomepageSettings
} from "@/lib/email-settings";
import {
  defaultDashboardWelcomeSettings,
  getDashboardWelcomeSettings
} from "@/lib/dashboard-settings";
import { getAdminFamilyResources } from "@/lib/family-resources";
import { getAdminGames } from "@/lib/games-library";
import { getAdminHelpFaqs } from "@/lib/help-faqs";
import { getAdminLeaderResources } from "@/lib/leader-resources";
import { getAdminMinistryLeaderResources } from "@/lib/ministry-leader-resources";
import { getAdminUnitOverviews } from "@/lib/unit-overviews";
import {
  curriculumSections,
  curriculumYears,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { buildPrivateMetadata } from "@/lib/metadata";
import { getAdminPerformanceLogs, getAdminPerformanceRouteSummaries } from "@/lib/performance-logs";
import { getAdminPhotos } from "@/lib/photo-library";
import { plans } from "@/lib/plans";
import { getCurrentUser } from "@/lib/portal";
import { publicEnv } from "@/lib/public-env";
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

const years = curriculumYears;
const AdminEmailSettingsForm = dynamic(() =>
  import("@/components/admin-email-settings-form").then((module) => module.AdminEmailSettingsForm)
);
const AdminDiscountList = dynamic(() =>
  import("@/components/admin-discount-list").then((module) => module.AdminDiscountList)
);
const AdminAccountActions = dynamic(() =>
  import("@/components/admin-account-actions").then((module) => module.AdminAccountActions)
);
const DeleteAdminSubAccountButton = dynamic(() =>
  import("@/components/delete-admin-sub-account-button").then((module) => module.DeleteAdminSubAccountButton)
);
const AdminFileLibrary = dynamic(() =>
  import("@/components/admin-file-library").then((module) => module.AdminFileLibrary)
);
const AdminFamilyResources = dynamic(() =>
  import("@/components/admin-family-resources").then((module) => module.AdminFamilyResources)
);
const AdminGamesLibrary = dynamic(() =>
  import("@/components/admin-games-library").then((module) => module.AdminGamesLibrary)
);
const AdminPhotoLibrary = dynamic(() =>
  import("@/components/admin-photo-library").then((module) => module.AdminPhotoLibrary)
);
const AdminHelpFaqs = dynamic(() =>
  import("@/components/admin-help-faqs").then((module) => module.AdminHelpFaqs)
);
const AdminLeaderResources = dynamic(() =>
  import("@/components/admin-leader-resources").then((module) => module.AdminLeaderResources)
);
const AdminMinistryLeaderResources = dynamic(() =>
  import("@/components/admin-ministry-leader-resources").then((module) => module.AdminMinistryLeaderResources)
);
const AdminProductList = dynamic(() =>
  import("@/components/admin-product-list").then((module) => module.AdminProductList)
);
const AdminResourceForm = dynamic(() =>
  import("@/components/admin-resource-form").then((module) => module.AdminResourceForm)
);
const AdminResourceList = dynamic(() =>
  import("@/components/admin-resource-list").then((module) => module.AdminResourceList)
);
const AdminUnitOverviewEditor = dynamic(() =>
  import("@/components/admin-unit-overview-editor").then((module) => module.AdminUnitOverviewEditor)
);
const DeleteSuperAdminButton = dynamic(() =>
  import("@/components/delete-super-admin-button").then((module) => module.DeleteSuperAdminButton)
);
const SuperAdminForm = dynamic(() =>
  import("@/components/super-admin-form").then((module) => module.SuperAdminForm)
);
const SuperAdminNameForm = dynamic(() =>
  import("@/components/super-admin-name-form").then((module) => module.SuperAdminNameForm)
);

function getSection(value?: string) {
  if (
    value === "content" ||
    value === "products" ||
    value === "leaders" ||
    value === "leader-games" ||
    value === "leader-photos" ||
    value === "family" ||
    value === "leader-resources" ||
    value === "faqs" ||
    value === "accounts" ||
    value === "discounts" ||
    value === "transactions" ||
    value === "media" ||
    value === "performance" ||
    value === "settings"
  ) {
    return value;
  }

  if (value === "admins") {
    return "accounts";
  }

  return "overview";
}

function getYear(value?: string) {
  return normalizeCurriculumYear(value);
}

function getTerm(value?: string) {
  return normalizeCurriculumSection(value);
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

function planName(tier: string, productPlans = plans) {
  return productPlans.find((plan) => plan.id === tier)?.name ?? tier;
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
  const activeAccountsTab =
    params.section === "admins" || params.tab === "admins"
      ? "admins"
      : "account-holders";
  let overviewMetrics: Awaited<ReturnType<typeof getAdminOverviewMetrics>> | null = null;
  let resources: Awaited<ReturnType<typeof getAdminResources>> = [];
  let products: Awaited<ReturnType<typeof getAdminProducts>> = [];
  let leaders: Awaited<ReturnType<typeof getAdminLeaderResources>> = [];
  let games: Awaited<ReturnType<typeof getAdminGames>> = [];
  let photos: Awaited<ReturnType<typeof getAdminPhotos>> = [];
  let familyResources: Awaited<ReturnType<typeof getAdminFamilyResources>> = { cards: [], lessons: [], terms: [] };
  let leaderResources: Awaited<ReturnType<typeof getAdminMinistryLeaderResources>> = [];
  let helpFaqs: Awaited<ReturnType<typeof getAdminHelpFaqs>> = [];
  let files: Awaited<ReturnType<typeof listStoredResourceFiles>> = [];
  let unitOverviews: Awaited<ReturnType<typeof getAdminUnitOverviews>> = [];
  let accountHolders: Awaited<ReturnType<typeof getAccountHolderSummaries>> = [];
  let discounts: Awaited<ReturnType<typeof getAdminDiscountCodes>> = [];
  let orders: Awaited<ReturnType<typeof getPurchaseOrders>> = [];
  let admins: Awaited<ReturnType<typeof getSuperAdminEmails>> = [];
  let performanceLogs: Awaited<ReturnType<typeof getAdminPerformanceLogs>> = [];
  let performanceRouteSummaries: Awaited<ReturnType<typeof getAdminPerformanceRouteSummaries>> = [];
  let emailTemplates: Awaited<ReturnType<typeof getEmailTemplates>> = [];
  let generalEmailSettings: Awaited<ReturnType<typeof getGeneralEmailSettings>> | null = null;
  let homepageSettings: Awaited<ReturnType<typeof getHomepageSettings>> | null = null;
  let dashboardSettings: Awaited<ReturnType<typeof getDashboardWelcomeSettings>> | null = null;

  if (activeSection === "overview") {
    overviewMetrics = await getAdminOverviewMetrics(activeYear, activeTerm);
  } else if (activeSection === "content") {
    [resources, files, unitOverviews] = await Promise.all([
      getAdminResources(),
      listStoredResourceFiles(),
      getAdminUnitOverviews()
    ]);
  } else if (activeSection === "products") {
    products = await getAdminProducts();
  } else if (activeSection === "leaders") {
    leaders = await getAdminLeaderResources();
  } else if (activeSection === "leader-games") {
    games = await getAdminGames();
  } else if (activeSection === "leader-photos") {
    photos = await getAdminPhotos();
  } else if (activeSection === "family") {
    familyResources = await getAdminFamilyResources();
  } else if (activeSection === "leader-resources") {
    leaderResources = await getAdminMinistryLeaderResources();
  } else if (activeSection === "faqs") {
    helpFaqs = await getAdminHelpFaqs();
  } else if (activeSection === "accounts") {
    if (activeAccountsTab === "admins") {
      admins = await getSuperAdminEmails();
    } else {
      [accountHolders, products] = await Promise.all([getAccountHolderSummaries(), getAdminProducts()]);
    }
  } else if (activeSection === "discounts") {
    [discounts, products] = await Promise.all([getAdminDiscountCodes(), getAdminProducts()]);
  } else if (activeSection === "transactions") {
    [orders, products] = await Promise.all([getPurchaseOrders(), getAdminProducts()]);
  } else if (activeSection === "media") {
    files = await listStoredResourceFiles();
  } else if (activeSection === "performance") {
    [performanceLogs, performanceRouteSummaries] = await Promise.all([
      getAdminPerformanceLogs(),
      getAdminPerformanceRouteSummaries()
    ]);
  } else if (activeSection === "settings") {
    [emailTemplates, generalEmailSettings, homepageSettings, dashboardSettings] = await Promise.all([
      getEmailTemplates(),
      getGeneralEmailSettings(),
      getHomepageSettings(),
      getDashboardWelcomeSettings()
    ]);
  }

  const selectedLessonCount =
    overviewMetrics?.selectedLessons ??
    resources.filter(
      (resource) =>
        normalizeCurriculumYear(resource.yearCycle) === activeYear &&
        normalizeCurriculumSection(resource.term) === activeTerm
    ).length;
  const selectedUnitOverview =
    unitOverviews.find((overview) => overview.yearCycle === activeYear && overview.term === activeTerm) ??
    unitOverviews[0];

  return (
    <AdminConsoleShell
      activeSection={activeSection}
      activeAccountsTab={activeAccountsTab}
      activeYear={activeYear}
      userEmail={user.email}
    >
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
                  <strong>{overviewMetrics?.resources ?? resources.length}</strong>
                  <small>Across Volume 1</small>
                </article>
                <article>
                  <span>Products</span>
                  <strong>{overviewMetrics?.products ?? products.length}</strong>
                  <small>AUD pricing active</small>
                </article>
                <article>
                  <span>Account holders</span>
                  <strong>{overviewMetrics?.accountHolders ?? accountHolders.length}</strong>
                  <small>{overviewMetrics?.subAccounts ?? accountHolders.reduce((total, account) => total + account.teamMembers.length, 0)} invited sub accounts</small>
                </article>
                <article>
                  <span>Transactions</span>
                  <strong>{overviewMetrics?.orders ?? orders.length}</strong>
                  <small>{overviewMetrics?.paidOrders ?? orders.filter((order) => order.paymentStatus === "paid").length} paid</small>
                </article>
                <article>
                  <span>Media files</span>
                  <strong>Open</strong>
                  <small>General folder</small>
                </article>
              </section>
              <section className="panel admin-console-card">
                <div className="section-head">
                  <div>
                    <h2>Current content area</h2>
                    <p>{activeYear} {activeTerm} has {selectedLessonCount} lesson entries.</p>
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
                    <p>{activeYear} {activeTerm}: add, edit, reorder, or delete lesson content, including Big Idea and optional podcast links.</p>
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
                <>
                  <div className="admin-term-tabs admin-content-term-tabs" role="tablist" aria-label="Content quarter tabs">
                    {curriculumSections.map((term) => (
                      <Link
                        key={term}
                        href={adminHref({ section: "content", year: activeYear, term })}
                        className={`admin-term-tab ${activeTerm === term ? "admin-term-tab-active" : ""}`}
                        aria-current={activeTerm === term ? "page" : undefined}
                      >
                        {term}
                      </Link>
                    ))}
                  </div>
                  {selectedUnitOverview ? (
                    <AdminUnitOverviewEditor
                      key={`${activeYear}-${activeTerm}`}
                      overview={selectedUnitOverview}
                      yearCycle={activeYear}
                      term={activeTerm}
                    />
                  ) : null}
                  <AdminResourceList
                    resources={resources}
                    files={files}
                    activeYear={activeYear}
                    activeTerm={activeTerm}
                    basePath="/admin"
                    showTermTabs={false}
                  />
                </>
              )}
            </section>
          ) : null}

          {activeSection === "leader-resources" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Ministry Leader Resources</h1>
                  <p>Add, edit, reorder, publish, or delete account-holder ministry resources.</p>
                </div>
              </div>
              <AdminMinistryLeaderResources sections={leaderResources} />
            </section>
          ) : null}

          {activeSection === "leaders" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Leader Resources</h1>
                  <p>Add, edit, reorder, publish, or delete shared leader training resources.</p>
                </div>
              </div>
              <AdminLeaderResources sections={leaders} />
            </section>
          ) : null}

          {activeSection === "leader-games" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Games</h1>
                  <p>Add, edit, reorder, publish, or delete Games Library entries.</p>
                </div>
                <Link href="/leaders/games" className="button button-secondary" target="_blank" rel="noreferrer">
                  <Gamepad2 size={16} />
                  <span>View library</span>
                </Link>
              </div>
              <AdminGamesLibrary games={games} />
            </section>
          ) : null}

          {activeSection === "leader-photos" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Image Library</h1>
                  <p>Add, edit, reorder, publish, or delete Bible place photos.</p>
                </div>
                <Link href="/leaders/photos" className="button button-secondary" target="_blank" rel="noreferrer">
                  <ImageIcon size={16} />
                  <span>View library</span>
                </Link>
              </div>
              <AdminPhotoLibrary photos={photos} />
            </section>
          ) : null}

          {activeSection === "family" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Family Resources</h1>
                  <p>{activeYear}: add, edit, publish, or delete family cards and weekly downloads.</p>
                </div>
              </div>
              <AdminFamilyResources
                cards={familyResources.cards}
                lessons={familyResources.lessons}
                terms={familyResources.terms}
              />
            </section>
          ) : null}

          {activeSection === "faqs" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Help &amp; FAQs</h1>
                  <p>Add, edit, reorder, publish, or delete the member help questions.</p>
                </div>
              </div>
              <AdminHelpFaqs sections={helpFaqs} />
            </section>
          ) : null}

          {activeSection === "products" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Products</h1>
                  <p>Manage plan titles, student ranges, summaries, and AUD prices.</p>
                </div>
              </div>
              <AdminProductList products={products} />
            </section>
          ) : null}

          {activeSection === "accounts" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Accounts</h1>
                  <p>Manage account holders and Admin users from one place.</p>
                </div>
              </div>
              <div className="admin-top-tabs" role="tablist" aria-label="Accounts tabs">
                <Link
                  href={adminHref({ section: "accounts" })}
                  className={`admin-top-tab ${activeAccountsTab === "account-holders" ? "admin-top-tab-active" : ""}`}
                >
                  Account holders
                </Link>
                <Link
                  href={adminHref({ section: "accounts", tab: "admins" })}
                  className={`admin-top-tab ${activeAccountsTab === "admins" ? "admin-top-tab-active" : ""}`}
                >
                  Admin
                </Link>
              </div>

              {activeAccountsTab === "account-holders" ? (
                <>
                  <div className="account-expand-summary account-expand-summary-head" aria-hidden="true">
                    <span />
                    <span>Name</span>
                    <span>Account holder</span>
                    <span>Plan</span>
                    <span>Started</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  <div className="stack-sm">
                    {accountHolders.length ? (
                      accountHolders.map((account) => (
                        <details className="account-expand" key={account.organizationId}>
                          <summary className="account-expand-summary">
                            <span className="expand-mark">+</span>
                            <strong>{account.accountHolderName}</strong>
                            <span>{account.accountHolderEmail}</span>
                            <span>{planName(account.planTier, products)}</span>
                            <span>{account.joinedAt}</span>
                            <span>{account.subscriptionStatus}</span>
                            <span>
                              <AdminAccountActions account={account} products={products} />
                            </span>
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
                                  <th aria-label="Sub account actions" />
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
                                      <td>
                                        <DeleteAdminSubAccountButton
                                          organizationId={account.organizationId}
                                          memberId={member.id}
                                          email={member.email}
                                        />
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={6}>No sub accounts invited yet.</td>
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
                </>
              ) : activeAccountsTab === "admins" ? (
                <>
                  <SuperAdminForm />
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th aria-label="Admin actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.userId}>
                          <td>{admin.displayName}</td>
                          <td>{admin.email}</td>
                          <td>Admin</td>
                          <td>
                            <div className="admin-table-actions">
                              <SuperAdminNameForm
                                userId={admin.userId}
                                email={admin.email}
                                initialName={admin.displayName}
                              />
                              <DeleteSuperAdminButton
                                userId={admin.userId}
                                email={admin.email}
                                disabled={admin.userId === user.id}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </section>
          ) : null}

          {activeSection === "discounts" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Discounts</h1>
                  <p>Create and manage checkout discount codes for selected products.</p>
                </div>
              </div>
              <AdminDiscountList discounts={discounts} products={products} />
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
                        <span>{planName(order.planTier, products)}</span>
                        <span>{formatCurrency(order.amount, order.currency)}</span>
                        <span>{formatDateTime(order.createdAt)}</span>
                        <span>{order.paymentStatus}</span>
                      </summary>
                      <div className="account-expand-body order-expand-body">
                        <div className="order-detail-grid">
                          <p><strong>Account holder:</strong> {order.accountHolderName}</p>
                          <p><strong>Church:</strong> {order.churchName}</p>
                          <p><strong>Payment:</strong> {order.cardBrand} ending in {order.cardLast4}</p>
                          <p><strong>Provider:</strong> {order.paymentProvider}</p>
                          {order.discountCode ? (
                            <p>
                              <strong>Discount:</strong> {order.discountCode} saved{" "}
                              {formatCurrency(order.discountAmount, order.currency)}
                              {order.originalAmount ? ` from ${formatCurrency(order.originalAmount, order.currency)}` : ""}
                            </p>
                          ) : null}
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

          {activeSection === "performance" ? (
            <section className="panel admin-console-card">
              <div className="section-head">
                <div>
                  <h1>Performance</h1>
                  <p>Admin-only page load timing logs captured from live navigation and initial page loads.</p>
                </div>
              </div>
              <section className="admin-metric-grid">
                <article>
                  <span>Recent samples</span>
                  <strong>{performanceLogs.length}</strong>
                  <small>Latest 100 events</small>
                </article>
                <article>
                  <span>Tracked pages</span>
                  <strong>{performanceRouteSummaries.length}</strong>
                  <small>Unique final paths</small>
                </article>
                <article>
                  <span>Slowest avg</span>
                  <strong>
                    {performanceRouteSummaries[0]
                      ? `${(performanceRouteSummaries[0].averageDurationMs / 1000).toFixed(2)}s`
                      : "0.00s"}
                  </strong>
                  <small>{performanceRouteSummaries[0]?.finalPath ?? "No samples yet"}</small>
                </article>
              </section>
              <div className="admin-performance-grid">
                <div>
                  <h2>Route averages</h2>
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Path</th>
                        <th>Samples</th>
                        <th>Average</th>
                        <th>Worst</th>
                        <th>Latest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceRouteSummaries.length ? (
                        performanceRouteSummaries.map((summary) => (
                          <tr key={summary.finalPath}>
                            <td>{summary.finalPath}</td>
                            <td>{summary.samples}</td>
                            <td>{(summary.averageDurationMs / 1000).toFixed(2)}s</td>
                            <td>{(summary.maxDurationMs / 1000).toFixed(2)}s</td>
                            <td>{formatDateTime(summary.latestAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5}>No performance logs yet. Open pages and navigate around to populate this table.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h2>Recent events</h2>
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Type</th>
                        <th>Path</th>
                        <th>Duration</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceLogs.length ? (
                        performanceLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{formatDateTime(log.createdAt)}</td>
                            <td>{log.eventType}</td>
                            <td>{log.finalPath}</td>
                            <td>{(log.durationMs / 1000).toFixed(2)}s</td>
                            <td>{log.userEmail ?? "Anonymous"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5}>No recent performance events yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
              <AdminEmailSettingsForm
                templates={emailTemplates}
                generalSettings={generalEmailSettings ?? {
                  isOffline: false,
                  siteUrl: publicEnv.siteUrl,
                  senderName: "New Creation Kids",
                  senderEmail: "",
                  renewalReminderDays: 30,
                  cancellationSurveyUrl: "",
                  supportEmail: ""
                }}
                homepageSettings={homepageSettings ?? defaultHomepageSettings}
                dashboardSettings={dashboardSettings ?? defaultDashboardWelcomeSettings}
              />
            </section>
          ) : null}
    </AdminConsoleShell>
  );
}
