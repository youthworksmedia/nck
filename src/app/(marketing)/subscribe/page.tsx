import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout-form";
import { buildPublicMetadata } from "@/lib/metadata";
import { getPlanByTier, plans } from "@/lib/plans";
import {
  getCheckoutProfile,
  getCurrentUser,
  getMembershipSnapshot,
  isCurrentUserOwner,
  isCurrentUserTeamMember
} from "@/lib/portal";

type SubscribePageProps = {
  searchParams: Promise<{
    tier?: string;
  }>;
};

export const metadata: Metadata = buildPublicMetadata({
  title: "Subscribe",
  description: "Complete your New Creation Kids membership checkout or renewal.",
  path: "/subscribe"
});

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const params = await searchParams;
  const plan = getPlanByTier(params.tier ?? "") ?? plans[0];

  const [user, membership, isOwner, isTeamMember, checkoutProfile] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    isCurrentUserTeamMember(),
    getCheckoutProfile()
  ]);

  if (user && !isOwner && isTeamMember) {
    return (
      <main className="site-shell section">
        <div className="panel checkout-blocked">
          <span className="eyebrow">Checkout</span>
          <h1>Start a new purchase from a separate account</h1>
          <p>
            You are currently signed in as a team member. Please log out first if you want to
            create a brand-new account holder subscription.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="site-shell section">
      <div className="section-head app-page-head subscribe-page-head">
        <div>
          <h1>Choose your annual plan and complete checkout</h1>
          <p>
            This flow is set up like a real ecommerce checkout and is ready for Stripe later,
            while still supporting safe fake-card purchases right now.
          </p>
        </div>
      </div>

      <CheckoutForm
        plan={plan}
        defaults={
          isOwner
            ? checkoutProfile ?? {
                accountHolderName: "",
                churchName: membership.churchName,
                email: user?.email ?? "",
                phone: "",
                addressLine1: "",
                suburb: "",
                state: "",
                postcode: "",
                country: "Australia"
              }
            : undefined
        }
        isSignedInOwner={isOwner}
      />

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Included</span>
            <h2>All three memberships at a glance</h2>
          </div>
        </div>
        <div className="three-up">
          {plans.map((entry) => (
            <article key={entry.id} className="panel panel-compact">
              <h3>{entry.name}</h3>
              <p>{entry.studentRange}. Unlimited invited accounts and full curriculum access.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
