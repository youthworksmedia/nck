import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { normalizeDiscountCode } from "@/lib/discounts";
import { defaultPlans } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const planTiers = defaultPlans.map((plan) => plan.id) as [string, ...string[]];

const discountSchema = z
  .object({
    code: z.string().trim().min(2, "Add a discount code."),
    description: z.string().trim().optional().default(""),
    planTiers: z.array(z.enum(planTiers)).min(1, "Select at least one product."),
    discountType: z.enum(["amount", "percent"]),
    discountValue: z.coerce.number().positive("Add a discount value."),
    maxUsesPerAccount: z.coerce.number().int().positive().nullable().optional(),
    startsOn: z.string().trim().min(10, "Add a start date."),
    endsOn: z.string().trim().nullable().optional(),
    active: z.boolean().default(true)
  })
  .refine((value) => value.discountType !== "percent" || value.discountValue <= 100, {
    message: "Percent discounts must be 100 or less."
  })
  .refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
    message: "End date must be on or after the start date."
  });

export async function POST(request: Request) {
  if (!(await isCurrentUserSuperAdmin())) {
    return NextResponse.json({ message: "Admin login required." }, { status: 401 });
  }

  const parsed = discountSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Discount details are incomplete." },
      { status: 400 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({ message: "Supabase admin access is required." }, { status: 400 });
  }

  const code = normalizeDiscountCode(parsed.data.code);

  const { error } = await adminSupabase.from("discount_codes").insert({
    code,
    description: parsed.data.description,
    plan_tier: parsed.data.planTiers[0],
    plan_tiers: parsed.data.planTiers,
    discount_type: parsed.data.discountType,
    discount_value: parsed.data.discountValue,
    max_uses_per_account: parsed.data.maxUsesPerAccount ?? null,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn || null,
    active: parsed.data.active
  });

  if (error) {
    return NextResponse.json(
      {
        message: error.message.includes("duplicate")
          ? "That discount code already exists."
          : error.message
      },
      { status: 400 }
    );
  }

  revalidatePath("/admin");

  return NextResponse.json({ message: `${code} created.` });
}
