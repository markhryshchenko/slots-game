/**
 * Converts integer minor units to major units for human-readable output only
 * (`balanceFloat` and reports); money is never computed with the result.
 * `exponent` is the currency's number of decimals: usd 2, jpy 0, kwd 3, usdt 6.
 */
export function toMajorUnits(amount: number, exponent: number): number {
  return amount / 10 ** exponent;
}

/**
 * Converts cents to major units for the math reports (sandbox, analyzer,
 * simulator), which are always computed in cents of a 2-decimal currency.
 */
export function fromCents(cents: number): number {
  return toMajorUnits(cents, 2);
}
