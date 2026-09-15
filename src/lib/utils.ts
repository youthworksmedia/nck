import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "AUD") {
  const currencyCode = currency.toUpperCase();
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "code",
    maximumFractionDigits: 0
  })
    .format(amount)
    .replace(/\s+/g, " ");
}
