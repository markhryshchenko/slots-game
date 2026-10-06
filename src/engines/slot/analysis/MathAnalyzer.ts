import type { MathConfig } from "../MathConfig.js";
import type { MathReport } from "../../../models/MathReport.js";

import { MathRNG } from "../../../core/MathRNG.js";
import { Reel } from "../Reel.js";
import { WinEvaluator } from "../WinEvaluator.js";
import { createBet } from "../createBet.js";
import { createGrid } from "../createGrid.js";
import { fromCents } from "../../../core/money.js";
import { ReelAnalyzer } from "./ReelAnalyzer.js";
import { generateStopCombinations } from "./generateStopCombinations.js";

export class MathAnalyzer {
  private readonly reels: Reel[];
  private readonly winEvaluator: WinEvaluator;
  private readonly reelAnalyzer = new ReelAnalyzer();

  constructor(private readonly config: MathConfig) {
    // spin() is never called here — the analyzer supplies stop
    // positions itself, so the RNG passed to Reel is dead weight,
    // required only by the constructor's type.
    const rng = new MathRNG();

    this.reels = config.reels.map(
      (reelConfig) => new Reel(reelConfig.strip, rng),
    );

    this.winEvaluator = new WinEvaluator(
      config.paylines,
      config.paytable,
    );
  }

  analyze(): MathReport {
    const reelSizes = this.reels.map((reel) => reel.size);
    const combinations = generateStopCombinations(reelSizes);
    const totalOutcomes = combinations.length;

    // $1 bet (100 cents), so expected win in dollars equals RTP.
    const bet = createBet(100, this.config.paylines.length);

    // Accumulated in cents (integers) for the whole loop; converted to
    // dollars only once at the end, so summing 1000+ outcomes never
    // drifts the way summing floats would.
    let totalWinCents = 0;
    let totalWinSquaredCents = 0;
    let winningOutcomes = 0;
    let maxWinCents = 0;

    for (const stops of combinations) {
      const grid = createGrid(this.reels, stops);
      const wins = this.winEvaluator.evaluate(grid, bet);

      const spinWinCents = wins.reduce((sum, win) => sum + win.amount, 0);

      totalWinCents += spinWinCents;
      totalWinSquaredCents += spinWinCents * spinWinCents;

      if (spinWinCents > 0) {
        winningOutcomes++;
      }

      if (spinWinCents > maxWinCents) {
        maxWinCents = spinWinCents;
      }
    }

    const expectedWinCents = totalWinCents / totalOutcomes;
    const expectedWinSquaredCents = totalWinSquaredCents / totalOutcomes;

    // Variance/stddev are computed in cents^2 first, then scaled back
    // to dollars (divide by 100^2, resp. 100) at the very end.
    const varianceCentsSquared =
      expectedWinSquaredCents - expectedWinCents * expectedWinCents;

    const expectedWin = fromCents(expectedWinCents);

    return {
      profileId: this.config.id,
      totalOutcomes,

      theoreticalRtp: expectedWin,
      expectedWin,

      hitRate: winningOutcomes / totalOutcomes,
      winningOutcomes,

      averageWinOnHit:
        winningOutcomes === 0
          ? 0
          : fromCents(totalWinCents / winningOutcomes),

      variance: varianceCentsSquared / 10_000,
      standardDeviation: Math.sqrt(varianceCentsSquared) / 100,
      volatilityIndex: Math.sqrt(varianceCentsSquared) / 100 / expectedWin,

      maxWin: fromCents(maxWinCents),

      symbolProbabilities: this.config.reels.map((reelConfig) => ({
        reelId: reelConfig.id,
        probabilities: this.reelAnalyzer.analyze(reelConfig.strip),
      })),
    };
  }
}
