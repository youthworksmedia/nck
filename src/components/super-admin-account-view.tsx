import Link from "next/link";

import { SuperAdminNameForm } from "@/components/super-admin-name-form";
import { SuperAdminForm } from "@/components/super-admin-form";
import {
  getAccountHolderSummaries,
  getPurchaseOrders,
  getSuperAdminEmails
} from "@/lib/admin-access";
import { plans } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";

type Props = {
  user: {
    id: string;
    email?: string | null;
  } | null;
};

export async function SuperAdminAccountView({ user }: Props) {
  const [accountHolders, admins, orders] = await Promise.all([
    getAccountHolderSummaries(),
    getSuperAdminEmails(),
    getPurchaseOrders()
  ]);

  return (
    <main className="site-shell section">
      <div className="section-head app-page-head">
        <div>
          <span className="eyebrow">Super admin</span>
          <h1>Admin control panel</h1>
          <p>This account can manage content, super admins, and all subscriber accounts.</p>
        </div>
        <p>{user?.email ?? "Super admin"}</p>
      </div>

      <section className="dashboard-grid">
        <article>
          <h2>Super Admin</h2>
          <p>Open the admin tools below to manage content, accounts, and library structure.</p>
          <div className="button-row">
            <Link href="/content" className="button button-primary">
              View Content page
            </Link>
          </div>
        </article>
        <article>
          <h2>Account overview</h2>
          <div className="meta-grid">
            <div>
              <span className="pill">Account holders</span>
              <strong>{accountHolders.length}</strong>
            </div>
            <div>
              <span className="pill">Super admins</span>
              <strong>{admins.length}</strong>
            </div>
            <div>
              <span className="pill">Orders</span>
              <strong>{orders.length}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Orders</h2>
            <p>Every checkout order is logged here for review before Stripe is connected.</p>
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
                  <span>{plans.find((plan) => plan.id === order.planTier)?.name ?? order.planTier}</span>
                  <span>{formatCurrency(order.amount)}</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                  <span>{order.paymentStatus}</span>
                </summary>
                <div className="account-expand-body order-expand-body">
                  <div className="order-detail-grid">
                    <p>
                      <strong>Account holder:</strong> {order.accountHolderName}
                    </p>
                    <p>
                      <strong>Email:</strong> {order.accountHolderEmail}
                    </p>
                    <p>
                      <strong>Church:</strong> {order.churchName}
                    </p>
                    <p>
                      <strong>Plan:</strong> {plans.find((plan) => plan.id === order.planTier)?.name ?? order.planTier}
                    </p>
                    <p>
                      <strong>Payment:</strong> {order.cardBrand} ending in {order.cardLast4}
                    </p>
                    <p>
                      <strong>Provider:</strong> {order.paymentProvider}
                    </p>
                    <p className="order-detail-address">
                      <strong>Billing address:</strong> {order.billingAddressLine1}, {order.billingSuburb},{" "}
                      {order.billingState} {order.billingPostcode}, {order.billingCountry}
                    </p>
                    <p>
                      <strong>Phone:</strong> {order.billingPhone || "-"}
                    </p>
                  </div>
                </div>
              </details>
            ))
          ) : (
            <p>No orders yet.</p>
          )}
        </div>
      </section>

      <section className="dashboard-grid">
        <article>
          <h2>Super admins</h2>
          <p>Use normal sign-in. Any account with the super admin role lands on this account page.</p>
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
        </article>
        <article>
          <h2>What you can manage</h2>
          <ul className="feature-list">
            <li>Library categories and all content entries</li>
            <li>Super admin accounts with normal email/password login</li>
            <li>All account holders, their join dates, and active or cancelled status</li>
            <li>Each account holder’s full list of team members</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Account holders</h2>
            <p>Open each account holder to see their team members.</p>
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
          {accountHolders.map((account) => (
            <details className="account-expand" key={account.organizationId}>
              <summary className="account-expand-summary">
                <span className="expand-mark">+</span>
                <strong>{account.accountHolderName}</strong>
                <span>{account.accountHolderEmail}</span>
                <span>{plans.find((plan) => plan.id === account.planTier)?.name ?? account.planTier}</span>
                <span>{account.joinedAt}</span>
                <span>
                  {account.subscriptionStatus === "active" || account.subscriptionStatus === "trialing"
                    ? "Active"
                    : "Cancelled"}
                </span>
              </summary>
              <div className="account-expand-body">
                <p>
                  <strong>Account holder:</strong> {account.accountHolderName}
                </p>
                <p>
                  <strong>Church:</strong> {account.churchName}
                </p>
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Team member</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.teamMembers.length ? (
                      account.teamMembers.map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.email}</td>
                          <td>Team member</td>
                          <td>{member.joinedAt}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>No team members yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
