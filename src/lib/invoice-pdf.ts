import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";

import { australiaGstRate, getIncludedGstBreakdown } from "./billing";

export type InvoicePdfOrder = {
  id: string;
  order_number: string;
  organization_id: string | null;
  account_holder_name: string;
  account_holder_email: string;
  church_name: string;
  plan_tier: string;
  amount: number;
  original_amount: number | null;
  discount_code: string | null;
  discount_amount: number;
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

type InvoiceFonts = {
  regular: PDFFont;
  bold: PDFFont;
  oblique: PDFFont;
};

type InvoicePdfPlan = {
  id: string;
  name: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const BLUE = rgb(0.02, 0.38, 0.64);
const MID_BLUE = rgb(0.1, 0.61, 0.83);
const LIGHT_BLUE = rgb(0.9, 0.96, 1);
const LINE_BLUE = rgb(0.64, 0.76, 0.88);
const TEXT = rgb(0.11, 0.12, 0.16);
const MUTED = rgb(0.33, 0.34, 0.39);
const TABLE_LINE = rgb(0.84, 0.88, 0.92);
const PAID_GREEN_BG = rgb(0.76, 0.93, 0.8);
const PAID_GREEN = rgb(0.02, 0.44, 0.12);

function roundCurrencyAmount(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normaliseCurrency(currency: string) {
  return (currency || "AUD").toUpperCase();
}

function formatMoney(amount: number, currency: string) {
  const absolute = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: normaliseCurrency(currency),
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(absolute);

  return amount < 0 ? `-${formatted}` : formatted;
}

function formatTableMoney(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatInvoiceDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney"
  }).format(date);
}

function titleCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatus(value: string) {
  const normalised = value.trim().toLowerCase();

  if (normalised === "paid") {
    return "Paid";
  }

  return titleCase(value || "Unknown");
}

function planDisplayName(planName: string) {
  const trimmed = planName.trim();
  const annual = /annual/i.test(trimmed) ? trimmed : `${trimmed} Annual Subscription`;

  return /^new creation kids/i.test(annual) ? annual : `New Creation Kids - ${annual}`;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = TEXT
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = TEXT
) {
  const width = font.widthOfTextAtSize(text, size);
  drawText(page, text, rightX - width, y, size, font, color);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  color = TEXT,
  lineHeight = size + 4
) {
  const lines = wrapText(text, font, size, maxWidth);

  lines.forEach((line, index) => {
    drawText(page, line, x, y - index * lineHeight, size, font, color);
  });

  return y - lines.length * lineHeight;
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number,
  fonts: InvoiceFonts,
  size = 11
) {
  drawText(page, label, x, y, size, fonts.bold);
  drawText(page, value, x + labelWidth, y, size, fonts.regular);
}

function addressLines(order: InvoicePdfOrder) {
  const suburbLine = [order.billing_suburb, order.billing_state, order.billing_postcode]
    .map((entry) => entry?.trim())
    .filter(Boolean)
    .join(" ");

  return [
    order.account_holder_name,
    order.church_name,
    order.billing_address_line1,
    suburbLine,
    order.billing_country,
    order.account_holder_email
  ].filter((line): line is string => Boolean(line?.trim()));
}

function supplierLines() {
  return [
    { text: "Youthworks Media", bold: true },
    { text: "Level 1, 263 Clarence Street" },
    { text: "Sydney NSW 2000, Australia" },
    { text: "ABN: 96 398 231 605", boldPrefix: "ABN:" },
    { text: "Phone: +61 2 8268 3344", boldPrefix: "Phone:" },
    { text: "Email: sales@youthworks.net", boldPrefix: "Email:" }
  ];
}

function drawBoldPrefix(
  page: PDFPage,
  text: string,
  prefix: string,
  x: number,
  y: number,
  fonts: InvoiceFonts,
  size: number
) {
  drawText(page, prefix, x, y, size, fonts.bold);
  drawText(page, text.slice(prefix.length), x + fonts.bold.widthOfTextAtSize(prefix, size), y, size, fonts.regular);
}

function drawStatusBadge(page: PDFPage, status: string, x: number, y: number, fonts: InvoiceFonts) {
  const paid = status.toLowerCase() === "paid";
  const label = formatStatus(status).toUpperCase();
  const bg = paid ? PAID_GREEN_BG : rgb(0.92, 0.92, 0.92);
  const fg = paid ? PAID_GREEN : TEXT;

  page.drawRectangle({ x, y: y - 5, width: 74, height: 18, color: bg });
  drawRightText(page, label, x + 37 + fonts.bold.widthOfTextAtSize(label, 10) / 2, y, 10, fonts.bold, fg);
}

function drawHeader(page: PDFPage, logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null, fonts: InvoiceFonts) {
  page.drawRectangle({ x: 0, y: 695, width: 395, height: 110, color: BLUE });
  page.drawRectangle({ x: 350, y: 695, width: 42, height: 110, color: MID_BLUE });
  page.drawRectangle({ x: 392, y: 695, width: 28, height: 110, color: rgb(0.58, 0.83, 0.94) });
  drawText(page, "TAX INVOICE", 34, 742, 38, fonts.bold, rgb(1, 1, 1));

  if (logoImage) {
    page.drawImage(logoImage, {
      x: 489,
      y: 701,
      width: 70,
      height: 80
    });
  } else {
    drawRightText(page, "NEW", 558, 756, 14, fonts.bold);
    drawRightText(page, "CREATION", 558, 740, 14, fonts.bold);
    drawRightText(page, "KIDS", 558, 710, 28, fonts.bold, MID_BLUE);
  }
}

function drawTopDetails(page: PDFPage, order: InvoicePdfOrder, fonts: InvoiceFonts) {
  let y = 662;

  for (const line of supplierLines()) {
    if (line.bold) {
      drawText(page, line.text, 34, y, 13, fonts.bold);
    } else if (line.boldPrefix) {
      drawBoldPrefix(page, line.text, line.boldPrefix, 34, y, fonts, 11);
    } else {
      drawText(page, line.text, 34, y, 11, fonts.regular);
    }
    y -= 16;
  }

  const status = formatStatus(order.payment_status);
  drawLabelValue(page, "Invoice number:", order.order_number, 312, 648, 94, fonts);
  drawLabelValue(page, "Invoice date:", formatInvoiceDate(order.created_at), 312, 624, 94, fonts);
  drawText(page, "Status:", 312, 600, 11, fonts.bold);
  drawStatusBadge(page, status, 406, 600, fonts);

  page.drawLine({
    start: { x: 25, y: 552 },
    end: { x: 570, y: 552 },
    thickness: 0.8,
    color: LINE_BLUE
  });
}

function drawCustomerAndPayment(page: PDFPage, order: InvoicePdfOrder, fonts: InvoiceFonts) {
  page.drawRectangle({ x: 25, y: 405, width: 265, height: 125, color: LIGHT_BLUE });
  drawText(page, "BILLED TO", 37, 512, 11, fonts.bold, BLUE);

  let y = 488;
  const lines = addressLines(order);

  lines.forEach((line, index) => {
    const font = index === 0 ? fonts.bold : fonts.regular;
    const size = index === 0 ? 12 : 11;
    y = drawWrappedText(page, line, 37, y, 235, size, font, TEXT, 16);
  });

  drawText(page, "PAYMENT DETAILS", 312, 512, 11, fonts.bold, BLUE);
  const cardBrand = order.card_brand?.trim() ? titleCase(order.card_brand) : "Card";
  const cardLast4 = order.card_last4?.trim() || "----";
  drawLabelValue(page, "Payment method:", `${cardBrand} ending in ${cardLast4}`, 312, 488, 130, fonts);
  drawLabelValue(page, "Payment date:", formatInvoiceDate(order.created_at), 312, 464, 130, fonts);
  drawLabelValue(page, "Status:", formatStatus(order.payment_status), 312, 440, 130, fonts);
}

function calculateInvoiceAmounts(order: InvoicePdfOrder) {
  const currency = normaliseCurrency(order.currency);
  const finalBilling = getIncludedGstBreakdown(Number(order.amount ?? 0), order.billing_country);
  const originalBilling = order.original_amount
    ? getIncludedGstBreakdown(Number(order.original_amount), order.billing_country)
    : finalBilling;
  const discountAmount = roundCurrencyAmount(Number(order.discount_amount ?? 0));
  const subtotal = finalBilling.subtotal;
  const gstAmount = finalBilling.gstAmount;
  const total = finalBilling.total;
  const originalSubtotal = discountAmount > 0
    ? roundCurrencyAmount(subtotal + discountAmount)
    : originalBilling.subtotal;

  return {
    currency,
    discountAmount,
    originalSubtotal,
    subtotal,
    gstAmount,
    total,
    gstApplies: finalBilling.gstApplies
  };
}

function drawItems(page: PDFPage, order: InvoicePdfOrder, planName: string, fonts: InvoiceFonts) {
  const amounts = calculateInvoiceAmounts(order);
  const tableX = 25;
  const tableTop = 390;
  const tableWidth = 545;
  const headerHeight = 30;
  const itemHeight = 70;
  const hasDiscount = amounts.discountAmount > 0;
  const discountHeight = hasDiscount ? 58 : 0;
  const tableHeight = headerHeight + itemHeight + discountHeight;
  const tableBottom = tableTop - tableHeight;
  const qtyX = 338;
  const unitRightX = 456;
  const amountRightX = 555;

  page.drawRectangle({
    x: tableX,
    y: tableTop - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: LIGHT_BLUE,
    borderColor: LINE_BLUE,
    borderWidth: 0.6
  });
  page.drawRectangle({
    x: tableX,
    y: tableBottom,
    width: tableWidth,
    height: tableHeight,
    borderColor: TABLE_LINE,
    borderWidth: 0.7
  });
  page.drawLine({
    start: { x: tableX, y: tableTop - headerHeight - itemHeight },
    end: { x: tableX + tableWidth, y: tableTop - headerHeight - itemHeight },
    thickness: 0.6,
    color: TABLE_LINE
  });

  drawText(page, "DESCRIPTION", 37, tableTop - 21, 9, fonts.bold, BLUE);
  drawText(page, "QTY", qtyX, tableTop - 21, 9, fonts.bold, BLUE);
  drawRightText(page, `UNIT PRICE (${amounts.currency})`, unitRightX, tableTop - 21, 9, fonts.bold, BLUE);
  drawRightText(page, `AMOUNT (${amounts.currency})`, amountRightX, tableTop - 21, 9, fonts.bold, BLUE);

  const description = planDisplayName(planName);
  drawWrappedText(page, description, 37, tableTop - 48, 260, 11, fonts.bold, TEXT, 14);
  drawText(page, "Access to New Creation Kids resources and content.", 37, tableTop - 72, 9.5, fonts.regular, MUTED);
  drawText(page, "One year subscription.", 37, tableTop - 88, 9.5, fonts.regular, MUTED);
  drawText(page, "1", qtyX + 7, tableTop - 56, 11, fonts.regular);
  drawRightText(page, formatTableMoney(amounts.originalSubtotal), unitRightX, tableTop - 56, 11, fonts.regular);
  drawRightText(page, formatTableMoney(amounts.originalSubtotal), amountRightX, tableTop - 56, 11, fonts.regular);

  if (hasDiscount) {
    drawText(page, "Discount", 37, tableTop - 127, 11, fonts.bold);
    drawText(
      page,
      order.discount_code ? `Discount code ${order.discount_code}` : "Annual subscription discount",
      37,
      tableTop - 144,
      9.5,
      fonts.regular,
      MUTED
    );
    drawText(page, "-", qtyX + 9, tableTop - 127, 11, fonts.regular);
    drawRightText(page, formatTableMoney(-amounts.discountAmount), unitRightX, tableTop - 127, 11, fonts.regular);
    drawRightText(page, formatTableMoney(-amounts.discountAmount), amountRightX, tableTop - 127, 11, fonts.regular);
  }

  return { tableBottom, amounts };
}

function drawTotals(
  page: PDFPage,
  tableBottom: number,
  amounts: ReturnType<typeof calculateInvoiceAmounts>,
  fonts: InvoiceFonts
) {
  const x = 320;
  const width = 250;
  const labelRight = 448;
  const amountRight = 555;
  const rowHeight = 30;
  const y = tableBottom - rowHeight;

  page.drawRectangle({ x, y, width, height: rowHeight, borderColor: TABLE_LINE, borderWidth: 0.6 });
  drawRightText(page, "Subtotal (ex GST)", labelRight, y + 10, 11, fonts.regular);
  drawRightText(page, formatTableMoney(amounts.subtotal), amountRight, y + 10, 11, fonts.regular);

  page.drawRectangle({ x, y: y - rowHeight, width, height: rowHeight, color: rgb(0.98, 0.98, 0.98), borderColor: TABLE_LINE, borderWidth: 0.6 });
  drawRightText(page, amounts.gstApplies ? `GST (${Math.round(australiaGstRate * 100)}%)` : "GST", labelRight, y - rowHeight + 10, 11, fonts.regular);
  drawRightText(page, formatTableMoney(amounts.gstAmount), amountRight, y - rowHeight + 10, 11, fonts.regular);

  page.drawRectangle({ x, y: y - rowHeight * 2, width, height: 34, color: LIGHT_BLUE });
  drawRightText(page, `TOTAL (${amounts.currency})`, labelRight, y - rowHeight * 2 + 11, 14, fonts.bold);
  drawRightText(page, formatTableMoney(amounts.total), amountRight, y - rowHeight * 2 + 11, 14, fonts.bold);

  drawRightText(
    page,
    `Total includes GST of ${amounts.currency} ${formatTableMoney(amounts.gstAmount)}`,
    amountRight,
    y - rowHeight * 2 - 24,
    10,
    fonts.oblique,
    MUTED
  );
}

function drawFooter(page: PDFPage, fonts: InvoiceFonts) {
  drawText(page, "Thank you for your purchase.", 25, 122, 17, fonts.bold, BLUE);
  drawText(
    page,
    "This invoice confirms your annual subscription purchase for New Creation Kids.",
    25,
    94,
    10.5,
    fonts.regular,
    MUTED
  );
  drawText(
    page,
    "If you have any questions, please contact us at",
    25,
    78,
    10.5,
    fonts.regular,
    MUTED
  );
  drawText(page, "sales@youthworks.net or +61 2 8268 3344.", 25, 62, 10.5, fonts.regular, MUTED);
}

export async function createInvoicePdf(input: {
  order: InvoicePdfOrder;
  plans: InvoicePdfPlan[];
  logoBytes?: Uint8Array | ArrayBuffer | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    oblique: await pdf.embedFont(StandardFonts.HelveticaOblique)
  };
  const logoImage = input.logoBytes ? await pdf.embedPng(input.logoBytes) : null;
  const planName = input.plans.find((plan) => plan.id === input.order.plan_tier)?.name ?? input.order.plan_tier;
  const { amounts, tableBottom } = drawItems(page, input.order, planName, fonts);

  drawHeader(page, logoImage, fonts);
  drawTopDetails(page, input.order, fonts);
  drawCustomerAndPayment(page, input.order, fonts);
  drawTotals(page, tableBottom, amounts, fonts);
  drawFooter(page, fonts);

  return pdf.save();
}

export const invoicePdfFormatting = {
  formatInvoiceDate,
  formatMoney
};
