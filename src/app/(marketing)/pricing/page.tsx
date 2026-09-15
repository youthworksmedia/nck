import type { Metadata } from "next";
import Link from "next/link";

import { PlanCard } from "@/components/plan-card";
import { buildPublicMetadata } from "@/lib/metadata";
import { getPlans } from "@/lib/plans";

export const metadata: Metadata = buildPublicMetadata({
  title: "Pricing",
  description:
    "Compare New Creation Kids annual subscription plans for small, medium, and large kids ministries.",
  path: "/pricing"
});

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <main className="site-shell section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Pricing</span>
          <h1>Three annual tiers for different ministry sizes.</h1>
        </div>
        <p>
          Pricing is per church, not per seat. Every annual plan includes the full curriculum library,
          unlimited invited accounts, account management, and order history.
        </p>
      </div>
      <div className="pricing-preview-callout panel">
        <div>
          <span className="eyebrow">Preview first</span>
          <h2>Browse the curriculum before your church commits.</h2>
          <p>
            Logged-out visitors can see lesson titles, descriptions, scriptures, and resource lists. Downloads unlock
            after login with an active membership.
          </p>
        </div>
        <Link href="/resources" className="button button-primary">
          Preview lessons
        </Link>
      </div>
      <div className="three-up">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
      <section className="pricing-faq panel" aria-labelledby="pricing-faq-title">
        <h2 id="pricing-faq-title">Before you purchase</h2>
        <div className="pricing-faq-grid">
          <div>
            <strong>Can all volunteers access the content?</strong>
            <p>Yes. Annual subscriptions include unlimited invited accounts for your church team.</p>
          </div>
          <div>
            <strong>Is pricing based on seats?</strong>
            <p>No. Choose the annual tier that best matches your kids ministry size.</p>
          </div>
          <div>
            <strong>What can visitors see before signing up?</strong>
            <p>They can preview the curriculum structure and lesson details, but files stay locked.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
