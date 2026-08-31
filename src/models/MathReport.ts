import type { SymbolProbability } from "./SymbolProbability.js";

export interface ReelSymbolProbabilities {
  reelId: number;
  probabilities: SymbolProbability[];
}

export interface MathReport {
  profileId: string;
  totalOutcomes: number;

  theoreticalRtp: number;
  expectedWin: number;

  hitRate: number;
  winningOutcomes: number;

  averageWinOnHit: number;

  variance: number;
  standardDeviation: number;
  /** standardDeviation / theoreticalRtp — normalized volatility. */
  volatilityIndex: number;

  maxWin: number;

  symbolProbabilities: ReelSymbolProbabilities[];
}
