import { unstable_cache } from "next/cache";

export type PlanTier = "essential" | "growth" | "scale";
export type CurrencyCode = "AUD" | "NZD" | "USD" | "GBP";

export const supportedCurrencies: CurrencyCode[] = ["AUD", "NZD", "USD", "GBP"];
export const defaultCurrency: CurrencyCode = "AUD";

export type ProductPriceMap = Partial<Record<CurrencyCode, number>>;
export type ProductStripePriceMap = Partial<Record<CurrencyCode, string>>;

const includedFeaturesHtml = [
  "Full library of downloadable resources",
  "Unlimited invited account access",
  "Invoices and order history for account holders",
  "Shared curriculum access tied to one active annual subscription",
  "Secure login and account management"
]
  .map((feature) => `<li>${feature}</li>`)
  .join("");

function defaultSummaryHtml(intro: string) {
  return `<p>${intro}</p><ul>${includedFeaturesHtml}</ul>`;
}

export type Plan = {
  id: PlanTier;
  name: string;
  annualPrice: number;
  currency: CurrencyCode;
  prices: ProductPriceMap;
  stripePriceIds: ProductStripePriceMap;
  checkoutPriceEnvKey: "STRIPE_PRICE_TIER_ONE" | "STRIPE_PRICE_TIER_TWO" | "STRIPE_PRICE_TIER_THREE";
  audience: string;
  summaryHtml: string;
  studentRange: string;
  maxAdditionalTeamMembers: number | null;
  highlight?: string;
};

export const defaultPlans: Plan[] = [
  {
    id: "essential",
    name: "Small",
    annualPrice: 200,
    currency: defaultCurrency,
    prices: { AUD: 200 },
    stripePriceIds: {},
    checkoutPriceEnvKey: "STRIPE_PRICE_TIER_ONE",
    studentRange: "1-15 students",
    audience:
      "A great fit for smaller ministries with full curriculum access and unlimited invited accounts.",
    summaryHtml: defaultSummaryHtml(
      "A great fit for smaller ministries with full curriculum access and unlimited invited accounts."
    ),
    maxAdditionalTeamMembers: null
  },
  {
    id: "growth",
    name: "Medium",
    annualPrice: 300,
    currency: defaultCurrency,
    prices: { AUD: 300 },
    stripePriceIds: {},
    checkoutPriceEnvKey: "STRIPE_PRICE_TIER_TWO",
    studentRange: "16-50 students",
    audience:
      "Made for growing ministries with full curriculum access and unlimited invited accounts.",
    summaryHtml: defaultSummaryHtml(
      "Made for growing ministries with full curriculum access and unlimited invited accounts."
    ),
    maxAdditionalTeamMembers: null
  },
  {
    id: "scale",
    name: "Large",
    annualPrice: 500,
    currency: defaultCurrency,
    prices: { AUD: 500 },
    stripePriceIds: {},
    checkoutPriceEnvKey: "STRIPE_PRICE_TIER_THREE",
    studentRange: "51+ students",
    audience:
      "For larger ministries with full curriculum access and unlimited invited accounts.",
    summaryHtml: defaultSummaryHtml(
      "For larger ministries with full curriculum access and unlimited invited accounts."
    ),
    maxAdditionalTeamMembers: null
  }
];

export const plans = defaultPlans;

const planOrder: PlanTier[] = ["essential", "growth", "scale"];

function isPlanTier(value: string): value is PlanTier {
  return planOrder.includes(value as PlanTier);
}

function normalizePriceMap(value: unknown, fallbackPrice: number): ProductPriceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { AUD: fallbackPrice };
  }

  return supportedCurrencies.reduce<ProductPriceMap>((prices, currency) => {
    const amount = Number((value as Record<string, unknown>)[currency]);

    if (Number.isFinite(amount) && amount >= 0) {
      prices[currency] = amount;
    }

    return prices;
  }, {});
}

function normalizeStripePriceMap(value: unknown): ProductStripePriceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return supportedCurrencies.reduce<ProductStripePriceMap>((priceIds, currency) => {
    const priceId = (value as Record<string, unknown>)[currency];

    if (typeof priceId === "string" && priceId.trim()) {
      priceIds[currency] = priceId.trim();
    }

    return priceIds;
  }, {});
}

export function getPlanByTier(tier: string) {
  return plans.find((plan) => plan.id === tier);
}

export function getDefaultPlanByTier(tier: string) {
  return defaultPlans.find((plan) => plan.id === tier);
}

export function getPlanPrice(plan: Plan, currency: CurrencyCode = plan.currency) {
  return plan.prices[currency] ?? plan.prices[defaultCurrency] ?? plan.annualPrice;
}

export function normalizeProductRow(row: Record<string, unknown>): Plan | null {
  const id = String(row.plan_tier ?? row.id ?? "");

  if (!isPlanTier(id)) {
    return null;
  }

  const fallback = getDefaultPlanByTier(id) ?? defaultPlans[0];
  const prices = normalizePriceMap(row.prices, fallback.annualPrice);
  const currency = supportedCurrencies.includes(String(row.default_currency).toUpperCase() as CurrencyCode)
    ? (String(row.default_currency).toUpperCase() as CurrencyCode)
    : defaultCurrency;
  const annualPrice = prices[currency] ?? prices[defaultCurrency] ?? fallback.annualPrice;
  const summaryHtml =
    typeof row.summary_html === "string" && row.summary_html.trim()
      ? row.summary_html
      : fallback.summaryHtml;

  return {
    ...fallback,
    id,
    name: typeof row.title === "string" && row.title.trim() ? row.title.trim() : fallback.name,
    annualPrice,
    currency,
    prices,
    stripePriceIds: normalizeStripePriceMap(row.stripe_price_ids),
    studentRange:
      typeof row.product_type === "string" && row.product_type.trim()
        ? row.product_type.trim()
        : fallback.studentRange,
    audience: summaryHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || fallback.audience,
    summaryHtml
  };
}

async function getProductPlansFromDatabase() {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return defaultPlans;
  }

  const { data, error } = await adminSupabase
    .from("products")
    .select("plan_tier, title, product_type, summary_html, prices, default_currency, stripe_price_ids")
    .eq("active", true);

  if (error || !data?.length) {
    return defaultPlans;
  }

  const productMap = new Map(
    data
      .map((row) => normalizeProductRow(row as Record<string, unknown>))
      .filter((plan): plan is Plan => Boolean(plan))
      .map((plan) => [plan.id, plan])
  );

  return planOrder.map((tier) => productMap.get(tier) ?? getDefaultPlanByTier(tier)!);
}

const getCachedProductPlans = unstable_cache(getProductPlansFromDatabase, ["product-plans"], {
  revalidate: 300,
  tags: ["product-plans"]
});

export async function getPlans() {
  return getCachedProductPlans();
}

export async function getPlanByTierFromProducts(tier: string) {
  const productPlans = await getPlans();

  return productPlans.find((plan) => plan.id === tier);
}
