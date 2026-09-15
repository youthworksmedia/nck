"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { formatCurrency } from "@/lib/utils";
import type { Plan } from "@/lib/plans";

type ProductDraft = {
  title: string;
  productType: string;
  summaryHtml: string;
  audPrice: string;
  audStripePriceId: string;
};

function draftFromPlan(plan: Plan): ProductDraft {
  return {
    title: plan.name,
    productType: plan.studentRange,
    summaryHtml: plan.summaryHtml,
    audPrice: String(plan.prices.AUD ?? plan.annualPrice),
    audStripePriceId: plan.stripePriceIds.AUD ?? ""
  };
}

export function AdminProductList({ products }: { products: Plan[] }) {
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>(
    Object.fromEntries(products.map((product) => [product.id, draftFromPlan(product)]))
  );
  const [messages, setMessages] = useState<Record<string, string>>(
    Object.fromEntries(
      products.map((product) => [
        product.id,
        "AUD is active now. NZD, USD, and GBP price slots are ready for the next currency pass."
      ])
    )
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  function updateDraft(productId: string, nextDraft: Partial<ProductDraft>) {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        ...nextDraft
      }
    }));
  }

  async function saveProduct(product: Plan) {
    const draft = drafts[product.id];

    if (!draft) {
      return;
    }

    setSavingId(product.id);
    setMessages((current) => ({
      ...current,
      [product.id]: `Saving ${draft.title || product.name}...`
    }));

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: draft.title,
          productType: draft.productType,
          summaryHtml: draft.summaryHtml,
          prices: {
            AUD: Number(draft.audPrice)
          },
          defaultCurrency: "AUD",
          stripePriceIds: {
            AUD: draft.audStripePriceId
          }
        })
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessages((current) => ({
          ...current,
          [product.id]: payload.message ?? "Product could not be saved."
        }));
        return;
      }

      setMessages((current) => ({
        ...current,
        [product.id]: payload.message ?? "Product saved."
      }));
    } catch {
      setMessages((current) => ({
        ...current,
        [product.id]: "Product could not be saved. Check your connection and try again."
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-product-list">
      {products.map((product) => {
        const draft = drafts[product.id] ?? draftFromPlan(product);
        const audPrice = Number(draft.audPrice) || 0;
        const isSaving = savingId === product.id;

        return (
          <article className="admin-product-card" key={product.id}>
            <div className="section-head admin-product-head">
              <div>
                <h2>{draft.title || product.name}</h2>
                <p>{draft.productType || product.studentRange}</p>
              </div>
              <strong className="admin-product-price">{formatCurrency(audPrice, "AUD")}</strong>
            </div>

            <div className="admin-product-fields">
              <label>
                Title
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft(product.id, { title: event.target.value })}
                  required
                />
              </label>
              <label>
                Type
                <input
                  value={draft.productType}
                  onChange={(event) => updateDraft(product.id, { productType: event.target.value })}
                  placeholder="How many students"
                  required
                />
              </label>
              <label>
                Price AUD
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.audPrice}
                  onChange={(event) => updateDraft(product.id, { audPrice: event.target.value })}
                  required
                />
              </label>
              <label>
                Stripe price ID
                <input
                  value={draft.audStripePriceId}
                  onChange={(event) => updateDraft(product.id, { audStripePriceId: event.target.value })}
                  placeholder="price_..."
                />
              </label>
            </div>

            <WysiwygEditor
              label="Summary"
              value={draft.summaryHtml}
              onChange={(summaryHtml) => updateDraft(product.id, { summaryHtml })}
              placeholder="Add a short product summary"
            />

            <div className="admin-product-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={isSaving}
                onClick={() => saveProduct(product)}
              >
                <Save size={16} />
                <span>{isSaving ? "Saving..." : "Save product"}</span>
              </button>
            </div>
            <p className="form-status form-status-small admin-product-status" aria-live="polite">
              {messages[product.id]}
            </p>
          </article>
        );
      })}
    </div>
  );
}
