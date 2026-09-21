import { NextResponse } from "next/server";

import {
  sendAccessExpiryEmail,
  sendCancellationConfirmationEmail,
  sendPaymentSuccessEmail,
  sendRenewalConfirmationEmail,
  sendRenewalReminderEmail
} from "@/lib/email-delivery";
import { getBillingBreakdown } from "@/lib/billing";
import { getGeneralEmailSettings } from "@/lib/email-settings";
import { serverEnv } from "@/lib/env";
import { createOrderNumber } from "@/lib/checkout";
import { getPlanByTier, getPlanByTierFromProducts, getPlanPrice } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addYears, formatISO, formatLongDateWithOrdinal, getDaysUntil } from "@/lib/time";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

type SubscriptionRow = {
  id: string;
  organization_id: string;
  tier: string;
  status: string;
  started_at: string | null;
  current_period_end: string;
  cancel_at_period_end: boolean;
  organizations?: {
    name?: string | null;
    church_name?: string | null;
    account_holder_name?: string | null;
    billing_address_line1?: string | null;
    billing_suburb?: string | null;
    billing_state?: string | null;
    billing_postcode?: string | null;
    billing_country?: string | null;
    billing_phone?: string | null;
    owner_user_id?: string | null;
  } | null;
};

type EventType =
  | "renewal_reminder"
  | "renewal_confirmation"
  | "cancellation_confirmation"
  | "access_expiry";

