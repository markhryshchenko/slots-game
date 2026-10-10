export interface RatesSnapshot {
  base: string;
  /** When the snapshot was taken; clients show rates as "as of". */
  updatedAt: string;
  /** Units of each currency for one unit of `base`, in major units. */
  rates: Readonly<Record<string, number>>;
}

// A static snapshot until an external rates source is connected. Rates are
// informational (client display, future reports): money is never converted
// with them — every account, bet and win stays in its own currency.
export const ratesSnapshot: RatesSnapshot = {
  base: "usd",
  updatedAt: "2026-10-10T00:00:00Z",
  rates: {
    usd: 1,
    eur: 0.92,
    jpy: 150,
    kwd: 0.307,
    usdt: 1,
  },
};
