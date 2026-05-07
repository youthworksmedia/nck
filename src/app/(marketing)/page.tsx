import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { PlanCard } from "@/components/plan-card";
import { buildPublicMetadata } from "@/lib/metadata";
import { plans } from "@/lib/plans";

const featureCards = [
  {
    title: "3-year lesson cycle",
    text: "Follow Year A, Year B, and Year C across four editable terms each year. Lessons are organised so leaders can quickly find the right term, summary, description, and downloadable resources."
  },
  {
    title: "Resources ready for your team",
    text: "Upload and share PDFs, PowerPoints, worksheets, music, notes, and other teaching files in one simple library for your kids ministry leaders."
  },
  {
    title: "Shared access by invite",
    text: "Account holders can invite as many leaders as they need, see who has access, reset sub-account passwords, and review orders."
  }
];

export const metadata: Metadata = buildPublicMetadata({
  title: "Fun Bible lessons, curriculum and lesson planning",
  description:
    "Explore New Creation Kids for a 3-year curriculum cycle, downloadable lesson resources, shared account access, and orders.",
  path: "/"
});

export default function HomePage() {
  return (
    <main className="site-shell landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1>New Creation Kids</h1>
          <p>Engaging Bible lessons and resources for kids ministry teams.</p>
        </div>
      </section>

      <section className="landing-feature-grid">
        {featureCards.map((card, index) => (
          <article key={card.title} className={`landing-feature-card landing-feature-card-${index + 1}`}>
            <div className="landing-feature-image" />
            <div className="landing-feature-content">
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="membership-section">
        <div className="site-shell section membership-section-inner">
          <div className="section-head">
          <div>
              <span className="eyebrow">Membership</span>
              <h2>Choose the annual subscription level that matches your kids ministry size.</h2>
            </div>
            <p>
              Every plan includes the full curriculum library, lesson resources, order history, and unlimited invited accounts. Pricing is based on student numbers.
            </p>
          </div>
          <div className="three-up">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-promo panel">
        <div className="landing-promo-visual" aria-hidden="true">
          <div className="landing-promo-visual-card" />
        </div>
        <div className="landing-promo-copy">
          <div>
            <span className="eyebrow">Why teams choose it</span>
            <h2>Everything your church needs to run New Creation Kids with clarity and confidence.</h2>
            <p>
              Churches sign up because this gives leaders a clear 3-year curriculum system, downloadable teaching resources, and shared access for every invited leader in one easy-to-use place.
            </p>
          </div>
          <div className="landing-promo-points">
            <div>
            <Sparkles size={18} />
            <strong>Full curriculum, ready to go</strong>
            <p>Use Year A, Year B, and Year C across four terms, with admin-managed current year and term content.</p>
            </div>
            <div>
            <Sparkles size={18} />
            <strong>Creative resources in one place</strong>
            <p>Teacher manuals, student worksheets, PowerPoints, music, videos, and activities are organised by lesson.</p>
            </div>
            <div>
            <Sparkles size={18} />
            <strong>Shared access for your team</strong>
            <p>Invite leaders by email, manage sub-accounts, and keep the whole ministry working from the same content.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