function isAuthorized(request: Request) {
  if (!serverEnv.subscriptionCronSecret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${serverEnv.subscriptionCronSecret}`;
}

function eventKey(subscriptionId: string, eventType: EventType, eventDate: string) {
  return `${subscriptionId}:${eventType}:${eventDate}`;
}

async function updateSubscriptionFields(
  adminSupabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  subscriptionId: string,
  payload: Record<string, unknown>
) {
  let fields = { ...payload };

  while (true) {
    const { error } = await adminSupabase
      .from("subscriptions")
      .update(fields)
      .eq("id", subscriptionId);

    if (!error) {
      return null;
    }

    const missingColumn = error.message.match(/Could not find the '([^']+)' column/i)?.[1];

    if (missingColumn && missingColumn in fields) {
      delete fields[missingColumn];
      continue;
    }

    return error;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const today = formatISO(new Date());
  const generalSettings = await getGeneralEmailSettings();
  const { data: subscriptions, error } = await adminSupabase
    .from("subscriptions")
    .select("id, organization_id, tier, status, started_at, current_period_end, cancel_at_period_end, organizations(name, church_name, account_holder_name, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone, owner_user_id)")
    .in("status", ["active", "trialing", "past_due", "canceled"]);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const sent: string[] = [];
  const skipped: string[] = [];

  for (const subscription of (subscriptions ?? []) as SubscriptionRow[]) {
    const { data: owner } = await adminSupabase
      .from("organization_members")
      .select("invitation_email, display_name")
      .eq("organization_id", subscription.organization_id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (!owner?.invitation_email) {
      skipped.push(`${subscription.id}:missing-owner-email`);
      continue;
    }

    const planName = getPlanByTier(subscription.tier)?.name ?? subscription.tier;
    const accountHolderName =
      subscription.organizations?.account_holder_name ?? owner.display_name ?? owner.invitation_email;
    const churchName =
      subscription.organizations?.church_name ?? subscription.organizations?.name ?? "your church";
    const daysUntilRenewal = getDaysUntil(subscription.current_period_end);
    const renewalDate = formatLongDateWithOrdinal(subscription.current_period_end);
    const common = {
      to: owner.invitation_email,
      accountHolderName,
      churchName,
      planName,
      renewalDate,
      accessEndsDate: renewalDate,
      daysUntilRenewal
    };

    const dueEvents: Array<{
      type: EventType;
      eventDate?: string;
      send: () => Promise<{ ok: boolean; skipped?: boolean; message?: string }>;
    }> = [];

    if (["active", "trialing"].includes(subscription.status) && daysUntilRenewal <= 0) {
      if (subscription.cancel_at_period_end) {
        const { error: cancelError } = await adminSupabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString()
          })
          .eq("id", subscription.id);

        if (cancelError) {
          skipped.push(`${subscription.id}:cancel-error`);
          continue;
        }

        dueEvents.push({ type: "access_expiry", send: () => sendAccessExpiryEmail(common) });
      } else {
        const plan = await getPlanByTierFromProducts(subscription.tier);

        if (!plan) {
          skipped.push(`${subscription.id}:missing-plan`);
          continue;
        }

        const renewalStartedAt = today;
        const renewalDate = formatISO(addYears(new Date(subscription.current_period_end), 1));
        const billingCountry = subscription.organizations?.billing_country ?? "Australia";
        const amount = getPlanPrice(plan);
        const billing = getBillingBreakdown(amount, billingCountry);
        const orderNumber = createOrderNumber(plan.id);
        const renewalEventKey = eventKey(subscription.id, "renewal_confirmation", today);
        const { data: existingRenewal } = await adminSupabase
          .from("subscription_email_events")
          .select("id")
          .eq("event_key", renewalEventKey)
          .limit(1)
          .maybeSingle();

        if (existingRenewal) {
          skipped.push(renewalEventKey);
          continue;
        }

        const { data: order, error: orderError } = await adminSupabase
          .from("purchase_orders")
          .insert({
            organization_id: subscription.organization_id,
            owner_user_id: subscription.organizations?.owner_user_id ?? null,
            order_number: orderNumber,
            account_holder_name: accountHolderName,
            account_holder_email: owner.invitation_email,
            church_name: churchName,
            plan_tier: plan.id,
            amount: billing.total,
            currency: plan.currency.toLowerCase(),
            payment_status: "paid",
            payment_provider: "fake-recurring",
            card_brand: "Saved card",
            card_last4: "4242",
            billing_address_line1: subscription.organizations?.billing_address_line1 ?? "Billing address on file",
            billing_suburb: subscription.organizations?.billing_suburb ?? "",
            billing_state: subscription.organizations?.billing_state ?? "",
            billing_postcode: subscription.organizations?.billing_postcode ?? "",
            billing_country: billingCountry,
            billing_phone: subscription.organizations?.billing_phone ?? ""
          })
          .select("id")
          .single();

        if (orderError || !order) {
          skipped.push(`${subscription.id}:renewal-order-error`);
          continue;
        }

        const subscriptionError = await updateSubscriptionFields(adminSupabase, subscription.id, {
          tier: plan.id,
          currency: plan.currency.toLowerCase(),
          stripe_price_id: plan.stripePriceIds[plan.currency] ?? null,
          status: "active",
          started_at: renewalStartedAt,
          current_period_end: renewalDate,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        });

        if (subscriptionError) {
          skipped.push(`${subscription.id}:renewal-subscription-error`);
          continue;
        }

        const updatedCommon = {
          ...common,
          planName: plan.name,
          renewalDate: formatLongDateWithOrdinal(renewalDate),
          accessEndsDate: formatLongDateWithOrdinal(renewalDate),
          daysUntilRenewal: 365,
          amount: `${formatCurrency(billing.total, plan.currency)}${billing.gstApplies ? " including GST" : ""}`,
          invoiceUrl: `${generalSettings.siteUrl.replace(/\/+$/, "")}/api/account/invoices/${order.id}`
        };
        const [renewalEmail, paymentEmail] = await Promise.all([
          sendRenewalConfirmationEmail(updatedCommon),
          sendPaymentSuccessEmail(updatedCommon)
        ]);

        await adminSupabase.from("subscription_email_events").insert({
          event_key: renewalEventKey,
          subscription_id: subscription.id,
          organization_id: subscription.organization_id,
          event_type: "renewal_confirmation",
          recipient_email: owner.invitation_email,
          status: renewalEmail.ok || paymentEmail.ok ? "sent" : renewalEmail.skipped || paymentEmail.skipped ? "skipped" : "failed",
          message: [renewalEmail.message, paymentEmail.message].filter(Boolean).join(" ")
        });

        sent.push(renewalEventKey);
        continue;
      }
    }

    if (["active", "trialing"].includes(subscription.status) && daysUntilRenewal === generalSettings.renewalReminderDays) {
      dueEvents.push({ type: "renewal_reminder", send: () => sendRenewalReminderEmail(common) });
    }

    if (subscription.status === "active" && subscription.started_at === today) {
      dueEvents.push({ type: "renewal_confirmation", send: () => sendRenewalConfirmationEmail(common) });
    }

    if (subscription.cancel_at_period_end && ["active", "trialing"].includes(subscription.status)) {
      dueEvents.push({
        type: "cancellation_confirmation",
        eventDate: subscription.current_period_end,
        send: () => sendCancellationConfirmationEmail(common)
      });
    }

    if (subscription.status === "canceled" && subscription.current_period_end <= today) {
      dueEvents.push({
        type: "access_expiry",
        eventDate: subscription.current_period_end,
        send: () => sendAccessExpiryEmail(common)
      });
    }

    for (const dueEvent of dueEvents) {
      const key = eventKey(subscription.id, dueEvent.type, dueEvent.eventDate ?? today);
      const { data: existingEvent } = await adminSupabase
        .from("subscription_email_events")
        .select("id")
        .eq("event_key", key)
        .limit(1)
        .maybeSingle();

      if (existingEvent) {
        skipped.push(key);
        continue;
      }

      const result = await dueEvent.send();

      await adminSupabase.from("subscription_email_events").insert({
        event_key: key,
        subscription_id: subscription.id,
        organization_id: subscription.organization_id,
        event_type: dueEvent.type,
        recipient_email: owner.invitation_email,
        status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
        message: result.message ?? ""
      });

      if (result.ok) {
        sent.push(key);
      } else {
        skipped.push(key);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
