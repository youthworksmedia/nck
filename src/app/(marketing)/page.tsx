import type { Metadata } from "next";

import { NckPromoHome } from "@/components/nck-promo-home";
import { buildPublicMetadata } from "@/lib/metadata";
import { getPlans } from "@/lib/plans";
import { getCurrentUser } from "@/lib/portal";

export const metadata: Metadata = buildPublicMetadata({
  title: "Bible-centred curriculum for kids ministry",
  description:
    "A Bible-centred curriculum from Youthworks for your children's ministry. One per-church price gives your whole leadership team access.",
  path: "/"
});

export default async function HomePage() {
  const [plans, user] = await Promise.all([getPlans(), getCurrentUser()]);

  return <NckPromoHome plans={plans} isLoggedIn={Boolean(user)} />;
}
