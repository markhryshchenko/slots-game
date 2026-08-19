import type { SymbolId } from "./Symbol.js";

export interface SymbolPayout {
  symbol: SymbolId;
  payouts: Record<number, number>;
}

export type Paytable = readonly SymbolPayout[];