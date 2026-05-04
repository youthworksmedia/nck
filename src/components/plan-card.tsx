import Link from "next/link";

import { formatCurrency } from "@/lib/utils";
import type { Plan } from "@/lib/plans";

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className={`plan-card plan-card-${plan.id} ${plan.highlight ? "plan-card-highlight" : ""}`}>
      {plan.highlight ? <span className="eyebrow">{plan.highlight}</span> : null}
      <h3>{plan.name}</h3>
      <p className="plan-audience">{plan.studentRange}</p>
      <p className="price">
        {formatCurrency(plan.annualPrice)}
        <span>/year</span>
      </p>
      <p>{plan.audience}</p>
      <ul className="feature-list">
        <li>Full library of downloadable resources</li>
        <li>Unlimited invited account access</li>
        <li>Invoices and order history for account holders</li>
        <li>Shared curriculum access tied to one active annual subscription</li>
        <li>Secure login and account management</li>
      </ul>
      <Link href={`/subscribe?tier=${plan.id}`} className="button button-primary">
        Choose {plan.name}
      </Link>
    </article>
  );
}
