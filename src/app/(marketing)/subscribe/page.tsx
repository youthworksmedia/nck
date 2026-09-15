import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout-form";
import { buildPublicMetadata } from "@/lib/metadata";
import { getPlanByTierFromProducts, getPlans } from "@/lib/plans";
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
  const plans = await getPlans();
  const plan = (await getPlanByTierFromProducts(params.tier ?? "")) ?? plans[0];

  const [user, membership, isOwner, isTeamMember, checkoutProfile] = await Promise.all([
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    isCurrentUserTeamMember(),
    getCheckoutProfile()
  ]);

  if (user && !isOwner && isTeamMember) {
    return (
      <main className="promo-subscribe-page">
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
    <main className="promo-subscribe-page">
      <div className="promo-subscribe-hero">
        <div>
          <p className="promo-eyebrow">Subscription</p>
          <h1>Complete checkout</h1>
          <p>
            Set up your New Creation Kids membership and unlock curriculum access for your church team.
          </p>
        </div>
      </div>

      <CheckoutForm
        plan={plan}
        defaults={
          isOwner
            ? checkoutProfile ?? {
                accountHolderName: user?.email?.split("@")[0] ?? "Account holder",
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
    </main>
  );
}
