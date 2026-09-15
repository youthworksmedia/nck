"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  cancelAtPeriodEnd: boolean;
  renewalDate: string;
  subscriptionStatus: string;
};

export function SubscriptionRecurringToggle({
  cancelAtPeriodEnd,
  renewalDate,
  subscriptionStatus
}: Props) {
  const router = useRouter();
  const [isRecurring, setIsRecurring] = useState(!cancelAtPeriodEnd);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canManage = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  function updateRecurring(nextRecurring: boolean) {
    const confirmed = window.confirm(
      nextRecurring
        ? `Turn on auto renew? Your subscription will renew automatically on ${renewalDate} at the current product price.`
        : `Turn off auto renew? Your team will keep access until ${renewalDate}, but the subscription will not renew automatically after that date.`
    );

    if (!confirmed) {
      return;
    }

    setIsRecurring(nextRecurring);
    setMessage(nextRecurring ? "Turning auto renew on..." : "Turning auto renew off...");

    startTransition(async () => {
      try {
        const response = await fetch("/api/account/subscription/recurring", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recurringEnabled: nextRecurring
          })
        });
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setIsRecurring(!nextRecurring);
        }

        setMessage(payload.message ?? "Subscription preference saved.");
        router.refresh();
      } catch {
        setIsRecurring(!nextRecurring);
        setMessage("Subscription preference could not be saved. Please try again.");
      }
    });
  }

  return (
    <div className="account-recurring-control">
      <label className="admin-toggle-row" htmlFor="recurring-renewal">
        <span>
          <strong>Auto renew</strong>
          <small>
            {isRecurring
              ? "Your subscription will renew automatically when current subscription ends."
              : `Auto renew is off. Access remains active until ${renewalDate}.`}
          </small>
        </span>
        <input
          id="recurring-renewal"
          type="checkbox"
          role="switch"
          checked={isRecurring}
          disabled={!canManage || isPending}
          onChange={(event) => updateRecurring(event.target.checked)}
        />
      </label>
      {message ? <p className="form-status form-status-small">{message}</p> : null}
      {!canManage ? (
        <p className="form-status form-status-small">
          Automatic renewal can be changed when the subscription is active.
        </p>
      ) : null}
    </div>
  );
}
