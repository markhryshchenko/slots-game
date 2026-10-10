import { toMajorUnits } from "../../core/money.js";

export interface CurrencyConfig {
  /** ISO 4217, lowercase (Stripe style); "usdt" is not ISO but follows the same rule. */
  code: string;
  /** Decimals of the currency: one major unit = 10^exponent minor units. */
  exponent: number;
  symbol: string;
}

export const currencies: readonly CurrencyConfig[] = [
  { code: "usd", exponent: 2, symbol: "$" },
  { code: "eur", exponent: 2, symbol: "€" },
  { code: "jpy", exponent: 0, symbol: "¥" },
  { code: "kwd", exponent: 3, symbol: "KD" },
  // A stablecoin: 6 decimals as on-chain, so a minor unit is 1 micro-USDT.
  { code: "usdt", exponent: 6, symbol: "₮" },
];

export function findCurrency(code: string): CurrencyConfig | undefined {
  return currencies.find((currency) => currency.code === code);
}

/** For currencies that already passed validation (accounts, sessions, rounds). */
export function getCurrency(code: string): CurrencyConfig {
  const currency = findCurrency(code);

  if (!currency) {
    throw new Error(`Unknown currency: ${code}`);
  }

  return currency;
}

/** Human-readable copy of an amount (`balanceFloat`); clients compute with minor units. */
export function toDisplayAmount(amount: number, currencyCode: string): number {
  return toMajorUnits(amount, getCurrency(currencyCode).exponent);
}
