import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "AUD") {
  const currencyCode = currency.toUpperCase();
  const hasCents = !Number.isInteger(amount);

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "code",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2
  })
    .format(amount)
    .replace(/\s+/g, " ");
}
