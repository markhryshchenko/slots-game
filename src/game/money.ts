/**
 * Converts minor units to major units for human-readable reports only.
 * Assumes a 2-decimal currency (USD, EUR); zero-decimal (JPY) and
 * three-decimal (KWD) currencies need a per-currency exponent.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}
