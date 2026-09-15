import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { isCurrentUserSuperAdmin } from "@/lib/admin-access";
import { defaultCurrency, getDefaultPlanByTier, supportedCurrencies } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

const productSchema = z.object({
  title: z.string().trim().min(1, "Add a product title."),
  productType: z.string().trim().min(1, "Add the student range."),
  summaryHtml: z.string().trim().min(1, "Add the product summary."),
  defaultCurrency: z.enum(supportedCurrencies as [string, ...string[]]).default(defaultCurrency),
  prices: z
    .object({
      AUD: z.number().min(0),
      NZD: z.number().min(0).optional(),
      USD: z.number().min(0).optional(),
      GBP: z.number().min(0).optional()
    })
    .refine((prices) => Number.isFinite(prices.AUD), "Add an AUD price."),
  stripePriceIds: z
    .object({
      AUD: z.string().trim().optional(),
      NZD: z.string().trim().optional(),
      USD: z.string().trim().optional(),
      GBP: z.string().trim().optional()
    })
    .optional()
});

export async function PUT(request: Request, context: RouteContext) {
  const isAuthenticated = await isCurrentUserSuperAdmin();

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Admin login required." }, { status: 401 });
  }

  const { productId } = await context.params;
  const defaultPlan = getDefaultPlanByTier(productId);

  if (!defaultPlan) {
    return NextResponse.json({ message: "Unknown product." }, { status: 404 });
  }

  const parsed = productSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Product details are incomplete." },
      { status: 400 }
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { message: "SUPABASE_SERVICE_ROLE_KEY is required for product changes." },
      { status: 400 }
    );
  }

  const priceIds = supportedCurrencies.reduce<Record<string, string>>((ids, currency) => {
    const priceId = parsed.data.stripePriceIds?.[currency]?.trim();

    if (priceId) {
      ids[currency] = priceId;
    }

    return ids;
  }, {});
  const { error } = await adminSupabase.from("products").upsert(
    {
      plan_tier: defaultPlan.id,
      title: parsed.data.title,
      product_type: parsed.data.productType,
      summary_html: parsed.data.summaryHtml,
      prices: parsed.data.prices,
      default_currency: parsed.data.defaultCurrency,
      stripe_price_ids: priceIds,
      active: true,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "plan_tier"
    }
  );

  if (error) {
    return NextResponse.json(
      { message: error.message.includes("products") ? "Product could not be saved. Please try again shortly." : error.message },
      { status: 400 }
    );
  }

  revalidateTag("product-plans");
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/subscribe");
  revalidatePath("/account");

  return NextResponse.json({ message: `${parsed.data.title} saved.` });
}
