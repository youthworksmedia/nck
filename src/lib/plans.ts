export type PlanTier = "essential" | "growth" | "scale";

export type Plan = {
  id: PlanTier;
  name: string;
  annualPrice: number;
  checkoutPriceEnvKey: "STRIPE_PRICE_TIER_ONE" | "STRIPE_PRICE_TIER_TWO" | "STRIPE_PRICE_TIER_THREE";
  audience: string;
  studentRange: string;
  maxAdditionalTeamMembers: number | null;
  includesLessonBuilder: boolean;
  highlight?: string;
};

export const plans: Plan[] = [
  {
    id: "essential",
    name: "Small",
    annualPrice: 200,
    checkoutPriceEnvKey: "STRIPE_PRICE_TIER_ONE",
    studentRange: "1-15 students",
    audience:
      "A great fit for smaller ministries with full curriculum access and unlimited invited accounts.",
    maxAdditionalTeamMembers: null,
    includesLessonBuilder: false
  },
  {
    id: "growth",
    name: "Medium",
    annualPrice: 300,
    checkoutPriceEnvKey: "STRIPE_PRICE_TIER_TWO",
    studentRange: "16-50 students",
    audience:
      "Made for growing ministries with full curriculum access and unlimited invited accounts.",
    maxAdditionalTeamMembers: null,
    includesLessonBuilder: false
  },
  {
    id: "scale",
    name: "Large",
    annualPrice: 500,
    checkoutPriceEnvKey: "STRIPE_PRICE_TIER_THREE",
    studentRange: "51+ students",
    audience:
      "For larger ministries with full curriculum access and unlimited invited accounts.",
    maxAdditionalTeamMembers: null,
    includesLessonBuilder: false
  }
];

export function getPlanByTier(tier: string) {
  return plans.find((plan) => plan.id === tier);
}

export function planAllowsLessonBuilder(tier: string) {
  return getPlanByTier(tier)?.includesLessonBuilder ?? false;
}
