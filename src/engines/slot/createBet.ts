import type { Bet } from "../../models/Bet.js";

export function createBet(
  totalCents: number,
  paylinesCount: number,
): Bet {
  if (!Number.isInteger(paylinesCount) || paylinesCount <= 0) {
    throw new Error("Paylines count must be greater than zero");
  }

  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Total bet must be a positive integer amount of cents");
  }

  // A bet that does not split evenly across lines would silently lose
  // the remainder, so it is rejected instead of rounded.
  if (totalCents % paylinesCount !== 0) {
    throw new Error(
      `Total bet ${totalCents} must be divisible by ${paylinesCount} paylines`,
    );
  }

  return {
    total: totalCents,
    line: totalCents / paylinesCount,
  };
}
