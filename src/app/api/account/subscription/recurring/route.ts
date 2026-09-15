import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sendCancellationConfirmationEmail } from "@/lib/email-delivery";
import { getPlanByTierFromProducts } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestSupabaseAuth } from "@/lib/supabase/auth";
import { formatLongDateWithOrdinal } from "@/lib/time";

const schema = z.object({
  recurringEnabled: z.boolean()
});

export async function PATCH(request: Request) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Choose a valid renewal preference." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();
  const { user } = await getRequestSupabaseAuth();

  if (!adminSupabase || !user) {
    return NextResponse.json({ message: "Please sign in as the account holder." }, { status: 401 });
  }

  const { data: membership } = await adminSupabase
    .from("organization_members")
    .select("organization_id, role, invitation_email, display_name")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.json({ message: "Only the account holder can change renewal settings." }, { status: 403 });
  }

  const [{ data: subscription }, { data: organization }] = await Promise.all([
    adminSupabase
      .from("subscriptions")
      .select("id, tier, status, current_period_end, cancel_at_period_end")
      .eq("organization_id", membership.organization_id)
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from("organizations")
      .select("name, church_name, account_holder_name")
      .eq("id", membership.organization_id)
      .limit(1)
      .maybeSingle()
  ]);

  if (!subscription) {
    return NextResponse.json({ message: "Subscription could not be found." }, { status: 404 });
  }

  if (!["active", "trialing"].includes(subscription.status)) {
    return NextResponse.json(
      { message: "Automatic renewal can only be changed for an active subscription." },
      { status: 400 }
    );
  }

  const cancelAtPeriodEnd = !payload.data.recurringEnabled;
  const { error } = await adminSupabase
    .from("subscriptions")
    .update({
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq("id", subscription.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (cancelAtPeriodEnd && !subscription.cancel_at_period_end) {
    const plan = await getPlanByTierFromProducts(subscription.tier);
    const accessEndsDate = formatLongDateWithOrdinal(subscription.current_period_end);

    await sendCancellationConfirmationEmail({
      to: membership.invitation_email ?? user.email ?? "",
      accountHolderName:
        organization?.account_holder_name ?? membership.display_name ?? membership.invitation_email ?? "Account holder",
      churchName: organization?.church_name ?? organization?.name ?? "your church",
      planName: plan?.name ?? subscription.tier,
      accessEndsDate
    });
  }

  revalidatePath("/account");
  revalidatePath("/account/subscription");

  return NextResponse.json({
    message: payload.data.recurringEnabled
      ? "Auto renew is on."
      : "Auto renew is off. Access will continue until the current period ends."
  });
}
