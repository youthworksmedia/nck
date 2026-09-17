import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

import { getIncludedGstBreakdown } from "@/lib/billing";
import { getPlans } from "@/lib/plans";
import { formatLongDateWithOrdinal } from "@/lib/time";
import { getCurrentOrganizationMembership } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type InvoiceOrder = {
  id: string;
  order_number: string;
  organization_id: string | null;
  account_holder_name: string;
  account_holder_email: string;
  church_name: string;
  plan_tier: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_provider: string;
  card_brand: string | null;
  card_last4: string | null;
  billing_address_line1: string;
  billing_suburb: string;
  billing_state: string;
  billing_postcode: string;
  billing_country: string;
  billing_phone: string | null;
  created_at: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const [supabase, adminSupabase, currentMembership] = await Promise.all([
    createSupabaseServerClient(),
    createSupabaseAdminClient(),
    getCurrentOrganizationMembership()
  ]);
  const { user, membership } = currentMembership;

  if (!supabase || !adminSupabase || !user) {
    return NextResponse.json({ message: "Please sign in to download invoices." }, { status: 403 });
  }

  if (!membership?.organization_id || membership.role !== "owner") {
    return NextResponse.json({ message: "Only account holders can download invoices." }, { status: 403 });
  }

  const { orderId } = await context.params;
  const { data: order, error } = await adminSupabase
    .from("purchase_orders")
    .select(
      "id, order_number, organization_id, account_holder_name, account_holder_email, church_name, plan_tier, amount, currency, payment_status, payment_provider, card_brand, card_last4, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone, created_at"
    )
    .eq("id", orderId)
    .eq("organization_id", membership.organization_id)
    .limit(1)
    .maybeSingle<InvoiceOrder>();

  if (error || !order) {
    return NextResponse.json({ message: "Invoice not found." }, { status: 404 });
  }

  const [pdf, plans] = await Promise.all([PDFDocument.create(), getPlans()]);
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const planName = plans.find((plan) => plan.id === order.plan_tier)?.name ?? order.plan_tier;
  const billing = getIncludedGstBreakdown(order.amount, order.billing_country);

  let y = 785;
  const drawLine = (label: string, value: string, size = 11) => {
    page.drawText(label, {
      x: 52,
      y,
      size,
      font: bold,
      color: rgb(0.07, 0.25, 0.43)
    });
    page.drawText(value, {
      x: 185,
      y,
      size,
      font: regular,
      color: rgb(0.12, 0.12, 0.12)
    });
    y -= 24;
  };

  page.drawRectangle({
    x: 40,
    y: 748,
    width: 515,
    height: 68,
    color: rgb(0.96, 0.95, 0.77)
  });

  page.drawText("New Creation Kids", {
    x: 52,
    y: 786,
    size: 24,
    font: bold,
    color: rgb(0.04, 0.31, 0.53)
  });

  page.drawText("Invoice", {
    x: 52,
    y: 760,
    size: 16,
    font: bold,
    color: rgb(0.8, 0.42, 0.04)
  });

  y = 710;
  drawLine("Order number", order.order_number);
  drawLine("Invoice date", formatLongDateWithOrdinal(order.created_at));
  drawLine("Subscription plan", planName);
  drawLine("Account holder", order.account_holder_name);
  drawLine("Email", order.account_holder_email);
  drawLine("Church", order.church_name);
  drawLine("Payment", `${order.card_brand ?? "Card"} ending in ${order.card_last4 ?? "----"}`);
  drawLine("Status", order.payment_status);
  drawLine("Subscription", formatCurrency(billing.subtotal, order.currency));
  if (billing.gstApplies) {
    drawLine("GST", formatCurrency(billing.gstAmount, order.currency));
  }
  drawLine("Total", formatCurrency(billing.total, order.currency));
  drawLine(
    "Billing address",
    `${order.billing_address_line1}, ${order.billing_suburb}, ${order.billing_state} ${order.billing_postcode}, ${order.billing_country}`
  );

  if (order.billing_phone) {
    drawLine("Phone", order.billing_phone);
  }

  y -= 12;
  page.drawText("Thank you for your purchase.", {
    x: 52,
    y,
    size: 12,
    font: bold,
    color: rgb(0.07, 0.25, 0.43)
  });

  y -= 18;
  page.drawText(
    "This invoice confirms your annual subscription purchase for New Creation Kids.",
    {
      x: 52,
      y,
      size: 11,
      font: regular,
      color: rgb(0.24, 0.24, 0.24)
    }
  );

  const bytes = await pdf.save();

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.order_number}-invoice.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}
