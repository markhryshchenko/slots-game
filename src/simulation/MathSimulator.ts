import { SlotMachine } from "../game/SlotMachine.js";
import type { SimulationResult } from "./SimulationResult.js";

export class MathSimulator {
  constructor(
    private readonly machine: SlotMachine,
  ) {}

  run(
    spins: number,
    betPerSpin: number,
  ): SimulationResult {
    if (!Number.isInteger(spins) || spins <= 0) {
      throw new Error("Spins must be a positive integer");
    }

    if (!Number.isFinite(betPerSpin) || betPerSpin <= 0) {
      throw new Error("Bet must be greater than zero");
    }

    let totalBet = 0;
    let totalWin = 0;
    let winningSpins = 0;
    let maxWin = 0;

    for (let i = 0; i < spins; i++) {
      const result = this.machine.spin(betPerSpin);

      totalBet += betPerSpin;
      totalWin += result.totalWin;

      if (result.totalWin > 0) {
        winningSpins++;
      }

      if (result.totalWin > maxWin) {
        maxWin = result.totalWin;
      }
    }

    return {
      spins,
      totalBet,
      totalWin,

      rtp: totalWin / totalBet,

      hitRate: winningSpins / spins,

      averageWin:
        winningSpins === 0
          ? 0
          : totalWin / winningSpins,

      maxWin,
    };
  }
}