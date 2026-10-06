import type { GameConfig } from "../../games/GameConfig.js";
import { SlotMachine } from "../../engines/slot/SlotMachine.js";
import { MathRNG } from "../../core/MathRNG.js";
import { sevenSlice } from "../../games/sevenslice/config.js";
import { validateGameConfig } from "../../games/validateGameConfig.js";

export class GameService {
  private readonly machine: SlotMachine;
  private balanceCents = 100_000; // demo starting balance: $1,000.00

  constructor(private readonly game: GameConfig) {
    validateGameConfig(game);
    this.machine = new SlotMachine(game.mathProfile, new MathRNG());
  }

  spin(betCents: number) {
    if (!this.game.betLevels.includes(betCents)) {
      throw new Error("Bet is not one of the allowed bet levels");
    }

    if (betCents > this.balanceCents) {
      throw new Error("Insufficient balance");
    }

    const result = this.machine.spin(betCents);

    this.balanceCents = this.balanceCents - betCents + result.totalWin;

    return {
      currency: this.game.currency,
      bet: betCents,
      totalWin: result.totalWin,
      balance: this.balanceCents,
      stops: result.stops,
      grid: result.grid,
      wins: result.wins,
    };
  }

  getBalance() {
    return {
      balance: this.balanceCents,
      currency: this.game.currency,
    };
  }
}

export const gameService = new GameService(sevenSlice);
