import type { Metadata } from "next";

import { PlanCard } from "@/components/plan-card";
import { buildPublicMetadata } from "@/lib/metadata";
import { plans } from "@/lib/plans";

export const metadata: Metadata = buildPublicMetadata({
  title: "Pricing",
  description:
    "Compare New Creation Kids annual subscription plans for small, medium, and large kids ministries.",
  path: "/pricing"
});

export default function PricingPage() {
  return (
    <main className="site-shell section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Pricing</span>
          <h1>Three annual tiers for different ministry sizes.</h1>
        </div>
        <p>
          Every plan includes the full curriculum library, unlimited invited accounts, account management, order history, and downloadable invoices.
        </p>
      </div>
      <div className="three-up">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </main>
  );
}
