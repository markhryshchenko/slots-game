import type { SymbolId } from "./Symbol.js";

export interface Win {
  paylineId: number;
  symbol: SymbolId;
  count: number;
  multiplier: number;
  amount: number;
}