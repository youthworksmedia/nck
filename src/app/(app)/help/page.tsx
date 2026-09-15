import type { Metadata } from "next";
import { HelpCircle, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { buildPrivateMetadata } from "@/lib/metadata";
import { getPublishedHelpFaqs } from "@/lib/help-faqs";
import { getCurrentUser, getMembershipSnapshot, isCurrentUserOwner } from "@/lib/portal";
import { isCurrentUserSuperAdmin } from "@/lib/admin-access";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Help & FAQs",
  description: "Answers to common New Creation Kids classroom, preparation, and technical questions."
});

type HelpPageProps = {
  searchParams: Promise<{
    item?: string;
  }>;
};

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const [params, user, membership, isOwner, isSuperAdmin] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getMembershipSnapshot(),
    isCurrentUserOwner(),
    isCurrentUserSuperAdmin()
  ]);

  if (!user) {
    redirect("/login");
  }

  const hasActiveMembership = ["active", "trialing"].includes(membership.subscriptionStatus);

  if (!hasActiveMembership) {
    if (!isSuperAdmin) {
      redirect("/account");
    }
  }

  const sections = await getPublishedHelpFaqs(isSuperAdmin ? "all" : isOwner ? "account_holder" : "team_member");

  return (
    <main className="site-shell section account-page help-faq-page">
      <section className="help-faq-head">
        <span className="eyebrow">Help &amp; FAQs</span>
        <h1>Product Support</h1>
        <p>Quick answers for teaching, preparation, accounts, and downloads.</p>
      </section>

      <div className="help-faq-groups">
        {sections.map((section) => (
          <section className="help-faq-group" key={section.id}>
            <div className="help-faq-group-head">
              <span className="help-faq-group-icon" aria-hidden="true">
                <HelpCircle size={20} />
              </span>
              <div>
                <h2>{section.title}</h2>
                {section.description ? <p>{section.description}</p> : null}
              </div>
            </div>
            <div className="help-faq-list">
              {section.items.map((item) => (
                <details className="help-faq-item" key={item.id} id={item.id} open={params.item === item.id}>
                  <summary>
                    <span>{item.question}</span>
                    <Plus size={18} aria-hidden="true" />
                  </summary>
                  <div
                    className="help-faq-answer resource-html"
                    dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                  />
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
