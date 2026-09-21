"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import type { Plan } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";
import type { AdminDiscountCode } from "@/types";

type DiscountDraft = {
  code: string;
  description: string;
  planTier: string;
  discountType: "amount" | "percent";
  discountValue: string;
  maxUsesPerAccount: string;
  startsOn: string;
  endsOn: string;
  active: boolean;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function draftFromDiscount(discount: AdminDiscountCode): DiscountDraft {
  return {
    code: discount.code,
    description: discount.description,
    planTier: discount.planTier,
    discountType: discount.discountType,
    discountValue: String(discount.discountValue),
    maxUsesPerAccount: discount.maxUsesPerAccount ? String(discount.maxUsesPerAccount) : "",
    startsOn: discount.startsOn,
    endsOn: discount.endsOn ?? "",
    active: discount.active
  };
}

function emptyDraft(products: Plan[]): DiscountDraft {
  return {
    code: "",
    description: "",
    planTier: products[0]?.id ?? "essential",
    discountType: "percent",
    discountValue: "10",
    maxUsesPerAccount: "1",
    startsOn: todayISO(),
    endsOn: "",
    active: true
  };
}

function discountSummary(draft: DiscountDraft) {
  const value = Number(draft.discountValue) || 0;

  return draft.discountType === "percent" ? `${value}% off` : `${formatCurrency(value, "AUD")} off`;
}

export function AdminDiscountList({
  discounts,
  products
}: {
  discounts: AdminDiscountCode[];
  products: Plan[];
}) {
  const initialDraft = useMemo(() => emptyDraft(products), [products]);
  const [newDraft, setNewDraft] = useState<DiscountDraft>(initialDraft);
  const [drafts, setDrafts] = useState<Record<string, DiscountDraft>>(
    Object.fromEntries(discounts.map((discount) => [discount.id, draftFromDiscount(discount)]))
  );
  const [message, setMessage] = useState("Create discount codes for checkout.");
  const [savingId, setSavingId] = useState<string | null>(null);

  function productName(planTier: string) {
    return products.find((product) => product.id === planTier)?.name ?? planTier;
  }

  function payloadFromDraft(draft: DiscountDraft) {
    return {
      code: draft.code,
      description: draft.description,
      planTier: draft.planTier,
      discountType: draft.discountType,
      discountValue: Number(draft.discountValue),
      maxUsesPerAccount: draft.maxUsesPerAccount ? Number(draft.maxUsesPerAccount) : null,
      startsOn: draft.startsOn,
      endsOn: draft.endsOn || null,
      active: draft.active
    };
  }

  async function createDiscount() {
    setSavingId("new");
    setMessage("Creating discount...");

    try {
      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDraft(newDraft))
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "Discount could not be created.");
        return;
      }

      setMessage(payload.message ?? "Discount created.");
      window.location.reload();
    } catch {
      setMessage("Discount could not be created. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveDiscount(discountId: string) {
    const draft = drafts[discountId];

    if (!draft) {
      return;
    }

    setSavingId(discountId);
    setMessage(`Saving ${draft.code}...`);

    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDraft(draft))
      });
      const payload = (await response.json()) as { message?: string };

      setMessage(payload.message ?? (response.ok ? "Discount saved." : "Discount could not be saved."));
    } catch {
      setMessage("Discount could not be saved. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteDiscount(discountId: string, code: string) {
    if (!window.confirm(`Delete discount code ${code}?`)) {
      return;
    }

    setSavingId(discountId);
    setMessage(`Deleting ${code}...`);

    try {
      const response = await fetch(`/api/admin/discounts/${discountId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "Discount could not be deleted.");
        return;
      }

      setMessage(payload.message ?? "Discount deleted.");
      window.location.reload();
    } catch {
      setMessage("Discount could not be deleted. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  }

  function renderFields(draft: DiscountDraft, onChange: (next: Partial<DiscountDraft>) => void) {
    return (
      <div className="admin-product-fields admin-discount-fields">
        <label>
          Code
          <input
            value={draft.code}
            onChange={(event) => onChange({ code: event.target.value.toUpperCase().replace(/\s+/g, "") })}
            placeholder="WELCOME10"
            required
          />
        </label>
        <label>
          Product
          <select value={draft.planTier} onChange={(event) => onChange({ planTier: event.target.value })}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            value={draft.discountType}
            onChange={(event) => onChange({ discountType: event.target.value as DiscountDraft["discountType"] })}
          >
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
        </label>
        <label>
          Value
          <input
            type="number"
            min="0"
            step={draft.discountType === "percent" ? "1" : "0.01"}
            value={draft.discountValue}
            onChange={(event) => onChange({ discountValue: event.target.value })}
            required
          />
        </label>
        <label>
          Uses per account
          <input
            type="number"
            min="1"
            step="1"
            value={draft.maxUsesPerAccount}
            onChange={(event) => onChange({ maxUsesPerAccount: event.target.value })}
            placeholder="Unlimited"
          />
        </label>
        <label>
          Start date
          <input
            type="date"
            value={draft.startsOn}
            onChange={(event) => onChange({ startsOn: event.target.value })}
            required
          />
        </label>
        <label>
          End date
          <input
            type="date"
            value={draft.endsOn}
            onChange={(event) => onChange({ endsOn: event.target.value })}
          />
        </label>
        <label>
          Description
          <input
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Optional admin note"
          />
        </label>
        <label className="admin-toggle-row admin-discount-toggle">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => onChange({ active: event.target.checked })}
          />
          <span>Active</span>
        </label>
      </div>
    );
  }

  return (
    <div className="admin-product-list admin-discount-list">
      <article className="admin-product-card">
        <div className="section-head admin-product-head">
          <div>
            <h2>New discount</h2>
            <p>{discountSummary(newDraft)} for {productName(newDraft.planTier)}</p>
          </div>
        </div>
        {renderFields(newDraft, (next) => setNewDraft((current) => ({ ...current, ...next })))}
        <div className="admin-product-actions">
          <button className="button button-primary" type="button" onClick={createDiscount} disabled={savingId === "new"}>
            <Plus size={16} />
            <span>{savingId === "new" ? "Creating..." : "Create discount"}</span>
          </button>
        </div>
      </article>

      {discounts.map((discount) => {
        const draft = drafts[discount.id] ?? draftFromDiscount(discount);
        const isSaving = savingId === discount.id;

        return (
          <article className="admin-product-card" key={discount.id}>
            <div className="section-head admin-product-head">
              <div>
                <h2>{draft.code}</h2>
                <p>
                  {discountSummary(draft)} for {productName(draft.planTier)} · {discount.redemptionCount} used
                </p>
              </div>
              <strong className="admin-product-price">{draft.active ? "Active" : "Inactive"}</strong>
            </div>
            {renderFields(draft, (next) =>
              setDrafts((current) => ({
                ...current,
                [discount.id]: {
                  ...draft,
                  ...next
                }
              }))
            )}
            <div className="admin-product-actions admin-discount-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => deleteDiscount(discount.id, discount.code)}
                disabled={isSaving}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => saveDiscount(discount.id)}
                disabled={isSaving}
              >
                <Save size={16} />
                <span>{isSaving ? "Saving..." : "Save discount"}</span>
              </button>
            </div>
          </article>
        );
      })}
      <p className="form-status form-status-small admin-product-status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
