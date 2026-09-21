import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingBreakdown } from "@/lib/billing";
import type { Plan, PlanTier } from "@/lib/plans";
import { getTodayISO } from "@/lib/time";

export type DiscountType = "amount" | "percent";

export type DiscountCode = {
  id: string;
  code: string;
  description: string;
  planTier: PlanTier;
  discountType: DiscountType;
  discountValue: number;
  maxUsesPerAccount: number | null;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DiscountValidationResult =
  | {
      ok: true;
      discount: DiscountCode;
      originalSubtotal: number;
      discountedSubtotal: number;
      discountAmount: number;
      billing: ReturnType<typeof getBillingBreakdown>;
    }
  | {
      ok: false;
      message: "expired" | "incorrect code" | "This code has already been used for this account.";
    };

export function normalizeDiscountCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeDiscountRow(row: Record<string, unknown>): DiscountCode {
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? ""),
    description: String(row.description ?? ""),
    planTier: String(row.plan_tier ?? "essential") as PlanTier,
    discountType: String(row.discount_type ?? "amount") as DiscountType,
    discountValue: Number(row.discount_value ?? 0),
    maxUsesPerAccount:
      row.max_uses_per_account === null || row.max_uses_per_account === undefined
        ? null
        : Number(row.max_uses_per_account),
    startsOn: String(row.starts_on ?? ""),
    endsOn: row.ends_on ? String(row.ends_on) : null,
    active: Boolean(row.active),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function roundCurrencyAmount(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateDiscountedSubtotal(planPrice: number, discount: Pick<DiscountCode, "discountType" | "discountValue">) {
  const discountAmount =
    discount.discountType === "percent"
      ? roundCurrencyAmount(planPrice * (discount.discountValue / 100))
      : roundCurrencyAmount(discount.discountValue);
  const clampedDiscount = Math.min(planPrice, Math.max(0, discountAmount));

  return {
    discountAmount: clampedDiscount,
    discountedSubtotal: roundCurrencyAmount(Math.max(0, planPrice - clampedDiscount))
  };
}

export async function validateDiscountCode(
  adminSupabase: SupabaseClient,
  input: {
    code: string;
    plan: Plan;
    country?: string | null;
    organizationId?: string | null;
  }
): Promise<DiscountValidationResult> {
  const normalizedCode = normalizeDiscountCode(input.code);

  if (!normalizedCode) {
    return { ok: false, message: "incorrect code" };
  }

  const { data, error } = await adminSupabase
    .from("discount_codes")
    .select("*")
    .eq("code", normalizedCode)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "incorrect code" };
  }

  const discount = normalizeDiscountRow(data as Record<string, unknown>);
  const today = getTodayISO();

  if (discount.planTier !== input.plan.id || discount.startsOn > today || (discount.endsOn && discount.endsOn < today)) {
    return { ok: false, message: "expired" };
  }

  if (discount.maxUsesPerAccount && input.organizationId) {
    const { count } = await adminSupabase
      .from("discount_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("discount_code_id", discount.id)
      .eq("organization_id", input.organizationId);

    if ((count ?? 0) >= discount.maxUsesPerAccount) {
      return { ok: false, message: "This code has already been used for this account." };
    }
  }

  const { discountAmount, discountedSubtotal } = calculateDiscountedSubtotal(input.plan.annualPrice, discount);

  return {
    ok: true,
    discount,
    originalSubtotal: input.plan.annualPrice,
    discountedSubtotal,
    discountAmount,
    billing: getBillingBreakdown(discountedSubtotal, input.country)
  };
}
