import type { SymbolId } from "./Symbol.js";

export interface SymbolProbability {
  symbol: SymbolId;
  occurrences: number;
  probability: number;
}