import type { SymbolId } from "../../models/Symbol.js";

export function calculateCombinationProbability(
  symbol: SymbolId,
  reelProbabilities: readonly Map<SymbolId, number>[],
): number {
  let probability = 1;

  for (const probabilities of reelProbabilities) {
    const symbolProbability = probabilities.get(symbol);

    if (symbolProbability === undefined) {
      return 0;
    }

    probability *= symbolProbability;
  }

  return probability;
}