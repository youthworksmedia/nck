import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { createInvoicePdf, type InvoicePdfOrder } from "@/lib/invoice-pdf";
import { getPlans } from "@/lib/plans";
import { getCurrentOrganizationMembership } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
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
      "id, order_number, organization_id, account_holder_name, account_holder_email, church_name, plan_tier, amount, original_amount, discount_code, discount_amount, currency, payment_status, payment_provider, card_brand, card_last4, billing_address_line1, billing_suburb, billing_state, billing_postcode, billing_country, billing_phone, created_at"
    )
    .eq("id", orderId)
    .eq("organization_id", membership.organization_id)
    .limit(1)
    .maybeSingle<InvoicePdfOrder>();

  if (error || !order) {
    return NextResponse.json({ message: "Invoice not found." }, { status: 404 });
  }

  const [plans, logoBytes] = await Promise.all([
    getPlans(),
    readFile(path.join(process.cwd(), "public", "nck-logo.png")).catch(() => null)
  ]);
  const bytes = await createInvoicePdf({ order, plans, logoBytes });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.order_number}-invoice.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}
