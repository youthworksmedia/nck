import { NextResponse } from "next/server";
import { z } from "zod";

import { validateDiscountCode } from "@/lib/discounts";
import { getPlanByTierFromProducts } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestSupabaseAuth } from "@/lib/supabase/auth";

const schema = z.object({
  code: z.string().trim().min(1),
  tier: z.enum(["essential", "growth", "scale"]),
  country: z.string().trim().optional().default("Australia")
});

async function findOwnerOrganizationId(
  adminSupabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  email?: string | null
) {
  const { data: byUserId } = await adminSupabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (byUserId?.organization_id) {
    return byUserId.organization_id;
  }

  if (!email) {
    return null;
  }

  const { data: byEmail } = await adminSupabase
    .from("organization_members")
    .select("organization_id")
    .eq("invitation_email", email.toLowerCase())
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  return byEmail?.organization_id ?? null;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "incorrect code" }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Discounts are unavailable right now." }, { status: 500 });
  }

  const plan = await getPlanByTierFromProducts(parsed.data.tier);

  if (!plan) {
    return NextResponse.json({ message: "incorrect code" }, { status: 400 });
  }

  const { user } = await getRequestSupabaseAuth();
  const organizationId = user
    ? await findOwnerOrganizationId(adminSupabase, user.id, user.email)
    : null;
  const result = await validateDiscountCode(adminSupabase, {
    code: parsed.data.code,
    plan,
    country: parsed.data.country,
    organizationId
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    message: `${result.discount.code} applied.`,
    code: result.discount.code,
    discountAmount: result.discountAmount,
    subtotal: result.billing.subtotal,
    gstAmount: result.billing.gstAmount,
    total: result.billing.total,
    gstApplies: result.billing.gstApplies
  });
}
