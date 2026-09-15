import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { MembershipSnapshot } from "@/types";

const footerFontSize = 7;
const minimumFooterFontSize = 5;
const footerBottomMargin = 8;
const footerSideMargin = 18;

function isActiveMembership(membership: MembershipSnapshot) {
  return membership.subscriptionStatus === "active" || membership.subscriptionStatus === "trialing";
}

function formatMonthYear(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function getLicensedFooterText(membership: MembershipSnapshot) {
  if (!isActiveMembership(membership)) {
    return null;
  }

  const churchName = membership.churchName?.trim() || membership.organizationName?.trim();
  const expiry = formatMonthYear(membership.renewalDate);

  if (!churchName || !expiry) {
    return null;
  }

  return `© Youthworks Media ${new Date().getFullYear()} Licensed to ${churchName} to ${expiry}`;
}

function isPdfFile(fileName: string, contentType?: string | null) {
  return fileName.toLowerCase().endsWith(".pdf") || contentType?.toLowerCase().includes("application/pdf");
}

function hasPdfHeader(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function getTextWidth(font: Awaited<ReturnType<PDFDocument["embedFont"]>>, text: string, size: number) {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    return null;
  }
}

function makeFooterTextEncodable(
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string,
  size: number
) {
  const replacements: Record<string, string> = {
    "–": "-",
    "—": "-",
    " ": " "
  };
  let normalized = text.normalize("NFKC");

  for (const [source, replacement] of Object.entries(replacements)) {
    normalized = normalized.replaceAll(source, replacement);
  }

  if (getTextWidth(font, normalized, size) !== null) {
    return normalized;
  }

  return Array.from(normalized)
    .map((character) => (getTextWidth(font, character, size) === null ? "?" : character))
    .join("");
}

export async function addLicensedFooterToPdf(
  bytes: Uint8Array,
  options: {
    contentType?: string | null;
    fileName: string;
    membership: MembershipSnapshot;
    enabled?: boolean;
  }
) {
  if (!options.enabled) {
    return bytes;
  }

  if (!isPdfFile(options.fileName, options.contentType) && !hasPdfHeader(bytes)) {
    return bytes;
  }

  const footerText = getLicensedFooterText(options.membership);

  if (!footerText) {
    return bytes;
  }

  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const encodableFooterText = makeFooterTextEncodable(font, footerText, footerFontSize);
  const firstPage = pages[0];

  if (firstPage) {
    const page = firstPage;
    const visibleBox = page.getCropBox();
    const maxWidth = Math.max(0, visibleBox.width - footerSideMargin * 2);
    let size = footerFontSize;
    let textWidth = font.widthOfTextAtSize(encodableFooterText, size);

    while (textWidth > maxWidth && size > minimumFooterFontSize) {
      size -= 0.5;
      textWidth = font.widthOfTextAtSize(encodableFooterText, size);
    }

    page.drawText(encodableFooterText, {
      x: visibleBox.x + Math.max(footerSideMargin, (visibleBox.width - textWidth) / 2),
      y: visibleBox.y + footerBottomMargin,
      size,
      font,
      color: rgb(0, 0, 0)
    });
  }

  return pdf.save();
}
