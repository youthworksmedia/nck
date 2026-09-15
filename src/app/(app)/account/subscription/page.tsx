import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeDollarSign,
  Crown,
  Download,
  StarIcon
} from "lucide-react";

import { PendingActionLink } from "@/components/pending-action-link";
import { SubscriptionRecurringToggle } from "@/components/subscription-recurring-toggle";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import {
  getAccountPurchaseOrders,
  getMembershipSnapshot,
  isCurrentUserOwner
} from "@/lib/portal";
import { getPlanPrice, getPlans } from "@/lib/plans";
import { formatLongDate, formatLongDateWithOrdinal, getDaysUntil } from "@/lib/time";
import { buildPrivateMetadata } from "@/lib/metadata";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Account",
  description: "View your New Creation Kids subscription, plan details, and invoices."
});

function formatShortOrderNumber(orderNumber: string) {
  const trimmed = orderNumber.trim();
  if (trimmed.length <= 7) {
    return trimmed;
  }

  return `...${trimmed.slice(-7)}`;
}

export default async function AccountSubscriptionPage() {
  const [membership, isOwner, isSuperAdmin, purchaseOrders, plans] = await Promise.all([
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    isCurrentUserSuperAdmin(),
    getAccountPurchaseOrders(),
    getPlans()
  ]);

  const plan = plans.find((entry) => entry.id === membership.planTier);
  const currentPlan = plan ?? plans[0];
  const currentPlanPrice = currentPlan ? getPlanPrice(currentPlan) : 0;
  const alternativePlans = plans
    .filter((entry) => entry.id !== currentPlan?.id)
    .sort((left, right) => getPlanPrice(left) - getPlanPrice(right));
  const memberCount = membership.memberCount;
  const daysRemaining = getDaysUntil(membership.renewalDate);
  const accountHolderName = membership.accountHolderName || "Account holder";

  return (
    <main className="site-shell section account-page account-subpage">
      <section className="account-subpage-head">
        <span className="eyebrow">Account</span>
        <h1>Subscription</h1>
        <p>Plan details, renewal information, and downloadable invoices.</p>
      </section>

      <section className="dashboard-grid account-owner-grid account-subpage-grid">
        <article className="account-card account-card-overview">
          {isSuperAdmin ? (
            <>
              <div className="account-card-heading">
                <h2>Admin access</h2>
                <div className="account-card-heading-icon">
                  <StarIcon size={18} fill="currentColor" strokeWidth={1.5} />
                </div>
              </div>
              <div className="meta-grid account-overview-grid">
                <div className="account-overview-tile account-overview-tile-wide">
                  <div className="account-overview-plan-icon" aria-hidden="true">
                    <Crown size={18} fill="currentColor" strokeWidth={1.5} />
                  </div>
                  <div className="account-overview-plan-copy">
                    <strong>Full access</strong>
                    <span>New Creation Kids Admin group</span>
                  </div>
                </div>
                <Link href="/admin" className="account-overview-tile account-overview-tile-link">
                  <span className="pill">Console</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      <BadgeDollarSign size={18} />
                      <span>Open admin</span>
                    </strong>
                  </div>
                </Link>
                <div className="account-overview-tile">
                  <span className="pill">Status</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      <span className="account-overview-status-dot account-overview-status-dot-active" aria-hidden="true" />
                      <span>active</span>
                    </strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="account-card-heading">
                <h2>Subscription overview</h2>
                <div className="account-card-heading-icon">
                  <StarIcon size={18} fill="currentColor" strokeWidth={1.5} />
                </div>
              </div>
              <div className="meta-grid account-overview-grid">
                <div className="account-overview-tile account-overview-tile-wide">
                  <div className="account-overview-plan-icon" aria-hidden="true">
                    <Crown size={18} fill="currentColor" strokeWidth={1.5} />
                  </div>
                  <div className="account-overview-plan-copy">
                    <strong>{plan?.name ?? membership.planTier}</strong>
                    <span>{membership.churchName}</span>
                  </div>
                </div>
                <div className="account-overview-tile account-overview-tile-highlight">
                  <span className="pill">Account holder</span>
                  <span className="account-overview-note account-overview-note-strong">
                    {accountHolderName}
                  </span>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Invited accounts</span>
                  <strong>{memberCount} connected</strong>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Next renewal</span>
                  <strong>{formatLongDateWithOrdinal(membership.renewalDate)}</strong>
                  <span className="account-overview-note">
                    {membership.subscriptionStatus === "active" ? `(${daysRemaining} days)` : "Inactive"}
                  </span>
                </div>
                <div className="account-overview-tile">
                  <span className="pill">Status</span>
                  <div className="account-overview-status-row">
                    <strong className="account-overview-status-line">
                      {membership.subscriptionStatus === "active" ? (
                        <span className="account-overview-status-dot account-overview-status-dot-active" aria-hidden="true" />
                      ) : null}
                      <span>{membership.subscriptionStatus}</span>
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </article>

        {isOwner ? (
          <article className="account-card account-card-plan-change">
            <div className="account-card-heading">
              <h2>Renew or change plan</h2>
              <div className="account-card-heading-icon">
                <BadgeDollarSign size={18} />
              </div>
            </div>
            <p>
              Renew your current account, or move to a different annual tier. Checkout keeps your account connected to
              the selected plan.
            </p>
            {currentPlan ? (
              <div className="account-current-plan-renew-card">
                <span className="pill">Current plan</span>
                <strong>
                  {currentPlan.name} plan · {formatCurrency(getPlanPrice(currentPlan), currentPlan.currency)}/year
                </strong>
                <small>{currentPlan.studentRange}</small>
                <PendingActionLink
                  href={`/subscribe?tier=${currentPlan.id}`}
                  className="button button-primary account-plan-renew-button"
                  loadingLabel="Preparing checkout..."
                >
                  <BadgeDollarSign size={18} />
                  <span>Renew</span>
                </PendingActionLink>
              </div>
            ) : null}
            <SubscriptionRecurringToggle
              cancelAtPeriodEnd={membership.cancelAtPeriodEnd}
              renewalDate={formatLongDateWithOrdinal(membership.renewalDate)}
              subscriptionStatus={membership.subscriptionStatus}
            />
            <div className="account-plan-change-options" aria-label="Other plan options">
              {alternativePlans.map((entry) => {
                const entryPrice = getPlanPrice(entry);
                const actionLabel =
                  entryPrice > currentPlanPrice
                    ? "Upgrade"
                    : entryPrice < currentPlanPrice
                      ? "Downgrade"
                      : "Switch";

                return (
                  <div key={entry.id} className="account-plan-change-option">
                    <span>{actionLabel}</span>
                    <strong>
                      {entry.name} · {formatCurrency(entryPrice, entry.currency)}/year
                    </strong>
                    <small>{entry.studentRange}</small>
                    <PendingActionLink
                      href={`/subscribe?tier=${entry.id}`}
                      className="button account-plan-change-button"
                      loadingLabel="Preparing checkout..."
                    >
                      {actionLabel}
                    </PendingActionLink>
                  </div>
                );
              })}
            </div>
          </article>
        ) : null}
      </section>

      {isOwner ? (
        <section className="dashboard-grid account-history-links-grid account-subscription-history-grid">
          <article className="account-card account-card-purchases">
            <div className="section-head account-purchases-head">
              <div className="account-purchases-title">
                <h2>Purchase history</h2>
              </div>
            </div>
            {purchaseOrders.length ? (
              <table className="list-table account-purchase-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order</th>
                    <th>Plan</th>
                    <th>Total</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{formatLongDate(order.createdAt)}</td>
                      <td>{formatShortOrderNumber(order.orderNumber)}</td>
                      <td>{plans.find((entry) => entry.id === order.planTier)?.name ?? order.planTier}</td>
                      <td>{formatCurrency(order.amount, order.currency)}</td>
                      <td>
                        <PendingActionLink
                          href={`/api/account/invoices/${order.id}`}
                          className="button button-secondary account-invoice-button"
                          title="Download invoice"
                          ariaLabel="Download invoice"
                          loadingLabel="..."
                        >
                          <Download size={14} />
                        </PendingActionLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="account-purchases-empty">No purchase history yet.</p>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
