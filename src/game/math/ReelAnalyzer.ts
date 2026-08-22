import type { SymbolId } from "../../models/Symbol.js";
import type { SymbolProbability } from "../../models/SymbolProbability.js";

export class ReelAnalyzer {
  analyze(
    strip: readonly SymbolId[],
  ): SymbolProbability[] {
    if (strip.length === 0) {
      throw new Error("Reel strip cannot be empty");
    }

    const counts = new Map<SymbolId, number>();

    for (const symbol of strip) {
      counts.set(
        symbol,
        (counts.get(symbol) ?? 0) + 1,
      );
    }

    return Array.from(counts.entries()).map(
      ([symbol, occurrences]) => ({
        symbol,
        occurrences,
        probability: occurrences / strip.length,
      }),
    );
  }
}