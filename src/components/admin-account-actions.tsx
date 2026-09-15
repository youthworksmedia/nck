"use client";

import { Ban, CheckCircle2, Pencil, ReceiptText, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ModalPortal } from "@/components/modal-portal";
import type { Plan } from "@/lib/plans";
import type { AccountHolderSummary, MembershipSnapshot } from "@/types";

type AdminAccountActionsProps = {
  account: AccountHolderSummary;
  products: Plan[];
};

const statusOptions: MembershipSnapshot["subscriptionStatus"][] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "inactive"
];

function statusLabel(status: MembershipSnapshot["subscriptionStatus"]) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminAccountActions({ account, products }: AdminAccountActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState(account.accountHolderName);
  const [accountHolderEmail, setAccountHolderEmail] = useState(account.accountHolderEmail);
  const [churchName, setChurchName] = useState(account.churchName);
  const [planTier, setPlanTier] = useState(account.planTier);
  const [subscriptionStatus, setSubscriptionStatus] = useState(account.subscriptionStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveAccount(
    nextStatus = subscriptionStatus,
    billingAction: "none" | "refund_requested" | "refunded" = "none"
  ) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/accounts/${account.organizationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accountHolderName,
          accountHolderEmail,
          churchName,
          planTier,
          subscriptionStatus: nextStatus,
          billingAction
        })
      });

      const payload = await response.json();
      setMessage(payload.message ?? "Unable to update account.");

      if (response.ok) {
        setIsOpen(false);
        router.refresh();
      }
    });
  }

  function quickStatus(nextStatus: MembershipSnapshot["subscriptionStatus"]) {
    const action = nextStatus === "active" ? "make this account active" : "suspend this account";
    const confirmed = window.confirm(`Are you sure you want to ${action}?`);

    if (!confirmed) {
      return;
    }

    setSubscriptionStatus(nextStatus);
    saveAccount(nextStatus);
  }

  function refundAction(action: "refund_requested" | "refunded") {
    const copy =
      action === "refund_requested"
        ? "This will stop access now and mark the latest order as refund requested. Process the actual refund in Stripe Dashboard."
        : "This will mark the latest order as refunded in the app after you have completed the refund in Stripe Dashboard.";
    const confirmed = window.confirm(`${copy}\n\nContinue?`);

    if (!confirmed) {
      return;
    }

    const nextStatus = action === "refund_requested" ? "inactive" : subscriptionStatus;

    setSubscriptionStatus(nextStatus);
    saveAccount(nextStatus, action);
  }

  return (
    <div
      className="admin-table-actions"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="icon-button"
        aria-label={`Edit ${account.accountHolderEmail}`}
        title={`Edit ${account.accountHolderEmail}`}
        onClick={() => {
          setMessage(null);
          setAccountHolderName(account.accountHolderName);
          setAccountHolderEmail(account.accountHolderEmail);
          setChurchName(account.churchName);
          setPlanTier(account.planTier);
          setSubscriptionStatus(account.subscriptionStatus);
          setIsOpen(true);
        }}
      >
        <Pencil size={16} />
      </button>
      {account.subscriptionStatus === "active" || account.subscriptionStatus === "trialing" ? (
        <button
          type="button"
          className="icon-button"
          disabled={isPending}
          aria-label={`Suspend ${account.accountHolderEmail}`}
          title={`Suspend ${account.accountHolderEmail}`}
          onClick={() => quickStatus("inactive")}
        >
          <Ban size={16} />
        </button>
      ) : (
        <button
          type="button"
          className="icon-button"
          disabled={isPending}
          aria-label={`Make ${account.accountHolderEmail} active`}
          title={`Make ${account.accountHolderEmail} active`}
          onClick={() => quickStatus("active")}
        >
          <CheckCircle2 size={16} />
        </button>
      )}
      {message ? <p className="form-status form-status-small">{message}</p> : null}

      {isOpen ? (
        <ModalPortal>
          <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
            <div
              className="modal-card account-team-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`admin-account-modal-${account.organizationId}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h3 id={`admin-account-modal-${account.organizationId}`}>Edit account</h3>
                  <p>{account.accountHolderEmail}</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close edit account window"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                className="invite-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveAccount();
                }}
              >
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={accountHolderName}
                  onChange={(event) => setAccountHolderName(event.target.value)}
                  minLength={2}
                  disabled={isPending}
                  required
                />
                <input
                  type="email"
                  placeholder="Account holder email"
                  value={accountHolderEmail}
                  onChange={(event) => setAccountHolderEmail(event.target.value)}
                  disabled={isPending}
                  required
                />
                <input
                  type="text"
                  placeholder="Church name"
                  value={churchName}
                  onChange={(event) => setChurchName(event.target.value)}
                  minLength={2}
                  disabled={isPending}
                  required
                />
                <select
                  value={planTier}
                  onChange={(event) => setPlanTier(event.target.value as AccountHolderSummary["planTier"])}
                  disabled={isPending}
                  aria-label="Plan"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <select
                  value={subscriptionStatus}
                  onChange={(event) =>
                    setSubscriptionStatus(event.target.value as MembershipSnapshot["subscriptionStatus"])
                  }
                  disabled={isPending}
                  aria-label="Subscription status"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
                <div className="admin-billing-actions">
                  <div>
                    <strong>Refund workflow</strong>
                    <small>Use Stripe Dashboard for the money movement, then record the customer status here.</small>
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={isPending}
                    onClick={() => refundAction("refund_requested")}
                  >
                    <ReceiptText size={16} />
                    <span>Cancel access & mark refund requested</span>
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={isPending}
                    onClick={() => refundAction("refunded")}
                  >
                    <RotateCcw size={16} />
                    <span>Mark latest order refunded</span>
                  </button>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary" disabled={isPending}>
                    {isPending ? "Saving..." : "Save account"}
                  </button>
                </div>
                {message ? <p className="form-status">{message}</p> : null}
              </form>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
