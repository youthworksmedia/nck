import { addYears, formatISO } from "@/lib/time";
import type { PlanTier } from "@/lib/plans";

export const acceptedFakeCards = [
  {
    number: "4242424242424242",
    brand: "Visa",
    label: "Visa test card"
  },
  {
    number: "4111111111111111",
    brand: "Visa",
    label: "Visa alternate"
  },
  {
    number: "5555555555554444",
    brand: "Mastercard",
    label: "Mastercard test card"
  },
  {
    number: "378282246310005",
    brand: "American Express",
    label: "Amex test card"
  }
] as const;

export function normalizeCardNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function detectFakeCardBrand(cardNumber: string) {
  const normalized = normalizeCardNumber(cardNumber);
  return acceptedFakeCards.find((entry) => entry.number === normalized)?.brand ?? "Card";
}

export function detectCardBrandFromPrefix(cardNumber: string) {
  const normalized = normalizeCardNumber(cardNumber);

  if (/^4/.test(normalized)) {
    return "Visa";
  }

  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(normalized)) {
    return "Mastercard";
  }

  if (/^3[47]/.test(normalized)) {
    return "American Express";
  }

  if (/^6(?:011|5)/.test(normalized)) {
    return "Discover";
  }

  return "";
}

export function isAcceptedFakeCard(cardNumber: string) {
  const normalized = normalizeCardNumber(cardNumber);
  return acceptedFakeCards.some((entry) => entry.number === normalized);
}

export function getCardLast4(cardNumber: string) {
  const normalized = normalizeCardNumber(cardNumber);
  return normalized.slice(-4);
}

export function getFakeExpiryDate() {
  const startedAt = new Date();
  const renewalDate = addYears(startedAt, 1);

  return {
    startedAt: formatISO(startedAt),
    renewalDate: formatISO(renewalDate)
  };
}

export function createOrderNumber(planTier: PlanTier) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NCK-${planTier.toUpperCase()}-${stamp}-${suffix}`;
}
