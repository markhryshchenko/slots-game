import type { Bet } from "../models/Bet.js";
import { toCents } from "./money.js";

export function createBet(
  totalBet: number,
  paylinesCount: number,
): Bet {
  if (!Number.isFinite(totalBet) || totalBet <= 0) {
    throw new Error("Total bet must be greater than zero");
  }

  if (!Number.isInteger(paylinesCount) || paylinesCount <= 0) {
    throw new Error("Paylines count must be greater than zero");
  }

  const totalCents = toCents(totalBet);

  return {
    total: totalCents,
    line: Math.floor(totalCents / paylinesCount),
  };
}