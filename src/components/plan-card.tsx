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
        {formatCurrency(plan.annualPrice, plan.currency)}
        <span>/year</span>
      </p>
      <div className="plan-summary" dangerouslySetInnerHTML={{ __html: plan.summaryHtml }} />
      <Link
        href={`/subscribe?tier=${plan.id}`}
        className="button button-primary"
      >
        Choose {plan.name}
      </Link>
    </article>
  );
}
