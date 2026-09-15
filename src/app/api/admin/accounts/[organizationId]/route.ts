import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { sendRefundConfirmationEmail, sendRefundRequestedEmail } from "@/lib/email-delivery";
import { type PlanTier } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

const subscriptionStatuses = ["active", "trialing", "past_due", "canceled", "inactive"] as const;
const planTiers = ["essential", "growth", "scale"] as const satisfies readonly PlanTier[];

const accountSchema = z.object({
  accountHolderName: z.string().trim().min(2),
  accountHolderEmail: z.string().trim().email(),
  churchName: z.string().trim().min(2),
  planTier: z.enum(planTiers),
  subscriptionStatus: z.enum(subscriptionStatuses),
  billingAction: z.enum(["none", "refund_requested", "refunded"]).optional().default("none")
});

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Admin access required." }, { status: 401 });
  }

  const { organizationId } = await context.params;
  const payload = accountSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { message: "Enter account holder, church, plan, and status details." },
      { status: 400 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for account changes." },
      { status: 400 }
    );
  }

  const nextEmail = payload.data.accountHolderEmail.toLowerCase();
  const nextName = payload.data.accountHolderName.trim();
  const nextChurchName = payload.data.churchName.trim();

  const { data: ownerMember, error: ownerError } = await adminSupabase
    .from("organization_members")
    .select("id, user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (ownerError) {
    return NextResponse.json({ message: ownerError.message }, { status: 400 });
  }

  if (!ownerMember) {
    return NextResponse.json({ message: "Account holder not found." }, { status: 404 });
  }

  const { error: memberError } = await adminSupabase
    .from("organization_members")
    .update({
      display_name: nextName,
      invitation_email: nextEmail
    })
    .eq("id", ownerMember.id);

  if (memberError) {
    return NextResponse.json({ message: memberError.message }, { status: 400 });
  }

  const { error: organizationError } = await adminSupabase
    .from("organizations")
    .update({
      name: nextChurchName,
      church_name: nextChurchName,
      account_holder_name: nextName,
      owner_user_id: ownerMember.user_id ?? null
    })
    .eq("id", organizationId);

  if (organizationError) {
    return NextResponse.json({ message: organizationError.message }, { status: 400 });
  }

  const { error: subscriptionError } = await adminSupabase
    .from("subscriptions")
    .upsert(
      {
        organization_id: organizationId,
        tier: payload.data.planTier,
        status: payload.data.subscriptionStatus,
        cancel_at_period_end: payload.data.subscriptionStatus === "active" ? false : true,
        updated_at: new Date().toISOString()
      },
      { onConflict: "organization_id" }
    );

  if (subscriptionError) {
    return NextResponse.json({ message: subscriptionError.message }, { status: 400 });
  }

  if (ownerMember.user_id) {
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(ownerMember.user_id, {
      email: nextEmail,
      user_metadata: {
        full_name: nextName
      }
    });

    if (authError) {
      return NextResponse.json({ message: authError.message }, { status: 400 });
    }
  }

  if (payload.data.billingAction !== "none") {
    const { data: latestOrder, error: orderLookupError } = await adminSupabase
      .from("purchase_orders")
      .select("id, amount, currency, plan_tier")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderLookupError) {
      return NextResponse.json({ message: orderLookupError.message }, { status: 400 });
    }

    if (!latestOrder) {
      return NextResponse.json({ message: "No purchase order was found for this account." }, { status: 404 });
    }

    const { error: orderUpdateError } = await adminSupabase
      .from("purchase_orders")
      .update({
        payment_status: payload.data.billingAction
      })
      .eq("id", latestOrder.id);

    if (orderUpdateError) {
      return NextResponse.json({ message: orderUpdateError.message }, { status: 400 });
    }

    const emailInput = {
      to: nextEmail,
      accountHolderName: nextName,
      churchName: nextChurchName,
      planName: payload.data.planTier,
      amount: formatCurrency(latestOrder.amount, latestOrder.currency)
    };

    if (payload.data.billingAction === "refund_requested") {
      await sendRefundRequestedEmail(emailInput);
    } else {
      await sendRefundConfirmationEmail(emailInput);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/account");

  return NextResponse.json({ message: "Account updated." });
}
