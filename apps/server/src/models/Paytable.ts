import type { SymbolId } from "./Symbol.js";

export interface SymbolPayout<S extends SymbolId = SymbolId> {
  symbol: S;
  payouts: Record<number, number>;
}

export type Paytable<S extends SymbolId = SymbolId> = readonly SymbolPayout<S>[];
