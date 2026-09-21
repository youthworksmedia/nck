import { readFile } from "node:fs/promises";
import path from "node:path";

import { createInvoicePdf, type InvoicePdfOrder } from "@/lib/invoice-pdf";
import { getPlans } from "@/lib/plans";

export type EmailAttachment = {
  filename: string;
  content: string;
  content_type?: string;
};

export async function createInvoiceEmailAttachment(order: InvoicePdfOrder): Promise<EmailAttachment> {
  const [plans, logoBytes] = await Promise.all([
    getPlans(),
    readFile(path.join(process.cwd(), "public", "nck-logo.png")).catch(() => null)
  ]);
  const pdfBytes = await createInvoicePdf({ order, plans, logoBytes });
  const filename = `${order.order_number || "New-Creation-Kids"}-invoice.pdf`;

  return {
    filename,
    content: Buffer.from(pdfBytes).toString("base64"),
    content_type: "application/pdf"
  };
}
