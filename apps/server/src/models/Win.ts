import type { SymbolId } from "./Symbol.js";

export interface Win {
  paylineId: number;
  symbol: SymbolId;
  count: number;
  multiplier: number;
  /** Integer minor units (cents), never a float. */
  amount: number;
}