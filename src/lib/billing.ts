export const australiaGstRate = 0.1;

export function isAustralianBillingCountry(country?: string | null) {
  if (!country) {
    return false;
  }

  const normalized = country.trim().toLowerCase();
  return normalized === "australia" || normalized === "au";
}

function roundCurrencyAmount(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function getBillingBreakdown(subtotal: number, country?: string | null) {
  const gstApplies = isAustralianBillingCountry(country);
  const gstAmount = gstApplies ? roundCurrencyAmount(subtotal * australiaGstRate) : 0;

  return {
    subtotal: roundCurrencyAmount(subtotal),
    gstApplies,
    gstAmount,
    total: roundCurrencyAmount(subtotal + gstAmount)
  };
}

export function getIncludedGstBreakdown(total: number, country?: string | null) {
  const gstApplies = isAustralianBillingCountry(country);

  if (!gstApplies) {
    return {
      subtotal: roundCurrencyAmount(total),
      gstApplies,
      gstAmount: 0,
      total: roundCurrencyAmount(total)
    };
  }

  const subtotal = roundCurrencyAmount(total / (1 + australiaGstRate));

  return {
    subtotal,
    gstApplies,
    gstAmount: roundCurrencyAmount(total - subtotal),
    total: roundCurrencyAmount(total)
  };
}
