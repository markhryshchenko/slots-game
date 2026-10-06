import { SlotMachine } from "../game/SlotMachine.js";
import { fromCents } from "../game/money.js";
import type { SimulationResult } from "./SimulationResult.js";

export class MathSimulator {
  constructor(
    private readonly machine: SlotMachine,
  ) {}

  run(
    spins: number,
    betCents: number,
  ): SimulationResult {
    if (!Number.isInteger(spins) || spins <= 0) {
      throw new Error("Spins must be a positive integer");
    }

    if (!Number.isInteger(betCents) || betCents <= 0) {
      throw new Error("Bet must be a positive integer amount of cents");
    }

    let totalBetCents = 0;
    let totalWinCents = 0;
    let winningSpins = 0;
    let maxWinCents = 0;

    for (let i = 0; i < spins; i++) {
      const result = this.machine.spin(betCents);

      totalBetCents += betCents;
      totalWinCents += result.totalWin;

      if (result.totalWin > 0) {
        winningSpins++;
      }

      if (result.totalWin > maxWinCents) {
        maxWinCents = result.totalWin;
      }
    }

    return {
      spins,
      totalBet: fromCents(totalBetCents),
      totalWin: fromCents(totalWinCents),

      rtp: totalWinCents / totalBetCents,

      hitRate: winningSpins / spins,

      averageWin:
        winningSpins === 0
          ? 0
          : fromCents(totalWinCents / winningSpins),

      maxWin: fromCents(maxWinCents),
    };
  }
}